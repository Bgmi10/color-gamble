import { z } from "zod";
import { prisma } from "@/lib/db";
import { route, json, fail, setSession } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { hashOtp, cleanPhone } from "@/lib/otp";

const S = z.object({ phone: z.string().transform(cleanPhone), otp: z.string().regex(/^\d{6}$/, "OTP must be 6 digits"), name: z.string().trim().max(40).optional() });

export const POST = route({}, async (req) => {
  const d = S.parse(await req.json());
  const rec = await prisma.otp.findUnique({ where: { phone: d.phone } });
  if (!rec || rec.expiresAt < new Date()) return fail("OTP expired. Request a new one.", 400);
  if (rec.attempts >= 5) return fail("Too many wrong attempts. Request a new OTP.", 429);
  if (rec.hash !== hashOtp(d.otp, d.phone)) {
    await prisma.otp.update({ where: { phone: d.phone }, data: { attempts: { increment: 1 } } });
    return fail("Wrong OTP", 400);
  }
  await prisma.otp.delete({ where: { phone: d.phone } });

  let user = await prisma.user.findUnique({ where: { phone: d.phone } });
  if (user && !user.active) return fail("This account is suspended", 403);
  if (!user) { // first successful OTP = registration
    const bonus = (await getSettings()).signupBonus;
    user = await prisma.$transaction(async (tx) => {
      const u = await tx.user.create({ data: { phone: d.phone, name: d.name || "", coins: bonus } });
      if (bonus > 0) await tx.coinTx.create({ data: { userId: u.id, amount: bonus, type: "SIGNUP_BONUS", note: "Welcome bonus", balanceAfter: bonus } });
      return u;
    });
  }
  await setSession(user.id);
  return json({ role: user.role });
});
