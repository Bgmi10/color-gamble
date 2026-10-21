"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

export default function Login() {
  const r = useRouter();
  const [step, setStep] = useState<"phone" | "otp">("phone");
  const [phone, setPhone] = useState(""); const [name, setName] = useState(""); const [otp, setOtp] = useState("");
  const [err, setErr] = useState(""); const [busy, setBusy] = useState(false); const [wait, setWait] = useState(0); const [dev, setDev] = useState("");
  useEffect(() => { if (wait <= 0) return; const t = setTimeout(() => setWait(wait - 1), 1000); return () => clearTimeout(t); }, [wait]);

  async function post(url: string, body: any) {
    const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    return { ok: res.ok, d: await res.json() };
  }
  async function send() {
    setBusy(true); setErr("");
    const { ok, d } = await post("/api/auth/send-otp", { phone });
    setBusy(false);
    if (!ok) return setErr(d.error);
    setDev(d.devOtp || ""); setStep("otp"); setWait(30);
  }
  async function verify() {
    setBusy(true); setErr("");
    const { ok, d } = await post("/api/auth/verify", { phone, otp, name: name || undefined });
    setBusy(false);
    if (!ok) return setErr(d.error);
    r.push(d.role === "USER" ? "/" : "/admin"); r.refresh();
  }
  return (
    <div className="mx-auto max-w-sm rounded-xl border bg-white p-6">
      <h1 className="mb-1 text-xl font-bold">Sign in or register</h1>
      <p className="mb-4 text-sm text-slate-500">Enter your mobile number. We'll text you a 6-digit code.</p>
      {step === "phone" ? (
        <div className="space-y-3">
          <div><label className="label" htmlFor="ph">Mobile number</label><input id="ph" className="input" inputMode="numeric" maxLength={14} placeholder="10-digit number" value={phone} onChange={(e) => setPhone(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} /></div>
          <div><label className="label" htmlFor="nm">Name (new players)</label><input id="nm" className="input" maxLength={40} value={name} onChange={(e) => setName(e.target.value)} /></div>
          {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
          <button className="btn w-full" disabled={busy} onClick={send}>Send OTP</button>
        </div>
      ) : (
        <div className="space-y-3">
          <div><label className="label" htmlFor="otp">OTP sent to {phone}</label><input id="otp" className="input text-center text-lg tracking-widest" inputMode="numeric" maxLength={6} autoFocus value={otp} onChange={(e) => setOtp(e.target.value)} onKeyDown={(e) => e.key === "Enter" && verify()} /></div>
          {dev && <p className="rounded bg-amber-50 p-2 text-xs text-amber-800">Dev mode OTP: {dev}</p>}
          {err && <p role="alert" className="text-sm text-red-600">{err}</p>}
          <button className="btn w-full" disabled={busy} onClick={verify}>Verify and continue</button>
          <button className="w-full text-sm underline disabled:no-underline disabled:opacity-50" disabled={wait > 0} onClick={send}>{wait > 0 ? `Resend in ${wait}s` : "Resend OTP"}</button>
        </div>
      )}
    </div>
  );
}
