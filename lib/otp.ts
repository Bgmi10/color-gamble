import { createHash } from "crypto";
export const hashOtp = (otp: string, phone: string) => createHash("sha256").update(`${otp}:${phone}:${process.env.AUTH_SECRET || "dev"}`).digest("hex");
export const cleanPhone = (v: string) => v.replace(/\D/g, "").slice(-10);
