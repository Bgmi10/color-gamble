"use client";
import { useEffect, useState } from "react";
import BarChart from "./BarChart";
import { can } from "@/lib/perm";

const api = async (url: string, method = "GET", body?: any) => {
  const res = await fetch(url, { method, headers: body ? { "Content-Type": "application/json" } : undefined, body: body ? JSON.stringify(body) : undefined, cache: "no-store" });
  const d = await res.json().catch(() => ({}));
  return { ok: res.ok, d };
};

function Dashboard() {
  const [s, setS] = useState<any>(null);
  useEffect(() => { const l = async () => { const r = await api("/api/admin/stats"); if (r.ok) setS(r.d); }; l(); const t = setInterval(l, 5000); return () => clearInterval(t); }, []);
  if (!s) return <p className="text-slate-500">Loading…</p>;
  const cards = [["Players", s.users], ["Active players (24h)", s.activePlayers24h], ["Rounds (24h)", s.roundsSettled24h], ["Bets (24h)", s.bets24h], ["Coins wagered (24h)", s.coinsWagered24h], ["Coins paid out (24h)", s.coinsPaidOut24h]];
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">{cards.map(([k, v]) => <div key={k as string} className="rounded-xl border bg-white p-3"><div className="text-xs text-slate-500">{k}</div><div className="text-xl font-bold">{(v as number).toLocaleString()}</div></div>)}</div>
      <div className="grid gap-3 sm:grid-cols-2">
        <BarChart title="Coins wagered, last 12 rounds" data={s.volumeByRound} />
        <BarChart title="Results, last 30 rounds" data={[{ label: "Green", value: s.colorDistribution.GREEN, color: "#22c55e" }, { label: "Violet", value: s.colorDistribution.VIOLET, color: "#8b5cf6" }, { label: "Red", value: s.colorDistribution.RED, color: "#ef4444" }]} />
      </div>
      <p className="text-xs text-slate-500">Refreshes every 5 seconds.</p>
    </div>
  );
}

