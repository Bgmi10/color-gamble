import { z } from "zod";
import { prisma } from "@/lib/db";
import { route, json, fail } from "@/lib/auth";
import { tick } from "@/lib/game";

const S = z.object({ roundId: z.number().int(), color: z.enum(["GREEN", "VIOLET", "RED"]), amount: z.number().int().positive() });

export const POST = route({ auth: true }, async (req, _c, user) => {
  const d = S.parse(await req.json());
  const { settings: s } = await tick();
  if (d.amount < s.minBet || d.amount > s.maxBet) return fail(`Bet must be between ${s.minBet} and ${s.maxBet} coins`);
  return prisma.$transaction(async (tx) => {
    const r = await tx.round.findUnique({ where: { id: d.roundId } });
    if (!r || r.status !== "OPEN" || r.endsAt.getTime() - Date.now() <= s.lockSeconds * 1000) return fail("Betting is closed for this round", 409);
    const debit = await tx.user.updateMany({ where: { id: user.id, coins: { gte: d.amount } }, data: { coins: { decrement: d.amount } } });
    if (!debit.count) return fail("Not enough coins", 402);
    const u = await tx.user.findUnique({ where: { id: user.id }, select: { coins: true } });
    await tx.bet.create({ data: { userId: user.id, roundId: r.id, color: d.color, amount: d.amount } });
    await tx.coinTx.create({ data: { userId: user.id, amount: -d.amount, type: "BET", note: `Round #${r.id} ${d.color}`, balanceAfter: u!.coins } });
    return json({ balance: u!.coins });
  });
});
