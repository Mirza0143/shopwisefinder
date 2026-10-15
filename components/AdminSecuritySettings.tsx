"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, Copy, Fingerprint, KeyRound, LoaderCircle, LockKeyhole, MessageCircle, RefreshCw, Send, ShieldCheck, ShieldOff, ToggleLeft, ToggleRight } from "lucide-react";

type SecurityState = {
  otpEnabled: boolean;
  chatConfigured: boolean;
  maskedChatId: string | null;
  pendingPairExpiresAt: string | null;
  botConfigured: boolean;
};
type ApiPayload = SecurityState & { error?: string; message?: string; needsCode?: boolean; pairingCode?: string; command?: string; botUrl?: string | null; pairingMode?: "webhook" | "polling"; webhookUrl?: string | null; paired?: boolean; expired?: boolean };
const EMPTY: SecurityState = { otpEnabled: true, chatConfigured: false, maskedChatId: null, pendingPairExpiresAt: null, botConfigured: false };
function stateExpired(value: string | null | undefined) { return Boolean(value && Number.isFinite(new Date(value).getTime()) && new Date(value).getTime() <= Date.now()); }

export default function AdminSecuritySettings() {
  const [state, setState] = useState<SecurityState>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [disableStep, setDisableStep] = useState(false);
  const [code, setCode] = useState("");
  const [pairingCode, setPairingCode] = useState("");
  const [pairingCommand, setPairingCommand] = useState("");
  const [botUrl, setBotUrl] = useState<string | null>(null);
  const [pairingMode, setPairingMode] = useState<"webhook" | "polling" | null>(null);
  const [notice, setNotice] = useState<{ kind: "success" | "error" | "info"; text: string } | null>(null);
  const pollBusy = useRef(false);

  const load = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const response = await fetch("/api/admin/security", { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as ApiPayload;
      if (response.status === 401) { window.location.assign("/admin/login"); return; }
      if (!response.ok) throw new Error(payload.error || "Could not load Admin Security settings.");
      setState({ otpEnabled: Boolean(payload.otpEnabled), chatConfigured: Boolean(payload.chatConfigured), maskedChatId: payload.maskedChatId || null, pendingPairExpiresAt: payload.pendingPairExpiresAt || null, botConfigured: Boolean(payload.botConfigured) });
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Could not load Admin Security settings." });
    } finally { if (!quiet) setLoading(false); }
  }, []);

  useEffect(() => { void load(); }, [load]);

  useEffect(() => {
    if (!pairingCode || !pairingMode) return;
    let cancelled = false;
    const tick = async () => {
      if (pollBusy.current || cancelled) return;
      pollBusy.current = true;
      try {
        if (pairingMode === "polling") {
          const pollResponse = await fetch("/api/admin/security", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "poll-pairing-updates" }), cache: "no-store" });
          const pollPayload = await pollResponse.json().catch(() => ({})) as ApiPayload;
          if (!pollResponse.ok) {
            if (!cancelled) {
              setPairingCode(""); setPairingCommand(""); setPairingMode(null);
              setNotice({ kind: "error", text: pollPayload.error || "Could not read Telegram updates. Pair from the deployed Admin page if a webhook is already configured." });
            }
            return;
          }
          if (pollPayload.paired) {
            const refreshed = await fetch("/api/admin/security", { cache: "no-store", credentials: "same-origin" });
            const refreshedPayload = await refreshed.json().catch(() => ({})) as ApiPayload;
            if (!cancelled && refreshed.ok) {
              setState({ otpEnabled: true, chatConfigured: Boolean(refreshedPayload.chatConfigured), maskedChatId: refreshedPayload.maskedChatId || null, pendingPairExpiresAt: null, botConfigured: Boolean(refreshedPayload.botConfigured) });
              setPairingCode(""); setPairingCommand(""); setPairingMode(null); setBotUrl(null);
              setNotice({ kind: "success", text: "Telegram account connected successfully. Telegram OTP is now ON." });
            }
            return;
          }
          if (pollPayload.expired && !cancelled) {
            setPairingCode(""); setPairingCommand(""); setPairingMode(null);
            setNotice({ kind: "error", text: "Pairing code expired. Generate a new code and try again." });
            return;
          }
        }
        const response = await fetch("/api/admin/security", { cache: "no-store", credentials: "same-origin" });
        const payload = await response.json().catch(() => ({})) as ApiPayload;
        if (response.ok && payload.otpEnabled && !payload.pendingPairExpiresAt && !cancelled) {
          setState({ otpEnabled: true, chatConfigured: Boolean(payload.chatConfigured), maskedChatId: payload.maskedChatId || null, pendingPairExpiresAt: null, botConfigured: Boolean(payload.botConfigured) });
          setPairingCode(""); setPairingCommand(""); setPairingMode(null); setBotUrl(null);
          setNotice({ kind: "success", text: "Telegram account connected successfully. Telegram OTP is now ON." });
        } else if (stateExpired(payload.pendingPairExpiresAt) && !cancelled) {
          setPairingCode(""); setPairingCommand(""); setPairingMode(null);
          setNotice({ kind: "error", text: "Pairing code expired. Generate a new code and try again." });
        }
      } catch (error) {
        if (!cancelled) setNotice({ kind: "error", text: error instanceof Error ? error.message : "Pairing check failed." });
      } finally { pollBusy.current = false; }
    };
    void tick();
    const timer = window.setInterval(() => void tick(), pairingMode === "polling" ? 2200 : 3000);
    return () => { cancelled = true; window.clearInterval(timer); };
  }, [pairingCode, pairingMode]);

  async function requestAction(action: string, extra?: Record<string, unknown>) {
    setBusy(true); setNotice(null);
    try {
      const response = await fetch("/api/admin/security", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...extra }), cache: "no-store" });
      const payload = await response.json().catch(() => ({})) as ApiPayload;
      if (response.status === 401) { window.location.assign("/admin/login"); return payload; }
      if (!response.ok) throw new Error(payload.error || "Security setting update failed.");
      return payload;
    } catch (error) {
      setNotice({ kind: "error", text: error instanceof Error ? error.message : "Security setting update failed." });
      return null;
    } finally { setBusy(false); }
  }

  async function beginDisable() {
    const payload = await requestAction("begin-disable");
    if (!payload) return;
    setDisableStep(Boolean(payload.needsCode)); setCode(""); setPairingCode(""); setPairingMode(null);
    setNotice({ kind: "info", text: payload.message || "Enter the 6-digit code sent to your connected Telegram chat." });
  }

  async function verifyDisable(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = await requestAction("verify-disable", { code });
    if (!payload) return;
    setState((previous) => ({ ...previous, otpEnabled: false }));
    setDisableStep(false); setCode("");
    setNotice({ kind: "success", text: payload.message || "Telegram OTP is now OFF. Password-only login is less secure." });
    await load(true);
  }

  async function beginEnable() {
    const payload = await requestAction("begin-enable");
    if (!payload) return;
    if (!payload.pairingCode || !payload.command || !payload.pairingMode) {
      setNotice({ kind: "error", text: "The server did not return a pairing code. Please retry." }); return;
    }
    setPairingCode(payload.pairingCode); setPairingCommand(payload.command); setBotUrl(payload.botUrl || null); setPairingMode(payload.pairingMode);
    setNotice({ kind: "info", text: payload.message || "Open the bot and send the one-time pairing command." });
  }

  async function copyCommand() {
    try { await navigator.clipboard.writeText(pairingCommand); setNotice({ kind: "success", text: "Pairing command copied. Paste it into your Telegram bot chat." }); }
    catch { setNotice({ kind: "error", text: "Clipboard access was blocked. Select and copy the command manually." }); }
  }

  const card = "relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white/90 p-4 shadow-sm transition-all duration-300 dark:border-white/10 dark:bg-slate-950/80 sm:p-5";
  return (
    <section id="admin-security" className="admin-security-shell relative isolate mb-8 scroll-mt-6 overflow-hidden rounded-[2rem] border border-slate-200/80 bg-white/95 p-4 shadow-[0_24px_80px_-48px_rgba(30,64,175,.35)] backdrop-blur-xl dark:border-white/10 dark:bg-slate-950/95 sm:p-7">
      <div aria-hidden="true" className="admin-security-orb admin-security-orb-one pointer-events-none absolute -right-20 -top-24 -z-10 h-72 w-72 rounded-full bg-indigo-400/15 blur-3xl" />
      <div aria-hidden="true" className="admin-security-orb admin-security-orb-two pointer-events-none absolute -bottom-24 left-1/4 -z-10 h-64 w-64 rounded-full bg-sky-400/10 blur-3xl" />

      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex items-start gap-3.5">
          <span className="admin-security-shield relative grid h-14 w-14 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-sky-500 text-white shadow-lg shadow-indigo-600/25">
            <span aria-hidden="true" className="absolute inset-1 rounded-xl border border-white/25" />
            <ShieldCheck size={26} strokeWidth={2.2} />
            <span aria-hidden="true" className="absolute -right-1 -top-1 h-3.5 w-3.5 rounded-full border-2 border-white bg-emerald-400 dark:border-slate-950" />
          </span>
          <div className="min-w-0 pt-0.5">
            <p className="mb-1.5 flex flex-wrap items-center gap-2 text-[10px] font-black uppercase tracking-[.19em] text-indigo-600 dark:text-indigo-300"><Fingerprint size={14}/> Private workspace <span className="rounded-full border border-slate-200 bg-white/80 px-2 py-0.5 text-[9px] tracking-[.12em] text-slate-500 dark:border-white/10 dark:bg-white/5 dark:text-slate-400">ADMIN ONLY</span></p>
            <h2 className="text-2xl font-black tracking-tight text-slate-950 dark:text-white sm:text-[1.8rem]">Admin Security</h2>
            <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Protect sign-in with Telegram verification and manage the account that receives your one-time codes.</p>
          </div>
        </div>
        <button type="button" onClick={() => void load()} disabled={loading || busy} className="inline-flex min-h-10 shrink-0 items-center justify-center gap-2 self-start rounded-xl border border-slate-200 bg-white/90 px-3.5 text-sm font-bold text-slate-700 shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700 disabled:cursor-not-allowed disabled:opacity-60 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-indigo-400/40 dark:hover:bg-indigo-500/10 dark:hover:text-indigo-200">
          <RefreshCw size={15} className={loading ? "animate-spin" : ""}/> Refresh status
        </button>
      </div>

      {notice && <div role="status" className={`admin-security-notice mb-5 flex items-start gap-3 rounded-2xl border p-3.5 text-sm shadow-sm transition-all duration-300 sm:p-4 ${notice.kind === "success" ? "border-emerald-200 bg-emerald-50/90 text-emerald-950 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100" : notice.kind === "error" ? "border-rose-200 bg-rose-50/90 text-rose-950 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-100" : "border-indigo-200 bg-indigo-50/90 text-indigo-950 dark:border-indigo-400/20 dark:bg-indigo-500/10 dark:text-indigo-100"}`}>{notice.kind === "success" ? <CheckCircle2 size={18} className="mt-0.5 shrink-0"/> : notice.kind === "error" ? <AlertTriangle size={18} className="mt-0.5 shrink-0"/> : <ShieldCheck size={18} className="mt-0.5 shrink-0"/>}<span className="leading-6">{notice.text}</span></div>}

      {loading ? (
        <div className="space-y-4 py-3" aria-label="Loading security settings">
          <div className="h-40 animate-pulse rounded-3xl bg-slate-100 dark:bg-white/5" />
          <div className="grid gap-3 sm:grid-cols-2"><div className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5"/><div className="h-20 animate-pulse rounded-2xl bg-slate-100 dark:bg-white/5"/></div>
        </div>
      ) : (
        <div className="space-y-4">
          <div className={`admin-security-status relative overflow-hidden rounded-3xl border p-4 transition-all duration-300 sm:p-6 ${state.otpEnabled ? "border-emerald-200/90 bg-gradient-to-br from-emerald-50 via-white to-sky-50/70 dark:border-emerald-400/20 dark:from-emerald-500/10 dark:via-slate-950 dark:to-sky-500/5" : "border-amber-200/90 bg-gradient-to-br from-amber-50 via-white to-orange-50/70 dark:border-amber-400/20 dark:from-amber-500/10 dark:via-slate-950 dark:to-orange-500/5"}`}>
            <div aria-hidden="true" className={`absolute -right-12 -top-16 h-44 w-44 rounded-full blur-2xl transition-colors duration-500 ${state.otpEnabled ? "bg-emerald-300/20" : "bg-amber-300/20"}`} />
            <div className="relative flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex min-w-0 items-start gap-3.5 sm:gap-4">
                <span className={`admin-security-status-icon relative grid h-12 w-12 shrink-0 place-items-center rounded-2xl text-white shadow-lg transition-all duration-300 sm:h-14 sm:w-14 ${state.otpEnabled ? "bg-gradient-to-br from-emerald-500 to-teal-600 shadow-emerald-600/20" : "bg-gradient-to-br from-amber-500 to-orange-600 shadow-amber-600/20"}`}>
                  {state.otpEnabled ? <LockKeyhole size={23}/> : <ShieldOff size={23}/>}
                  {state.otpEnabled && <span aria-hidden="true" className="absolute inset-0 rounded-2xl ring-4 ring-emerald-400/15" />}
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <h3 className="text-base font-black tracking-tight text-slate-950 dark:text-white sm:text-lg">Telegram two-step verification</h3>
                    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10px] font-black uppercase tracking-[.15em] ${state.otpEnabled ? "border-emerald-200 bg-emerald-100 text-emerald-800 dark:border-emerald-400/20 dark:bg-emerald-500/15 dark:text-emerald-200" : "border-amber-200 bg-amber-100 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/15 dark:text-amber-200"}`}><span className={`h-1.5 w-1.5 rounded-full ${state.otpEnabled ? "animate-pulse bg-emerald-500" : "bg-amber-500"}`} />{state.otpEnabled ? "Protected · ON" : "At risk · OFF"}</span>
                  </div>
                  <p className="mt-1.5 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">{state.otpEnabled ? "Your Admin sign-in requires a username, password and a one-time Telegram code." : "Two-step verification is disabled. Admin sign-in currently relies on the username and password only."}</p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <span className="inline-flex max-w-full items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/80 px-2.5 py-1.5 text-xs font-semibold text-slate-600 dark:border-white/10 dark:bg-slate-950/60 dark:text-slate-300"><MessageCircle size={13} className="shrink-0 text-sky-500"/><span className="truncate">{state.chatConfigured ? `Connected chat: ${state.maskedChatId}` : "Telegram account not connected"}</span></span>
                    <span className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-semibold ${state.botConfigured ? "bg-sky-100/80 text-sky-800 dark:bg-sky-500/10 dark:text-sky-200" : "bg-slate-100 text-slate-600 dark:bg-white/5 dark:text-slate-400"}`}><Send size={12}/>{state.botConfigured ? "Bot ready" : "Bot not configured"}</span>
                  </div>
                </div>
              </div>
              {state.otpEnabled ? (
                <button type="button" disabled={busy || !state.chatConfigured} onClick={() => void beginDisable()} className="admin-security-action group inline-flex min-h-12 shrink-0 items-center justify-center gap-2.5 rounded-2xl border border-amber-200 bg-white/95 px-4 py-3 text-sm font-extrabold text-amber-900 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-amber-300 hover:bg-amber-50 hover:shadow-md focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-amber-400/20 disabled:cursor-not-allowed disabled:opacity-50 dark:border-amber-400/20 dark:bg-slate-900 dark:text-amber-200 dark:hover:bg-amber-500/10"><ToggleRight size={20} className="transition-transform duration-300 group-hover:scale-110"/>Turn OFF with OTP</button>
              ) : (
                <button type="button" disabled={busy || !state.botConfigured} onClick={() => void beginEnable()} className="admin-security-action group inline-flex min-h-12 shrink-0 items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/20 transition-all duration-200 hover:-translate-y-0.5 hover:from-indigo-500 hover:to-blue-500 hover:shadow-xl focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-indigo-500/25 disabled:cursor-not-allowed disabled:opacity-50"><ToggleLeft size={20} className="transition-transform duration-300 group-hover:scale-110"/>Turn ON & pair account</button>
              )}
            </div>
            <div className="relative mt-5 grid gap-2 border-t border-slate-200/80 pt-4 dark:border-white/10 sm:grid-cols-3">
              <div className="flex items-center gap-2.5 rounded-xl bg-white/60 px-3 py-2.5 dark:bg-white/[.035]"><span className={`grid h-8 w-8 place-items-center rounded-lg ${state.otpEnabled ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/15 dark:text-emerald-300" : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-300"}`}><ShieldCheck size={15}/></span><span className="text-xs font-bold text-slate-700 dark:text-slate-200">Protected admin access</span></div>
              <div className="flex items-center gap-2.5 rounded-xl bg-white/60 px-3 py-2.5 dark:bg-white/[.035]"><span className="grid h-8 w-8 place-items-center rounded-lg bg-indigo-100 text-indigo-700 dark:bg-indigo-500/15 dark:text-indigo-300"><Clock3 size={15}/></span><span className="text-xs font-bold text-slate-700 dark:text-slate-200">One-time, expiring codes</span></div>
              <div className="flex items-center gap-2.5 rounded-xl bg-white/60 px-3 py-2.5 dark:bg-white/[.035]"><span className="grid h-8 w-8 place-items-center rounded-lg bg-sky-100 text-sky-700 dark:bg-sky-500/15 dark:text-sky-300"><RefreshCw size={15}/></span><span className="text-xs font-bold text-slate-700 dark:text-slate-200">Account can be re-paired</span></div>
            </div>
          </div>

          {disableStep && <form onSubmit={verifyDisable} className={`${card} admin-security-flow border-amber-200/80 dark:border-amber-400/20`}><div className="flex items-start gap-3.5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-amber-100 to-orange-100 text-amber-800 dark:from-amber-500/20 dark:to-orange-500/10 dark:text-amber-200"><KeyRound size={20}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-950 dark:text-white">Confirm turning Telegram OTP OFF</h3><span className="rounded-full bg-amber-100 px-2 py-1 text-[10px] font-black uppercase tracking-wider text-amber-800 dark:bg-amber-500/15 dark:text-amber-200">Security check</span></div><p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">Enter the 6-digit code sent to your currently connected Telegram account. Verification stays ON until this code is accepted.</p><label className="mt-4 block text-xs font-black uppercase tracking-[.12em] text-slate-600 dark:text-slate-300" htmlFor="disable-telegram-otp-code">Telegram confirmation code</label><input id="disable-telegram-otp-code" autoComplete="one-time-code" inputMode="numeric" pattern="[0-9]{6}" minLength={6} maxLength={6} required value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} className="mt-2 min-h-14 w-full max-w-sm rounded-2xl border border-slate-300 bg-slate-50 px-4 text-center text-2xl font-black tracking-[.55em] text-slate-950 outline-none transition focus:border-amber-500 focus:bg-white focus:ring-4 focus:ring-amber-500/15 dark:border-white/15 dark:bg-slate-900 dark:text-white dark:focus:border-amber-400" placeholder="••••••"/><p className="mt-2 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400"><Clock3 size={13}/>Expires in 10 minutes · one-time use · maximum 5 attempts.</p><div className="mt-4 flex flex-wrap gap-2"><button type="submit" disabled={busy || code.length !== 6} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 px-4 text-sm font-extrabold text-white shadow-md shadow-amber-600/15 transition-all hover:-translate-y-0.5 hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50">{busy ? <LoaderCircle size={15} className="animate-spin"/> : <ShieldOff size={15}/>} Verify & turn OFF</button><button type="button" onClick={() => { setDisableStep(false); setCode(""); }} className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-700 transition hover:bg-slate-50 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:bg-white/10">Cancel</button></div></div></div></form>}

          {pairingCode && <div className={`${card} admin-security-flow border-indigo-200/80 bg-gradient-to-br from-indigo-50/90 via-white to-sky-50/70 dark:border-indigo-400/20 dark:from-indigo-500/10 dark:via-slate-950 dark:to-sky-500/5`}><div className="flex items-start gap-3.5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br from-sky-500 to-indigo-600 text-white shadow-lg shadow-indigo-600/20"><Send size={19}/></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h3 className="font-black text-slate-950 dark:text-white">Connect your Telegram account</h3><span className="inline-flex items-center gap-1.5 rounded-full border border-indigo-200 bg-indigo-100 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider text-indigo-800 dark:border-indigo-400/20 dark:bg-indigo-500/15 dark:text-indigo-100"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-indigo-500"/>One-time code</span></div><p className="mt-1.5 text-sm leading-6 text-slate-600 dark:text-slate-300">Open your ShopWiseFinder OTP bot and send this exact command. The code is stored as a hash, expires in 10 minutes, and can be used once.</p><div className="mt-4 flex flex-col gap-2 sm:flex-row"><code className="flex min-h-12 min-w-0 flex-1 items-center break-all rounded-2xl border border-indigo-200/80 bg-white px-4 py-3 text-base font-black tracking-wide text-indigo-950 shadow-inner dark:border-white/10 dark:bg-slate-900 dark:text-white sm:text-lg">{pairingCommand}</code><button type="button" onClick={() => void copyCommand()} className="inline-flex min-h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-indigo-600 to-blue-600 px-4 text-sm font-extrabold text-white shadow-md shadow-indigo-600/20 transition-all hover:-translate-y-0.5 hover:shadow-lg"><Copy size={15}/>Copy command</button></div>{botUrl && <a href={botUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg text-sm font-bold text-indigo-700 underline decoration-indigo-300 underline-offset-4 transition hover:text-indigo-900 dark:text-indigo-200 dark:hover:text-white">Open your Telegram bot <Send size={13}/></a>}<p className="mt-3 rounded-xl bg-white/70 px-3 py-2.5 text-xs leading-5 text-slate-600 dark:bg-white/[.04] dark:text-slate-300">{pairingMode === "polling" ? "Local mode: this page checks Telegram updates while open. Keep this panel open until it confirms the account." : "Secure webhook mode: Telegram will notify the deployed HTTPS endpoint when the command arrives."}</p></div></div></div>}

          {!state.otpEnabled && !pairingCode && <div className="flex items-start gap-2.5 rounded-2xl border border-amber-200 bg-amber-50/90 p-3.5 text-xs leading-5 text-amber-950 shadow-sm dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100"><AlertTriangle size={16} className="mt-0.5 shrink-0"/><span>Turning OTP OFF weakens admin security. When turning it ON again, keep this page open, copy the one-time command, and send it to the bot you want to receive future login codes.</span></div>}
          <p className="flex items-start gap-2 px-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400"><ShieldCheck size={13} className="mt-0.5 shrink-0 text-emerald-600 dark:text-emerald-400"/> Security settings affect this Admin account only. Keep your bot token, session secret and recovery information private.</p>
        </div>
      )}
    </section>
  );
}