function Users({ role, meId }: { role: string; meId: string }) {
  const [rows, setRows] = useState<any[]>([]); const [q, setQ] = useState(""); const [err, setErr] = useState("");
  const load = async () => { const r = await api(`/api/admin/users?q=${encodeURIComponent(q)}`); if (r.ok) setRows(r.d); };
  useEffect(() => { load(); }, [q]);
  const act = async (fn: Promise<any>) => { const r = await fn; if (!r.ok) setErr(r.d.error); else setErr(""); load(); };
  return (
    <div>
      <input className="input mb-3 max-w-sm" placeholder="Search phone or name" value={q} onChange={(e) => setQ(e.target.value)} />
      {err && <p role="alert" className="mb-2 text-sm text-red-600">{err}</p>}
      <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm">
        <thead className="bg-slate-50"><tr>{["Phone", "Name", "Role", "Coins", "Status", ""].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
        <tbody>{rows.length === 0 && <tr><td colSpan={6} className="px-3 py-4 text-slate-500">No users found.</td></tr>}
          {rows.map((u) => {
            const locked = u.id === meId || (role === "MODERATOR" && u.role !== "USER");
            return (<tr key={u.id} className="border-t"><td className="px-3 py-2">{u.phone}</td><td className="px-3 py-2">{u.name || "—"}</td>
              <td className="px-3 py-2">{can(role, "users.role") && u.id !== meId ? <select className="input !w-auto !py-1" value={u.role} onChange={(e) => act(api("/api/admin/users", "PATCH", { id: u.id, role: e.target.value }))}><option>USER</option><option>MODERATOR</option><option>ADMIN</option></select> : u.role}</td>
              <td className="px-3 py-2">{u.coins.toLocaleString()}</td><td className="px-3 py-2">{u.active ? "Active" : "Suspended"}</td>
              <td className="space-x-2 whitespace-nowrap px-3 py-2 text-right">
                {can(role, "coins.adjust") && <button className="btn-ghost" onClick={() => { const a = prompt("Coins to add (use a minus sign to deduct):"); if (!a) return; const n = parseInt(a, 10); const note = prompt("Reason (shown in audit log and the player's history):") || ""; act(api("/api/admin/users", "POST", { userId: u.id, amount: n, note })); }}>Coins</button>}
                {can(role, "users.suspend") && !locked && <button className="btn-ghost" onClick={() => act(api("/api/admin/users", "PATCH", { id: u.id, active: !u.active }))}>{u.active ? "Suspend" : "Activate"}</button>}
                {can(role, "users.delete") && u.id !== meId && <button className="btn-ghost text-red-600" onClick={() => confirm(`Delete ${u.phone}? This removes their bets and history.`) && act(api(`/api/admin/users?id=${u.id}`, "DELETE"))}>Delete</button>}
              </td></tr>);
          })}</tbody>
      </table></div>
    </div>
  );
}

const FIELDS: [string, string][] = [["roundSeconds", "Round length (s)"], ["lockSeconds", "Betting closes before end (s)"], ["minBet", "Min bet"], ["maxBet", "Max bet"], ["signupBonus", "Signup bonus (coins)"], ["payoutColor", "Green/Red payout (x)"], ["payoutColorHalf", "Green/Red payout on 0 or 5 (x)"], ["payoutViolet", "Violet payout (x)"]];
function Settings() {
  const [s, setS] = useState<any>(null); const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  useEffect(() => { api("/api/admin/settings").then((r) => r.ok && setS(r.d)); }, []);
  if (!s) return <p className="text-slate-500">Loading…</p>;
  async function save() {
    const body: any = { ...s }; for (const [k] of FIELDS) body[k] = Number(body[k]);
    const r = await api("/api/admin/settings", "PUT", body); setMsg(r.ok ? { ok: true, t: "Saved. Applies from the next round." } : { ok: false, t: r.d.error });
  }
  async function upload(f: File) {
    const r = await api("/api/admin/upload", "POST", { filename: f.name, contentType: f.type });
    if (!r.ok) return setMsg({ ok: false, t: r.d.error });
    await fetch(r.d.uploadUrl, { method: "PUT", headers: { "Content-Type": f.type }, body: f });
    setS({ ...s, bannerUrl: r.d.publicUrl });
  }
  return (
    <div className="max-w-xl rounded-xl border bg-white p-4">
      <p className="mb-3 text-sm text-slate-500">Results are generated by a provably-fair seed and cannot be set from here. Settings control timing, limits and payout multipliers only.</p>
      <div className="grid gap-3 sm:grid-cols-2">
        {FIELDS.map(([k, l]) => <div key={k}><label className="label">{l}</label><input className="input" type="number" step="any" value={s[k]} onChange={(e) => setS({ ...s, [k]: e.target.value })} /></div>)}
        <div className="sm:col-span-2"><label className="label">Home banner (S3)</label><input type="file" accept="image/*" onChange={(e) => e.target.files?.[0] && upload(e.target.files[0])} />{s.bannerUrl && <img src={s.bannerUrl} alt="" className="mt-2 h-20 rounded" />}</div>
      </div>
      {msg && <p role="status" className={`mt-3 text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.t}</p>}
      <button className="btn mt-3" onClick={save}>Save settings</button>
    </div>
  );
}

function Audit() {
  const [rows, setRows] = useState<any[]>([]);
  useEffect(() => { api("/api/admin/audit").then((r) => r.ok && setRows(r.d)); }, []);
  return (
    <div className="overflow-x-auto rounded-xl border bg-white"><table className="w-full text-left text-sm">
      <thead className="bg-slate-50"><tr>{["When", "Who", "Action", "Target", "Details"].map((h) => <th key={h} className="px-3 py-2">{h}</th>)}</tr></thead>
      <tbody>{rows.length === 0 && <tr><td colSpan={5} className="px-3 py-4 text-slate-500">No activity yet.</td></tr>}
        {rows.map((a) => <tr key={a.id} className="border-t"><td className="whitespace-nowrap px-3 py-2">{a.createdAt.slice(0, 16).replace("T", " ")}</td><td className="px-3 py-2">{a.actorName}</td><td className="px-3 py-2">{a.action}</td><td className="px-3 py-2">{a.target}</td><td className="max-w-xs break-words px-3 py-2 text-xs">{a.meta ? JSON.stringify(a.meta) : ""}</td></tr>)}</tbody>
    </table></div>
  );
}

export default function AdminPanel({ role, meId }: { role: string; meId: string }) {
  const tabs = [["dashboard", "Dashboard", "stats"], ["users", "Users", "users.read"], ["settings", "Game settings", "settings"], ["audit", "Audit log", "audit"]].filter((t) => can(role, t[2]));
  const [tab, setTab] = useState("dashboard");
  return (
    <div>
      <h1 className="mb-1 text-xl font-bold">Admin</h1>
      <p className="mb-4 text-sm text-slate-500">Signed in as {role.toLowerCase()}.</p>
      <div className="mb-4 flex flex-wrap gap-2">{tabs.map(([k, l]) => <button key={k} onClick={() => setTab(k)} className={`rounded-md px-3 py-1.5 text-sm ${tab === k ? "bg-slate-900 text-white" : "border bg-white"}`}>{l}</button>)}</div>
      {tab === "dashboard" ? <Dashboard /> : tab === "users" ? <Users role={role} meId={meId} /> : tab === "settings" ? <Settings /> : <Audit />}
    </div>
  );
}
