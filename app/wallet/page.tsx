import { redirect } from "next/navigation";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/db";
export const dynamic = "force-dynamic";
export default async function Wallet() {
  const u = await getUser(); if (!u) redirect("/login");
  const rows = await prisma.coinTx.findMany({ where: { userId: u.id }, orderBy: { createdAt: "desc" }, take: 100 });
  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Coin history</h1>
      <p className="mb-4 text-sm text-slate-500">Balance: <b>{u.coins.toLocaleString()}</b> coins</p>
      <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm">
        <thead className="bg-slate-50"><tr><th className="px-3 py-2">When</th><th className="px-3 py-2">Type</th><th className="px-3 py-2">Note</th><th className="px-3 py-2 text-right">Coins</th><th className="px-3 py-2 text-right">Balance</th></tr></thead>
        <tbody>{rows.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-slate-500">Nothing yet.</td></tr>}
          {rows.map((r) => <tr key={r.id} className="border-t"><td className="px-3 py-2">{r.createdAt.toISOString().slice(0, 16).replace("T", " ")}</td><td className="px-3 py-2">{r.type.replace("_", " ").toLowerCase()}</td><td className="px-3 py-2">{r.note}</td><td className={`px-3 py-2 text-right ${r.amount < 0 ? "text-red-600" : "text-emerald-700"}`}>{r.amount > 0 ? "+" : ""}{r.amount}</td><td className="px-3 py-2 text-right">{r.balanceAfter}</td></tr>)}</tbody>
      </table></div>
    </div>
  );
}
