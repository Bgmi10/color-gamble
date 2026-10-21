import { z } from "zod";
import { prisma } from "@/lib/db";
import { route, json, fail } from "@/lib/auth";
import { can } from "@/lib/perm";
import { audit } from "@/lib/audit";
export const dynamic = "force-dynamic";

export const GET = route({ perm: "users.read" }, async (req) => {
  const q = new URL(req.url).searchParams.get("q") || "";
  return json(await prisma.user.findMany({
    where: q ? { OR: [{ phone: { contains: q } }, { name: { contains: q, mode: "insensitive" } }] } : {},
    select: { id: true, phone: true, name: true, role: true, active: true, coins: true, createdAt: true },
    orderBy: { createdAt: "desc" }, take: 100,
  }));
});

const Patch = z.object({ id: z.string(), active: z.boolean().optional(), role: z.enum(["USER", "MODERATOR", "ADMIN"]).optional() });
export const PATCH = route({ perm: "users.read" }, async (req, _c, me) => {
  const d = Patch.parse(await req.json());
  const t = await prisma.user.findUnique({ where: { id: d.id } });
  if (!t) return fail("User not found", 404);
  if (t.id === me.id) return fail("You can't change your own account here", 400);
  if (me.role === "MODERATOR" && t.role !== "USER") return fail("Moderators can only manage regular users", 403);
  const data: any = {};
  if (d.active !== undefined) { if (!can(me.role, "users.suspend")) return fail("Not allowed", 403); data.active = d.active; }
  if (d.role !== undefined) { if (!can(me.role, "users.role")) return fail("Only admins can change roles", 403); data.role = d.role; }
  await prisma.user.update({ where: { id: t.id }, data });
  await audit(me, d.role !== undefined ? "user.role" : d.active ? "user.activate" : "user.suspend", t.phone, data);
  return json({ ok: true });
});

// Coin grant / deduction (admin only). Play-money only: coins have no cash value and cannot be withdrawn.
const Adjust = z.object({ userId: z.string(), amount: z.number().int().refine((n) => n !== 0, "Amount cannot be 0"), note: z.string().trim().min(3).max(120) });
export const POST = route({ perm: "coins.adjust" }, async (req, _c, me) => {
  const d = Adjust.parse(await req.json());
  return prisma.$transaction(async (tx) => {
    const t = await tx.user.findUnique({ where: { id: d.userId } });
    if (!t) return fail("User not found", 404);
    if (t.coins + d.amount < 0) return fail("Balance can't go below 0");
    const u = await tx.user.update({ where: { id: t.id }, data: { coins: { increment: d.amount } }, select: { coins: true } });
    await tx.coinTx.create({ data: { userId: t.id, amount: d.amount, type: "ADMIN_ADJUST", note: d.note, balanceAfter: u.coins, actorId: me.id } });
    await tx.auditLog.create({ data: { actorId: me.id, actorName: me.name || me.phone, action: "coins.adjust", target: t.phone, meta: { amount: d.amount, note: d.note } } });
    return json({ balance: u.coins });
  });
});

export const DELETE = route({ perm: "users.delete" }, async (req, _c, me) => {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || id === me.id) return fail("Invalid user");
  const t = await prisma.user.findUnique({ where: { id } });
  if (!t) return fail("User not found", 404);
  await prisma.user.delete({ where: { id } });
  await audit(me, "user.delete", t.phone);
  return json({ ok: true });
});
