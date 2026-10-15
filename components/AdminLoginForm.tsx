"use client";

import { FormEvent, useState } from "react";
import { ArrowLeft, Clock3, Eye, EyeOff, LoaderCircle, LockKeyhole, Send, ShieldCheck } from "lucide-react";

type ApiResult = { error?: string; message?: string; otpRequired?: boolean };

export default function AdminLoginForm() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [otpStep, setOtpStep] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [otpFocused, setOtpFocused] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setNotice("");
    setBusy(true);
    try {
      const response = await fetch(otpStep ? "/api/admin/auth/verify" : "/api/admin/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "same-origin",
        cache: "no-store",
        body: JSON.stringify(otpStep ? { code } : { username, password }),
      });
      const result = await response.json().catch(() => ({})) as ApiResult;
      if (!response.ok) throw new Error(result.error || (otpStep ? "Could not verify code." : "Could not sign in."));
      if (!otpStep && result.otpRequired) {
        setOtpStep(true);
        setPassword("");
        setCode("");
        setNotice(result.message || "A 6-digit code was sent to your Telegram chat.");
        setBusy(false);
        return;
      }
      window.location.assign("/admin");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not sign in. Try again.");
      setBusy(false);
    }
  }

  function changeLogin() {
    setOtpStep(false);
    setCode("");
    setPassword("");
    setError("");
    setNotice("");
  }

  return (
    <form onSubmit={submit} className="mt-7 space-y-4">
      {!otpStep ? <>
        <label className="block text-sm font-bold">Admin username
          <input autoComplete="username" required maxLength={150} value={username} onChange={(event) => setUsername(event.target.value)} className="mt-2 min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/15 dark:bg-slate-900" />
        </label>
        <label className="block text-sm font-bold">Admin password
          <span className="relative mt-2 block">
            <input autoComplete="current-password" required maxLength={500} type={showPassword ? "text" : "password"} value={password} onChange={(event) => setPassword(event.target.value)} className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 pr-12 text-sm outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/15 dark:bg-slate-900" />
            <button type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? "Hide password" : "Show password"} className="absolute right-2 top-1/2 grid h-9 w-9 -translate-y-1/2 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 dark:hover:bg-white/10">{showPassword ? <EyeOff size={18}/> : <Eye size={18}/>}</button>
          </span>
        </label>
      </> : <>
        <div className="overflow-hidden rounded-2xl border border-indigo-200 bg-gradient-to-br from-indigo-50 via-white to-sky-50 p-4 shadow-sm dark:border-indigo-400/20 dark:from-indigo-500/10 dark:via-slate-950 dark:to-sky-500/10 sm:p-5">
          <div className="flex items-start gap-3">
            <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-sky-500 text-white shadow-lg shadow-sky-500/20"><Send size={20}/></span>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2"><p className="font-extrabold text-slate-950 dark:text-white">Telegram verification</p><span className="rounded-full border border-indigo-200 bg-white/80 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-indigo-700 dark:border-indigo-400/20 dark:bg-white/5 dark:text-indigo-200">Step 2 of 2</span></div>
              <p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">We sent a one-time code to your configured Telegram chat. Enter all six digits to finish signing in.</p>
              <p className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-slate-500 dark:text-slate-400"><Clock3 size={14}/> Expires in 10 minutes <span aria-hidden="true">·</span> single use</p>
            </div>
          </div>
        </div>
        <label className="block text-sm font-extrabold" htmlFor="admin-otp-code">6-digit verification code</label>
        <div className={`relative mt-2 rounded-2xl border bg-white p-2 transition dark:bg-slate-900 ${otpFocused ? "border-indigo-500 ring-4 ring-indigo-500/15" : "border-slate-300 dark:border-white/15"}`}>
          <div aria-hidden="true" className="grid grid-cols-6 gap-2">
            {Array.from({ length: 6 }, (_, index) => (
              <span key={index} className={`grid h-12 min-w-0 place-items-center rounded-xl border text-xl font-black tabular-nums transition sm:h-14 sm:text-2xl ${code[index] ? "border-indigo-300 bg-indigo-50 text-indigo-800 dark:border-indigo-400/30 dark:bg-indigo-500/10 dark:text-indigo-100" : "border-slate-200 bg-slate-50 text-slate-300 dark:border-white/10 dark:bg-white/5 dark:text-slate-600"}`}>{code[index] || "•"}</span>
            ))}
          </div>
          <input id="admin-otp-code" autoFocus required inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6}" minLength={6} maxLength={6} value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} onFocus={() => setOtpFocused(true)} onBlur={() => setOtpFocused(false)} aria-label="Six digit Telegram verification code" className="absolute inset-0 h-full w-full cursor-text opacity-0 focus-visible:outline-none" />
        </div>
        <p className="text-xs leading-5 text-slate-500 dark:text-slate-400">Click the digit boxes and type or paste the code from Telegram.</p>
        <button type="button" onClick={changeLogin} className="inline-flex items-center gap-2 rounded-xl px-3 py-2.5 text-sm font-bold text-slate-600 transition hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10"><ArrowLeft size={16}/> Use a different login</button>
      </>}
      {notice && <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2.5 text-sm leading-5 text-emerald-800 dark:border-emerald-400/25 dark:bg-emerald-500/10 dark:text-emerald-200">{notice}</p>}
      {error && <p role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2.5 text-sm leading-5 text-rose-800 dark:border-rose-400/25 dark:bg-rose-500/10 dark:text-rose-200">{error}</p>}
      <button disabled={busy} type="submit" className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-wait disabled:opacity-70">
        {busy ? <LoaderCircle size={17} className="animate-spin"/> : otpStep ? <ShieldCheck size={17}/> : <LockKeyhole size={17}/>} {busy ? (otpStep ? "Verifying code…" : "Sending verification code…") : otpStep ? "Verify code and sign in" : "Continue securely"}
      </button>
    </form>
  );
}
