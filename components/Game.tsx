"use client";
import { useEffect, useRef, useState } from "react";

const BG: Record<string, string> = { GREEN: "bg-green-500", RED: "bg-red-500", VIOLET: "bg-violet-500" };
const numColor = (n: number) => (n === 0 ? "bg-gradient-to-br from-red-500 to-violet-500" : n === 5 ? "bg-gradient-to-br from-green-500 to-violet-500" : n % 2 ? "bg-green-500" : "bg-red-500");

export default function Game() {
  const [st, setSt] = useState<any>(null);
  const [now, setNow] = useState(Date.now());
  const off = useRef(0);
  const [color, setColor] = useState("");
  const [amount, setAmount] = useState(10);
  const [msg, setMsg] = useState<{ ok: boolean; t: string } | null>(null);
  const [busy, setBusy] = useState(false);

  async function load() {
    const r = await fetch("/api/game/state", { cache: "no-store" });
    if (r.status === 401) { location.href = "/login"; return; }
    const d = await r.json(); off.current = d.serverTime - Date.now(); setSt(d);
  }
  useEffect(() => {
    load();
    const a = setInterval(load, 2000), b = setInterval(() => setNow(Date.now() + off.current), 250);
    return () => { clearInterval(a); clearInterval(b); };
  }, []);

  if (!st) return <p className="text-slate-500">Loading…</p>;
  const left = Math.max(0, Math.ceil((new Date(st.round.endsAt).getTime() - now) / 1000));
  const locked = left <= st.settings.lockSeconds;
  const myNow = st.mine.filter((b: any) => b.roundId === st.round.id);

  async function bet() {
    if (!color) return setMsg({ ok: false, t: "Pick a color first" });
    setBusy(true); setMsg(null);
    const res = await fetch("/api/game/bet", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ roundId: st.round.id, color, amount: Number(amount) }) });
    const d = await res.json(); setBusy(false);
    setMsg(res.ok ? { ok: true, t: `Bet placed: ${amount} on ${color.toLowerCase()}` } : { ok: false, t: d.error });
    load();
  }

  return (
    <div className="space-y-4">
      {st.settings.bannerUrl && <img src={st.settings.bannerUrl} alt="" className="h-28 w-full rounded-xl object-cover" />}
      <div className="flex items-center justify-between rounded-xl bg-white p-4">
        <div><div className="text-xs uppercase text-slate-500">Your coins</div><div className="text-2xl font-bold">{st.balance.toLocaleString()}</div></div>
        <div className="text-right"><div className="text-xs uppercase text-slate-500">Round #{st.round.id}</div>
          <div className={`text-3xl font-bold tabular-nums ${locked ? "text-red-600" : ""}`} aria-live="polite">{String(Math.floor(left / 60)).padStart(2, "0")}:{String(left % 60).padStart(2, "0")}</div></div>
      </div>

      <div className="rounded-xl bg-white p-4">
        <div className="grid grid-cols-3 gap-3">
          {["GREEN", "VIOLET", "RED"].map((c) => (
            <button key={c} disabled={locked} onClick={() => setColor(c)} className={`rounded-xl py-4 text-sm font-bold text-white disabled:opacity-40 ${BG[c]} ${color === c ? "ring-4 ring-slate-900 ring-offset-2" : ""}`}>{c[0] + c.slice(1).toLowerCase()}</button>
          ))}
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {[10, 50, 100, 500].map((v) => <button key={v} className={`btn-ghost ${amount === v ? "border-slate-900" : ""}`} onClick={() => setAmount(v)}>{v}</button>)}
          <input aria-label="Bet amount" className="input !w-28" type="number" min={st.settings.minBet} max={st.settings.maxBet} value={amount} onChange={(e) => setAmount(Number(e.target.value))} />
          <button className="btn ml-auto" disabled={busy || locked} onClick={bet}>{locked ? "Betting closed" : "Place bet"}</button>
        </div>
        <p className="mt-2 text-xs text-slate-500">Bets {st.settings.minBet} to {st.settings.maxBet} coins. Betting closes {st.settings.lockSeconds}s before the round ends.</p>
        {msg && <p role="status" className={`mt-2 text-sm ${msg.ok ? "text-emerald-700" : "text-red-600"}`}>{msg.t}</p>}
        {myNow.length > 0 && <p className="mt-2 text-sm">This round: {myNow.map((b: any) => `${b.amount} on ${b.color.toLowerCase()}`).join(", ")}</p>}
      </div>

      <div className="rounded-xl bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">Recent results</h2>
        <div className="flex flex-wrap gap-2">{st.history.map((h: any) => <span key={h.id} title={`Round #${h.id}`} className={`flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold text-white ${numColor(h.resultNumber)}`}>{h.resultNumber}</span>)}</div>
      </div>

      <div className="rounded-xl bg-white p-4">
        <h2 className="mb-2 text-sm font-semibold">My recent bets</h2>
        {st.mine.length === 0 ? <p className="text-sm text-slate-500">No bets yet.</p> : (
          <ul className="divide-y text-sm">{st.mine.map((b: any) => (
            <li key={b.id} className="flex justify-between py-1.5"><span>#{b.roundId} · {b.color.toLowerCase()} · {b.amount}</span>
              <span className={b.status === "WON" ? "text-emerald-700" : b.status === "LOST" ? "text-red-600" : "text-slate-500"}>{b.status === "WON" ? `Won ${b.payout}` : b.status === "LOST" ? "Lost" : "Pending"}</span></li>))}</ul>)}
      </div>
    </div>
  );
}
