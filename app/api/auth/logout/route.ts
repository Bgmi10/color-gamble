import { route, json, clearSession } from "@/lib/auth";
export const POST = route({}, async () => { clearSession(); return json({ ok: true }); });
