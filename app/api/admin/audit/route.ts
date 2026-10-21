import { prisma } from "@/lib/db";
import { route, json } from "@/lib/auth";
export const dynamic = "force-dynamic";
export const GET = route({ perm: "audit" }, async () => json(await prisma.auditLog.findMany({ orderBy: { createdAt: "desc" }, take: 200 })));
