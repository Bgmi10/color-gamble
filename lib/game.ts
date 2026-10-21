import { createHash, randomBytes } from "crypto";
import { prisma } from "./db";
import { getSettings, Settings } from "./settings";

const sha = (s: string) => createHash("sha256").update(s).digest("hex");
/** Provably fair: seedHash = sha256(seed) is shown before the round; result = from sha256(seed:result) after it. Nobody (admin included) can pick the outcome. */
export const resultFromSeed = (seed: string) => parseInt(sha(seed + ":result").slice(0, 8), 16) % 10;
export const colorsOf = (n: number): string[] => (n === 0 ? ["RED", "VIOLET"] : n === 5 ? ["GREEN", "VIOLET"] : n % 2 === 0 ? ["RED"] : ["GREEN"]);
export function multiplier(color: string, n: number, s: Settings) {
  if (!colorsOf(n).includes(color)) return 0;
  if (color === "VIOLET") return s.payoutViolet;
  return n === 0 || n === 5 ? s.payoutColorHalf : s.payoutColor;
}

async function settle(r: any, s: Settings) {
  await prisma.$transaction(async (tx) => {
    const claim = await tx.round.updateMany({ where: { id: r.id, status: "OPEN" }, data: { status: "SETTLING" } });
    if (!claim.count) return; // another request already settled it
    const n = resultFromSeed(r.seed);
    const bets = await tx.bet.findMany({ where: { roundId: r.id } });
    for (const b of bets) {
      const pay = Math.floor(b.amount * multiplier(b.color, n, s));
      await tx.bet.update({ where: { id: b.id }, data: { payout: pay, status: pay > 0 ? "WON" : "LOST" } });
      if (pay > 0) {
        const u = await tx.user.update({ where: { id: b.userId }, data: { coins: { increment: pay } }, select: { coins: true } });
        await tx.coinTx.create({ data: { userId: b.userId, amount: pay, type: "WIN", note: `Round #${r.id}`, balanceAfter: u.coins } });
      }
    }
    await tx.round.update({ where: { id: r.id }, data: { status: "SETTLED", resultNumber: n } });
  }, { timeout: 20000 });
}

/** Lazy round engine (no cron): settle finished rounds, make sure one open round exists, return it. */
export async function tick() {
  const s = await getSettings();
  const now = new Date();
  const due = await prisma.round.findMany({ where: { status: "OPEN", endsAt: { lte: now } }, orderBy: { endsAt: "asc" }, take: 20 });
  for (const r of due) await settle(r, s);

  const open = () => prisma.round.findFirst({ where: { status: "OPEN", endsAt: { gt: now } }, orderBy: { endsAt: "asc" }, select: { id: true, endsAt: true, seedHash: true } });
  let cur = await open();
  if (!cur) {
    const last = await prisma.round.findFirst({ orderBy: { endsAt: "desc" } });
    const start = last && last.endsAt.getTime() > now.getTime() - s.roundSeconds * 1000 ? last.endsAt : now;
    const seed = randomBytes(16).toString("hex");
    try {
      cur = await prisma.round.create({ data: { startsAt: start, endsAt: new Date(start.getTime() + s.roundSeconds * 1000), seed, seedHash: sha(seed) }, select: { id: true, endsAt: true, seedHash: true } });
    } catch (e: any) { if (e.code !== "P2002") throw e; cur = await open(); }
  }
  return { round: cur!, settings: s };
}
