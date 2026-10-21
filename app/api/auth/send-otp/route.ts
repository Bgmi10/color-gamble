import axios from "axios";
import { z } from "zod";
import { randomInt } from "crypto";
import { prisma } from "@/lib/db";
import { route, json, fail } from "@/lib/auth";
import { hashOtp, cleanPhone } from "@/lib/otp";
const S = z.object({ phone: z.string().transform(cleanPhone).refine((p) => /^[6-9]\d{9}$/.test(p), "Enter a valid 10-digit mobile number") });

export const POST = route({}, async (req) => {
  const { phone } = S.parse(await req.json());
  const user = await prisma.user.findUnique({ where: { phone } });
  if (user && !user.active) return fail("This account is suspended", 403);

  const prev = await prisma.otp.findUnique({ where: { phone } });
  if (prev && Date.now() - prev.sentAt.getTime() < 30000) return fail("Please wait 30 seconds before requesting another OTP", 429);

  const otp = randomInt(100000, 1000000).toString();
  console.log(otp)
  const data = { hash: hashOtp(otp, phone), expiresAt: new Date(Date.now() + 5 * 60 * 1000), attempts: 0, sentAt: new Date() };
  await prisma.otp.upsert({ where: { phone }, create: { phone, ...data }, update: data });

  const apiKey = process.env.APITXT_API_KEY;
  if (!apiKey) {
    if (process.env.NODE_ENV === "production") return fail("SMS is not configured", 500);
    console.log(`[DEV] OTP for ${phone}: ${otp}`);
    return json({ ok: true, devOtp: otp });
  }
  try {
    await axios.get("https://apitxt.com/api/sendOTP", { params: { authkey: apiKey, mobile: `91${phone}`, otp }, timeout: 8000 });
  } catch (e: any) {
    console.error("SMS OTP ERROR:", e.response?.data || e.message);
    return fail("Could not send the OTP. Try again.", 502);
  }
  return json({ ok: true });
});
