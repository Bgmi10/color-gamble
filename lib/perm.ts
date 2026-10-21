// Role -> permissions. Admin: everything. Moderator: user management (suspend) + game settings + stats. User: play only.
const P: Record<string, string[]> = {
  ADMIN: ["stats", "users.read", "users.suspend", "users.role", "users.delete", "coins.adjust", "settings", "audit"],
  MODERATOR: ["stats", "users.read", "users.suspend", "settings"],
  USER: [],
};
export const can = (role: string, perm: string) => (P[role] || []).includes(perm);
export const isStaff = (role: string) => role === "ADMIN" || role === "MODERATOR";
