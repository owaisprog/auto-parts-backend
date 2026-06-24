import dotenv from "dotenv";

dotenv.config();

export const env = {
  PORT: process.env.PORT || "5000",
  NODE_ENV: process.env.NODE_ENV || "development",
  DB_HOST: process.env.DB_HOST || "",
  DB_PORT: process.env.DB_PORT || "",
  DB_NAME: process.env.DB_NAME || "",
  DB_USER: process.env.DB_USER || "",
  DB_PASSWORD: process.env.DB_PASSWORD || "",

  ADMIN_EMAIL: process.env.ADMIN_EMAIL || "kenelson1909p@yahoo.com.sg",
  ADMIN_PASSWORD: process.env.ADMIN_PASSWORD || "",
  JWT_SECRET:
    process.env.JWT_SECRET ||
    "your-super-secret-jwt-key-change-this-in-production",
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || "7d",
  SMTP_HOST: process.env.SMTP_HOST || "",
  SMTP_PORT: parseInt(process.env.SMTP_PORT || "587"),
  SMTP_USER: process.env.SMTP_USER || "",
  SMTP_PASSWORD: process.env.SMTP_PASSWORD || "",
  FROM_EMAIL:
    process.env.FROM_EMAIL || "West Main Tire kenelson1909p@yahoo.com.sg",
  FRONTEND_URL: process.env.FRONTEND_URL || "http://localhost:5173",
} as const;

if (
  !env.DB_HOST &&
  !env.DB_USER &&
  !env.DB_NAME &&
  !env.DB_PASSWORD &&
  !env.DB_PORT
) {
  throw new Error("DATABASE_URL is required");
}

if (env.JWT_SECRET === "default-secret-change-me") {
  console.warn(
    "⚠️  WARNING: Using default JWT_SECRET. Please set a strong secret in production.",
  );
}
