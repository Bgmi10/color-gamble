import { PrismaClient } from "@prisma/client";
const p = new PrismaClient();
async function main() {
  const admin = process.env.SEED_ADMIN_PHONE || "9999999999";
  const mod = process.env.SEED_MOD_PHONE || "8888888888";
  await p.user.upsert({ where: { phone: admin }, update: { role: "ADMIN" }, create: { phone: admin, name: "Admin", role: "ADMIN", coins: 0 } });
  await p.user.upsert({ where: { phone: mod }, update: { role: "MODERATOR" }, create: { phone: mod, name: "Moderator", role: "MODERATOR", coins: 0 } });
  console.log("Seeded admin", admin, "and moderator", mod, "(log in with OTP on these numbers)");
}
main().finally(() => p.$disconnect());
