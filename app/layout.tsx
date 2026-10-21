import "./globals.css";
import Link from "next/link";
import { getUser } from "@/lib/auth";
import { isStaff } from "@/lib/perm";
import LogoutButton from "@/components/LogoutButton";
export const metadata = { title: "Color Game", description: "Free-to-play color prediction game" };
export const viewport = { width: "device-width", initialScale: 1 };
export default async function Root({ children }: { children: React.ReactNode }) {
  const user = await getUser();
  return (
    <html lang="en"><body className="min-h-screen bg-slate-100 text-slate-900 antialiased">
      <header className="border-b bg-white"><nav className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3 text-sm">
        <Link href="/" className="font-bold">Color Game</Link>
        {user && <Link href="/wallet">Coin history</Link>}
        {user && isStaff(user.role) && <Link href="/admin">Admin</Link>}
        <span className="ml-auto">{user ? <LogoutButton /> : <Link href="/login">Sign in</Link>}</span>
      </nav></header>
      <main className="mx-auto max-w-3xl px-4 py-5">{children}</main>
      <footer className="mx-auto max-w-3xl px-4 pb-8 text-center text-xs text-slate-500">Play-money game. Coins have no cash value and cannot be bought, sold or withdrawn. 18+ only.</footer>
    </body></html>
  );
}
