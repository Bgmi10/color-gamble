import { prisma } from "@/lib/db";
import { route, json } from "@/lib/auth";
import { colorsOf } from "@/lib/game";
export const dynamic = "force-dynamic";

export const GET = route({ perm: "stats" }, async () => {
  const since = new Date(Date.now() - 24 * 3600 * 1000);
  const [users, active24, agg, roundsDone, last30, last12] = await Promise.all([
    prisma.user.count(),
    prisma.bet.groupBy({ by: ["userId"], where: { createdAt: { gte: since } } }).then((x) => x.length),
    prisma.bet.aggregate({ where: { createdAt: { gte: since } }, _sum: { amount: true, payout: true }, _count: true }),
    prisma.round.count({ where: { status: "SETTLED", endsAt: { gte: since } } }),
    prisma.round.findMany({ where: { status: "SETTLED" }, orderBy: { id: "desc" }, take: 30, select: { resultNumber: true } }),
    prisma.round.findMany({ where: { status: "SETTLED" }, orderBy: { id: "desc" }, take: 12, select: { id: true } }),
  ]);
  const vol = await prisma.bet.groupBy({ by: ["roundId"], where: { roundId: { in: last12.map((r) => r.id) } }, _sum: { amount: true } });
  const dist = { GREEN: 0, RED: 0, VIOLET: 0 } as Record<string, number>;
  for (const r of last30) { const c = colorsOf(r.resultNumber!); dist[c.includes("VIOLET") ? "VIOLET" : c[0]]++; }
  const byRound = new Map(vol.map((v) => [v.roundId, v._sum.amount || 0]));
  return json({
    users, activePlayers24h: active24, roundsSettled24h: roundsDone, bets24h: agg._count,
    coinsWagered24h: agg._sum.amount || 0, coinsPaidOut24h: agg._sum.payout || 0,
    colorDistribution: dist, volumeByRound: last12.reverse().map((r) => ({ label: `#${r.id}`, value: byRound.get(r.id) || 0 })),
  });
});
