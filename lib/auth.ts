import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { prisma } from "./db";
import { can } from "./perm";

const key = () => new TextEncoder().encode(process.env.AUTH_SECRET || "dev-secret-change-me");

export async function setSession(userId: string) {
  const t = await new SignJWT({}).setSubject(userId).setProtectedHeader({ alg: "HS256" }).setExpirationTime("7d").sign(key());
  cookies().set("sid", t, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 60 * 60 * 24 * 7 });
}
export const clearSession = () => cookies().delete("sid");

export async function getUser() {
  const t = cookies().get("sid")?.value;
  if (!t) return null;
  try {
    const { payload } = await jwtVerify(t, key());
    const u = await prisma.user.findUnique({ where: { id: payload.sub as string } });
    return u && u.active ? u : null;
  } catch { return null; }
}

export const json = (data: any, status = 200) => Response.json(data, { status });
export const fail = (message: string, status = 400) => Response.json({ error: message }, { status });

/** Route wrapper: auth + optional permission check + uniform error handling. */
export function route(opts: { auth?: boolean; perm?: string }, fn: (req: Request, ctx: any, user: any) => Promise<Response>) {
  return async (req: Request, ctx: any) => {
    try {
      const user = await getUser();
      if ((opts.auth || opts.perm) && !user) return fail("Please sign in", 401);
      if (opts.perm && !can(user!.role, opts.perm)) return fail("You do not have permission for this", 403);
      return await fn(req, ctx, user);
    } catch (e: any) {
      if (e?.issues) return fail(e.issues.map((i: any) => `${i.path.join(".")}: ${i.message}`).join("; "));
      if (e?.code === "P2002") return fail("Already exists", 409);
      console.error(e);
      return fail("Something went wrong", 500);
    }
  };
}
