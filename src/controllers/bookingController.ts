import { Request, Response } from "express";
import prisma from "../config/database";
import { sendResponse, sendError } from "../utils/response";
import {
  sendEmail,
  getBookingConfirmationTemplate,
  getBookingCancellationTemplate,
} from "../utils/email";

import { parseDateString } from "../utils/date";
import { AppointmentStatus } from "../../generated/prisma/enums";

export const getAllBookings = async (req: Request, res: Response) => {
  const page = parseInt(req.query.page as string) || 1;
  const limit = parseInt(req.query.limit as string) || 10;
  const status = req.query.status as string;
  const skip = (page - 1) * limit;

  const where: any = {};
  if (
    status &&
    ["Pending", "Confirmed", "Cancelled", "Completed"].includes(status)
  ) {
    where.status = status;
  }

  const [bookings, total] = await Promise.all([
    prisma.appointment.findMany({
      where,
      skip,
      take: limit,
      orderBy: { createdAt: "desc" },
      include: {
        customer: true,
        appointmentServices: {
          include: { service: true },
        },
      },
    }),
    prisma.appointment.count({ where }),
  ]);

  return sendResponse(res, 200, "Bookings fetched", bookings, {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  });
};

export const getBookingById = async (req: Request, res: Response) => {
  const { id } = req.params;

  if (!id || typeof id !== "string") {
    return sendError(res, 400, "Invalid ID format provided");
  }

  const booking = await prisma.appointment.findUnique({
    where: { id },
    include: {
      customer: true,
      appointmentServices: {
        include: { service: true },
      },
    },
  });

  if (!booking) {
    return sendError(res, 404, "Booking not found");
  }

  return sendResponse(res, 200, "Booking fetched", booking);
};

export const createBooking = async (req: Request, res: Response) => {
  const { customer, appointmentDate, startTime, serviceIds, notes } = req.body;

  // Fetch services
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds }, isActive: true },
  });

  if (services.length !== serviceIds.length) {
    return sendError(
      res,
      400,
      "One or more selected services are invalid or inactive",
    );
  }

  // Calculate totals
  const totalDuration = services.reduce((sum, s) => sum + s.duration, 0);
  const totalPrice = services.reduce((sum, s) => sum + Number(s.price || 0), 0);

  // Calculate end time
  const [startHour, startMin] = startTime.split(":").map(Number);
  const startMinutes = startHour * 60 + startMin;
  const endMinutes = startMinutes + totalDuration;
  const endHour = Math.floor(endMinutes / 60);
  const endMin = endMinutes % 60;
  const endTime = `${String(endHour).padStart(2, "0")}:${String(endMin).padStart(2, "0")}`;

  // Create customer and booking in transaction
  const result = await prisma.$transaction(async (tx) => {
    const newCustomer = await tx.customer.create({
      data: customer,
    });

    // FIX: Type the appointmentServices data properly
    const appointmentServicesData = services.map((s) => ({
      serviceId: s.id,
      serviceName: s.name,
      duration: s.duration,
      price: s.price || 0,
    }));

    const appointment = await tx.appointment.create({
      data: {
        customerId: newCustomer.id,
        appointmentDate: parseDateString(appointmentDate),
        startTime,
        endTime,
        totalDuration,
        totalPrice,
        status: AppointmentStatus.Confirmed,
        notes,
        appointmentServices: {
          create: appointmentServicesData as any, // Type assertion to fix the error
        },
      },
      include: {
        customer: true,
        appointmentServices: true,
      },
    });

    return appointment;
  });

  // Send confirmation email
  await sendEmail({
    // to: `${customer.email}, kenelson1909p@yahoo.com.sg`,
    to: `${customer.email}`,
    subject: "Booking Confirmation - West Main Tire & Lube",
    html: getBookingConfirmationTemplate(
      customer.name,
      result.id,
      appointmentDate,
      startTime,
      services.map((s) => s.name),
      totalDuration,
      totalPrice.toFixed(2),
    ),
  });

  return sendResponse(res, 201, "Booking created", result);
};

export const cancelBooking = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { cancelReason } = req.body;

  if (!id || typeof id !== "string") {
    return sendError(res, 400, "Invalid ID format provided");
  }

  const booking = await prisma.appointment.findUnique({
    where: { id },
    include: { customer: true },
  });

  if (!booking) {
    return sendError(res, 404, "Booking not found");
  }

  if (booking.status === AppointmentStatus.Cancelled) {
    return sendError(res, 400, "Booking is already cancelled");
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: {
      status: AppointmentStatus.Cancelled,
      cancelReason,
    },
    include: { customer: true },
  });

  // Send cancellation email
  await sendEmail({
    to: booking.customer.email,
    subject: "Booking Cancelled - West Main Tire & Lube",
    html: getBookingCancellationTemplate(
      booking.customer.name,
      booking.customer.name,
      cancelReason,
    ),
  });

  return sendResponse(res, 200, "Booking cancelled", updated);
};

export const updateBookingStatus = async (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body;

  if (!id || typeof id !== "string") {
    return sendError(res, 400, "Invalid ID format provided");
  }

  const booking = await prisma.appointment.findUnique({
    where: { id },
  });

  if (!booking) {
    return sendError(res, 404, "Booking not found");
  }

  const updated = await prisma.appointment.update({
    where: { id },
    data: { status: status as AppointmentStatus },
    include: {
      customer: true,
      appointmentServices: true,
    },
  });

  return sendResponse(res, 200, "Booking status updated", updated);
};
