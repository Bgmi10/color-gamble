import { prisma } from "./db";
export const DEFAULTS = { roundSeconds: 60, lockSeconds: 5, minBet: 10, maxBet: 5000, signupBonus: 1000, payoutColor: 2, payoutColorHalf: 1.5, payoutViolet: 4.5, bannerUrl: "" };
export type Settings = typeof DEFAULTS;
export async function getSettings(): Promise<Settings> {
  const rows = await prisma.setting.findMany();
  const out: any = { ...DEFAULTS };
  for (const r of rows) if (r.key in DEFAULTS) { try { out[r.key] = JSON.parse(r.value); } catch {} }
  return out;
}
