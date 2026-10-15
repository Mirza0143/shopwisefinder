"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CheckCircle2, Instagram, LoaderCircle, MessageCircle, RefreshCw, Save, Send, ShieldCheck } from "lucide-react";

type Links = {
  telegramUrl: string;
  telegramEnabled: boolean;
  whatsappUrl: string;
  whatsappEnabled: boolean;
  instagramUrl: string;
  instagramEnabled: boolean;
};
const EMPTY: Links = {
  telegramUrl: "", telegramEnabled: true,
  whatsappUrl: "", whatsappEnabled: true,
  instagramUrl: "", instagramEnabled: true,
};
type Channel = "telegram" | "whatsapp" | "instagram";

export default function AdminUserSupport() {
  const [links, setLinks] = useState<Links>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const response = await fetch("/api/admin/support", { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as { links?: Partial<Links>; error?: string };
      if (response.status === 401) { window.location.assign("/admin/login"); return; }
      if (!response.ok) throw new Error(payload.error || "Could not load support settings.");
      setLinks({ ...EMPTY, ...(payload.links || {}) });
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "Could not load support settings." }); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  function update<K extends keyof Links>(key: K, value: Links[K]) {
    setLinks((previous) => ({ ...previous, [key]: value }));
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setNotice(null);
    try {
      const response = await fetch("/api/admin/support", { method: "POST", credentials: "same-origin", headers: { "Content-Type": "application/json" }, body: JSON.stringify(links) });
      const payload = await response.json().catch(() => ({})) as { links?: Links; error?: string };
      if (response.status === 401) { window.location.assign("/admin/login"); return; }
      if (!response.ok) throw new Error(payload.error || "Could not save support settings.");
      setLinks({ ...EMPTY, ...(payload.links || links) });
      setNotice({ kind: "success", text: "Support settings saved. Disabled channels keep their saved links and are hidden from visitors." });
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "Could not save support settings." }); }
    finally { setSaving(false); }
  }

  const field = "mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/15 dark:bg-slate-900 dark:text-white";
  const card = "rounded-2xl border border-slate-200 p-4 transition dark:border-white/10";

  function channelToggle(channel: Channel, enabled: boolean) {
    const enabledKeys: Record<Channel, "telegramEnabled" | "whatsappEnabled" | "instagramEnabled"> = { telegram: "telegramEnabled", whatsapp: "whatsappEnabled", instagram: "instagramEnabled" };
    const key = enabledKeys[channel];
    return (
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={`${channel} support ${enabled ? "enabled" : "disabled"}`}
        onClick={() => update(key, !enabled)}
        className="group inline-flex min-h-10 items-center gap-2 rounded-xl px-2 py-1 text-xs font-extrabold outline-none transition duration-200 hover:bg-slate-100 focus-visible:ring-4 focus-visible:ring-indigo-500/20 active:scale-[.98] dark:hover:bg-white/5"
      >
        <span className={`relative inline-flex h-7 w-12 shrink-0 rounded-full p-1 transition-colors duration-300 ease-in-out ${enabled ? "bg-emerald-500 shadow-inner shadow-emerald-900/15" : "bg-slate-300 dark:bg-slate-700"}`}>
          <span className={`h-5 w-5 rounded-full bg-white shadow-md ring-1 ring-black/5 transition-transform duration-300 ease-in-out ${enabled ? "translate-x-5 scale-100" : "translate-x-0 scale-[.96]"}`} />
        </span>
        <span className={`min-w-[4.25rem] text-left transition-colors duration-200 ${enabled ? "text-emerald-700 dark:text-emerald-300" : "text-slate-500 dark:text-slate-400"}`}>{enabled ? "ON · Visible" : "OFF · Hidden"}</span>
        {enabled && <CheckCircle2 size={14} className="animate-pulse text-emerald-600 dark:text-emerald-300" aria-hidden="true" />}
      </button>
    );
  }

  return (
    <section id="user-support" className="mb-8 scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950 sm:p-7">
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.17em] text-indigo-600 dark:text-indigo-300"><ShieldCheck size={15}/> Visitor help</p><h2 className="mt-2 text-2xl font-black">User Support</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Save each support link once, then switch that channel ON or OFF whenever you like. OFF hides it from the footer and, for Telegram, the floating support button—without deleting the saved URL.</p></div>
        <button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-300 px-3.5 text-sm font-bold disabled:opacity-60 dark:border-white/10"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/> Refresh</button>
      </div>
      {notice && (
        <div role="status" className={`mb-5 flex items-start gap-2 rounded-xl border p-3.5 text-sm ${notice.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100" : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-100"}`}>
          {notice.kind === "success" ? <CheckCircle2 size={17} className="mt-0.5 shrink-0"/> : <ShieldCheck size={17} className="mt-0.5 shrink-0"/>}<span>{notice.text}</span>
        </div>
      )}
      {loading ? <div className="flex items-center gap-2 py-8 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin"/> Loading support settings…</div> : (
        <form onSubmit={save} className="space-y-5">
          <div className="grid gap-4 lg:grid-cols-3">
            <div className={`${card} ${links.telegramEnabled ? "bg-sky-50/50 dark:bg-sky-500/5" : "bg-slate-50 dark:bg-white/[.02]"}`}>
              <div className="flex items-start justify-between gap-2"><label htmlFor="support-telegram" className="inline-flex items-center gap-2 text-sm font-extrabold"><Send size={17} className="text-sky-500"/> Telegram</label>{channelToggle("telegram", links.telegramEnabled)}</div>
              <input id="support-telegram" type="url" inputMode="url" value={links.telegramUrl} onChange={(event) => update("telegramUrl", event.target.value)} className={field} placeholder="https://t.me/your_support_username" maxLength={500}/>
              <p className="mt-2 text-xs leading-5 text-slate-500">Controls the footer icon and floating Telegram button. Switching OFF keeps the URL saved.</p>
              {!links.telegramEnabled && <p className="mt-2 text-xs font-bold text-amber-700 dark:text-amber-300">Hidden from visitors while OFF.</p>}
            </div>
            <div className={`${card} ${links.whatsappEnabled ? "bg-emerald-50/50 dark:bg-emerald-500/5" : "bg-slate-50 dark:bg-white/[.02]"}`}>
              <div className="flex items-start justify-between gap-2"><label htmlFor="support-whatsapp" className="inline-flex items-center gap-2 text-sm font-extrabold"><MessageCircle size={17} className="text-emerald-600"/> WhatsApp</label>{channelToggle("whatsapp", links.whatsappEnabled)}</div>
              <input id="support-whatsapp" type="url" inputMode="url" value={links.whatsappUrl} onChange={(event) => update("whatsappUrl", event.target.value)} className={field} placeholder="https://wa.me/919876543210" maxLength={500}/>
              <p className="mt-2 text-xs leading-5 text-slate-500">Use the full wa.me link with country code. Switching OFF keeps the URL saved.</p>
              {!links.whatsappEnabled && <p className="mt-2 text-xs font-bold text-amber-700 dark:text-amber-300">Hidden from visitors while OFF.</p>}
            </div>
            <div className={`${card} ${links.instagramEnabled ? "bg-pink-50/50 dark:bg-pink-500/5" : "bg-slate-50 dark:bg-white/[.02]"}`}>
              <div className="flex items-start justify-between gap-2"><label htmlFor="support-instagram" className="inline-flex items-center gap-2 text-sm font-extrabold"><Instagram size={17} className="text-pink-500"/> Instagram</label>{channelToggle("instagram", links.instagramEnabled)}</div>
              <input id="support-instagram" type="url" inputMode="url" value={links.instagramUrl} onChange={(event) => update("instagramUrl", event.target.value)} className={field} placeholder="https://www.instagram.com/your_profile/" maxLength={500}/>
              <p className="mt-2 text-xs leading-5 text-slate-500">Use your public profile link. Switching OFF keeps the URL saved.</p>
              {!links.instagramEnabled && <p className="mt-2 text-xs font-bold text-amber-700 dark:text-amber-300">Hidden from visitors while OFF.</p>}
            </div>
          </div>
          <div className="flex flex-col gap-3 border-t border-slate-200 pt-5 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs leading-5 text-slate-500">Toggle changes are saved together with links when you click Save. Official HTTPS support domains only. Public footer and floating support update after the save and a public-page refresh.</p>
            <button type="submit" disabled={saving || loading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-indigo-600/20 transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">{saving ? <LoaderCircle size={16} className="animate-spin"/> : <Save size={16}/>} {saving ? "Saving…" : "Save support settings"}</button>
          </div>
        </form>
      )}
    </section>
  );
}
