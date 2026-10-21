import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { isStaff } from "@/lib/perm";
import AdminPanel from "@/components/AdminPanel";
export default async function Admin() {
  const u = await getUser();
  if (!u || !isStaff(u.role)) redirect("/");
  return <AdminPanel role={u.role} meId={u.id} />;
}
