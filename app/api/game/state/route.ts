import { prisma } from "@/lib/db";
import { route, json } from "@/lib/auth";
import { tick } from "@/lib/game";
export const dynamic = "force-dynamic";

export const GET = route({ auth: true }, async (_r, _c, user) => {
  const { round, settings } = await tick();
  const [me, history, mine] = await Promise.all([
    prisma.user.findUnique({ where: { id: user.id }, select: { coins: true } }),
    prisma.round.findMany({ where: { status: "SETTLED" }, orderBy: { id: "desc" }, take: 15, select: { id: true, resultNumber: true, seed: true, seedHash: true } }),
    prisma.bet.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" }, take: 12, include: { round: { select: { resultNumber: true, status: true } } } }),
  ]);
  const { bannerUrl, minBet, maxBet, lockSeconds } = settings;
  return json({ serverTime: Date.now(), balance: me?.coins ?? 0, round, history, mine, settings: { bannerUrl, minBet, maxBet, lockSeconds } });
});
