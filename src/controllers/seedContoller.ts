import { Request, Response } from "express";
import bcryptjs from "bcryptjs";
import { env } from "../config/env";

import prisma from "../config/database";
import { Day, ShopStatus } from "../../generated/prisma/enums";

export const seedDatabase = async (req: Request, res: Response) => {
  try {
    console.log("🌱 Starting database seed via API...");

    // 1. Create Admin
    const adminPassword = await bcryptjs.hash(env.ADMIN_PASSWORD, 12);
    const admin = await prisma.admin.upsert({
      where: { email: env.ADMIN_EMAIL },
      update: {},
      create: {
        name: "System Administrator",
        email: env.ADMIN_EMAIL,
        password: adminPassword,
      },
    });
    console.log("✅ Admin created:", admin.email);

    // 2. Create Default Schedule
    const defaultSchedule = [
      { day: Day.Monday, isOpen: true, startTime: "07:00", endTime: "17:00" },
      { day: Day.Tuesday, isOpen: true, startTime: "07:00", endTime: "17:00" },
      {
        day: Day.Wednesday,
        isOpen: true,
        startTime: "07:00",
        endTime: "17:00",
      },
      { day: Day.Thursday, isOpen: true, startTime: "07:00", endTime: "17:00" },
      { day: Day.Friday, isOpen: true, startTime: "07:00", endTime: "17:00" },
      {
        day: Day.Saturday,
        isOpen: false,
        startTime: "00:00",
        endTime: "00:00",
      },
      { day: Day.Sunday, isOpen: false, startTime: "00:00", endTime: "00:00" },
    ];

    for (const schedule of defaultSchedule) {
      await prisma.scheduleSetting.upsert({
        where: { day: schedule.day },
        update: {},
        create: schedule,
      });
    }
    console.log("✅ Default schedule created");

    // 3. Create Shop Settings
    await prisma.shopSetting.upsert({
      where: { id: "1" },
      update: {},
      create: {
        shopStatus: ShopStatus.Open,
        maintenanceMessage: "We are currently not accepting appointments.",
        timeZone: "America/New_York",
        slotInterval: 30,
      },
    });
    console.log("✅ Default shop settings created");

    console.log("🎉 Seed completed successfully!");

    res.status(200).json({
      success: true,
      message: "Database seeded successfully",
      data: {
        admin: admin.email,
        password: env.ADMIN_PASSWORD,
      },
    });
  } catch (error) {
    console.error("❌ Seed failed:", error);
    res.status(500).json({
      success: false,
      message: "Seed failed",
      error: error,
    });
  }
};
