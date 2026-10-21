import { z } from "zod";
import { prisma } from "@/lib/db";
import { route, json } from "@/lib/auth";
import { getSettings } from "@/lib/settings";
import { audit } from "@/lib/audit";
export const dynamic = "force-dynamic";

export const GET = route({ perm: "settings" }, async () => json(await getSettings()));

const S = z.object({
  roundSeconds: z.number().int().min(15).max(600), lockSeconds: z.number().int().min(1).max(30),
  minBet: z.number().int().min(1), maxBet: z.number().int().min(1), signupBonus: z.number().int().min(0),
  payoutColor: z.number().min(1).max(20), payoutColorHalf: z.number().min(1).max(20), payoutViolet: z.number().min(1).max(50),
  bannerUrl: z.string().url().or(z.literal("")),
}).refine((s) => s.maxBet >= s.minBet, "Max bet must be at least min bet").refine((s) => s.lockSeconds < s.roundSeconds, "Lock time must be shorter than the round");

export const PUT = route({ perm: "settings" }, async (req, _c, me) => {
  const d = S.parse(await req.json());
  const before = await getSettings();
  for (const [key, v] of Object.entries(d)) await prisma.setting.upsert({ where: { key }, create: { key, value: JSON.stringify(v) }, update: { value: JSON.stringify(v) } });
  const changed = Object.fromEntries(Object.entries(d).filter(([k, v]) => (before as any)[k] !== v).map(([k, v]) => [k, { from: (before as any)[k], to: v }]));
  await audit(me, "settings.update", "", changed);
  return json(d);
});
