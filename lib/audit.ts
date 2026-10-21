import { prisma } from "./db";
export const audit = (actor: { id: string; name: string; phone: string }, action: string, target = "", meta?: any) =>
  prisma.auditLog.create({ data: { actorId: actor.id, actorName: actor.name || actor.phone, action, target, meta } });
