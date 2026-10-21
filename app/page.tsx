import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import Game from "@/components/Game";
export default async function Home() {
  if (!(await getUser())) redirect("/login");
  return <Game />;
}
