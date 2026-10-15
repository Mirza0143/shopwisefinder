"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, ImagePlus, LoaderCircle, Megaphone, Pencil, RefreshCw, Save, Trash2, UploadCloud, X } from "lucide-react";

type BannerStatus = "draft" | "published" | "archived";
type BannerRecord = { id: string; title: string; subtitle: string; message: string; image_url: string; link_url: string; button_label: string; status: BannerStatus; enabled: boolean; sort_order: number; starts_at: string | null; ends_at: string | null; created_at: string; updated_at: string };
type BannerForm = { id: string; title: string; subtitle: string; message: string; image_url: string; link_url: string; button_label: string; status: "draft" | "published"; enabled: boolean; sort_order: string; starts_at: string; ends_at: string };
function emptyForm(): BannerForm { return { id: "", title: "", subtitle: "NEW ARRIVAL", message: "Discover our latest product pick.", image_url: "", link_url: "/products", button_label: "Explore product", status: "draft", enabled: false, sort_order: "1", starts_at: "", ends_at: "" }; }
function localDate(value: string | null) { if (!value) return ""; const date = new Date(value); if (Number.isNaN(date.getTime())) return ""; return new Date(date.getTime() - date.getTimezoneOffset() * 60_000).toISOString().slice(0, 16); }

export default function AdminBannerManager() {
  const [records, setRecords] = useState<BannerRecord[]>([]);
  const [form, setForm] = useState<BannerForm>(emptyForm);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [filePreview, setFilePreview] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const textInput = "mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/15 dark:bg-slate-900 dark:text-white";

  const load = useCallback(async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/admin/banners", { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as { records?: BannerRecord[]; error?: string };
      if (response.status === 401) { window.location.assign("/admin/login"); return; }
      if (!response.ok) throw new Error(payload.error || "Banner list could not be loaded.");
      setRecords(Array.isArray(payload.records) ? payload.records : []);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Banner list could not be loaded."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!file) { setFilePreview(""); return; }
    const url = URL.createObjectURL(file); setFilePreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  function set<K extends keyof BannerForm>(key: K, value: BannerForm[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function edit(record: BannerRecord) {
    setEditingId(record.id); setFile(null); setMessage(""); setError("");
    setForm({ id: record.id, title: record.title, subtitle: record.subtitle || "", message: record.message || "", image_url: record.image_url, link_url: record.link_url || "/products", button_label: record.button_label || "Explore products", status: record.status === "published" ? "published" : "draft", enabled: Boolean(record.enabled), sort_order: String(record.sort_order || 100), starts_at: localDate(record.starts_at), ends_at: localDate(record.ends_at) });
    document.getElementById("banner-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }
  function reset() { setEditingId(null); setForm(emptyForm()); setFile(null); const input = document.getElementById("admin-banner-file") as HTMLInputElement | null; if (input) input.value = ""; setMessage(""); setError(""); }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setSaving(true); setError(""); setMessage("");
    try {
      let imageUrl = form.image_url.trim();
      if (file) {
        const upload = new FormData(); upload.append("image", file);
        const uploadResponse = await fetch("/api/admin/banners/upload", { method: "POST", body: upload, credentials: "same-origin" });
        const uploadPayload = await uploadResponse.json().catch(() => ({})) as { image_url?: string; error?: string };
        if (uploadResponse.status === 401) { window.location.assign("/admin/login"); return; }
        if (!uploadResponse.ok || !uploadPayload.image_url) throw new Error(uploadPayload.error || "Could not upload banner image.");
        imageUrl = uploadPayload.image_url;
      }
      if (!imageUrl) throw new Error("Upload a banner image or enter its HTTPS URL.");
      const toIso = (value: string) => value ? new Date(value).toISOString() : null;
      const body = {
        id: editingId || form.id || undefined, title: form.title, subtitle: form.subtitle, message: form.message, image_url: imageUrl,
        link_url: form.link_url, button_label: form.button_label, status: form.status, enabled: form.enabled, sort_order: Number(form.sort_order),
        starts_at: toIso(form.starts_at), ends_at: toIso(form.ends_at),
      };
      const response = await fetch("/api/admin/banners", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as { error?: string; id?: string };
      if (response.status === 401) { window.location.assign("/admin/login"); return; }
      if (!response.ok) throw new Error(payload.error || "Could not save banner.");
      setMessage(`Banner "${form.title}" saved as ${form.status}${form.status === "published" && form.enabled ? " and enabled for visitors" : ""}.`);
      reset(); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save banner."); }
    finally { setSaving(false); }
  }

  async function remove(record: BannerRecord) {
    if (!window.confirm(`Delete banner "${record.title}"? This cannot be undone.`)) return;
    setError(""); setMessage("");
    try {
      const response = await fetch("/api/admin/banners", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: record.id }), credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (response.status === 401) { window.location.assign("/admin/login"); return; }
      if (!response.ok) throw new Error(payload.error || "Could not delete banner.");
      if (editingId === record.id) reset();
      setMessage(`Banner "${record.title}" deleted.`); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not delete banner."); }
  }

  return (
    <section id="banner-manager" className="mb-8 scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950 sm:p-7">
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.17em] text-indigo-600 dark:text-indigo-300"><Megaphone size={15}/> Welcome popup</p><h2 className="mt-2 text-2xl font-black">Banner manager</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">Upload a product-launch banner. Published + enabled banners appear as a dismissible welcome popup once per browser tab session; visitors can close it anytime.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 self-start rounded-xl border border-slate-300 px-3.5 text-sm font-bold disabled:opacity-60 dark:border-white/10"><RefreshCw size={14} className={loading ? "animate-spin" : ""}/> Refresh</button></div>
      {message && <p role="status" className="mb-4 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-sm text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100"><CheckCircle2 size={16} className="mt-0.5 shrink-0"/>{message}</p>}
      {error && <p role="alert" className="mb-4 flex items-start gap-2 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-100"><AlertCircle size={16} className="mt-0.5 shrink-0"/>{error}</p>}
      <form id="banner-editor" onSubmit={submit} className="scroll-mt-6 rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4 dark:border-indigo-400/15 dark:bg-indigo-500/[.04] sm:p-5">
        <div className="mb-4 flex items-start justify-between gap-3"><div><h3 className="font-black">{editingId ? "Edit banner" : "Create a banner"}</h3><p className="mt-1 text-xs text-slate-500">JPG, PNG or WebP up to 4 MB. Banner images go to your Supabase storage bucket.</p></div>{editingId && <button type="button" onClick={reset} className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-slate-500 hover:bg-white dark:hover:bg-white/10"><X size={13}/> Cancel edit</button>}</div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <label className="block text-sm font-bold">Banner title *<input required maxLength={180} value={form.title} onChange={(event) => set("title", event.target.value)} className={textInput} placeholder="New arrival: boAt Airdopes Joy v2"/></label>
          <label className="block text-sm font-bold">Subtitle / eyebrow<input maxLength={220} value={form.subtitle} onChange={(event) => set("subtitle", event.target.value)} className={textInput} placeholder="NEW ARRIVAL"/></label>
          <label className="block text-sm font-bold">Button label<input maxLength={60} value={form.button_label} onChange={(event) => set("button_label", event.target.value)} className={textInput} placeholder="Explore product"/></label>
          <label className="block text-sm font-bold md:col-span-2">Message / description<textarea maxLength={1000} value={form.message} onChange={(event) => set("message", event.target.value)} className={`${textInput} min-h-24`} placeholder="Short launch message for visitors"/></label>
          <label className="block text-sm font-bold">Destination link<input value={form.link_url} onChange={(event) => set("link_url", event.target.value)} className={textInput} placeholder="/products or https://..."/><span className="mt-1 block text-xs font-normal text-slate-500">Use a local path or a full HTTPS URL.</span></label>
          <label className="block text-sm font-bold">Upload banner image<input id="admin-banner-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={(event: ChangeEvent<HTMLInputElement>) => setFile(event.target.files?.[0] || null)} className={`${textInput} file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-indigo-700`}/></label>
          <label className="block text-sm font-bold">Or image HTTPS URL<input type="url" value={form.image_url} onChange={(event) => { set("image_url", event.target.value); if (file) setFile(null); }} className={textInput} placeholder="https://…"/><span className="mt-1 block text-xs font-normal text-slate-500">If a new file is selected, it takes precedence over this URL.</span></label>
          <label className="block text-sm font-bold">Status<select value={form.status} onChange={(event) => set("status", event.target.value as BannerForm["status"])} className={textInput}><option value="draft">Draft — hidden</option><option value="published">Published</option></select></label>
          <label className="block text-sm font-bold">Display order<input type="number" min="1" max="1000000" step="1" required value={form.sort_order} onChange={(event) => set("sort_order", event.target.value)} className={textInput}/><span className="mt-1 block text-xs font-normal text-slate-500">Smaller number gets priority.</span></label>
          <label className="flex items-center gap-2 self-end rounded-xl border border-slate-200 bg-white p-3 text-sm font-bold dark:border-white/10 dark:bg-slate-950"><input type="checkbox" checked={form.enabled} onChange={(event) => set("enabled", event.target.checked)} className="h-4 w-4 accent-indigo-600"/> Enable popup for visitors</label>
          <label className="block text-sm font-bold">Start showing (optional)<input type="datetime-local" value={form.starts_at} onChange={(event) => set("starts_at", event.target.value)} className={textInput}/></label>
          <label className="block text-sm font-bold">Stop showing (optional)<input type="datetime-local" value={form.ends_at} onChange={(event) => set("ends_at", event.target.value)} className={textInput}/></label>
        </div>
        {(filePreview || form.image_url) && <div className="mt-4 max-w-xl rounded-xl border border-slate-200 bg-white p-3 dark:border-white/10 dark:bg-slate-950"><p className="mb-2 text-xs font-bold text-slate-500">Banner preview</p><img src={filePreview || form.image_url} alt="Banner preview" className="max-h-64 w-full rounded-lg object-contain" onError={(event) => { event.currentTarget.style.opacity = "0.25"; }}/></div>}
        <div className="mt-5 flex flex-wrap gap-2"><button type="submit" disabled={saving} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-60">{saving ? <LoaderCircle size={16} className="animate-spin"/> : file ? <UploadCloud size={16}/> : <Save size={16}/>} {saving ? "Saving…" : editingId ? "Save banner" : "Create banner"}</button><button type="button" onClick={reset} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold dark:border-white/10"><X size={14}/> Clear form</button></div>
      </form>
      <div className="mt-6"><div className="mb-3 flex items-center justify-between gap-3"><h3 className="font-black">Saved banners ({records.length})</h3><span className="text-xs text-slate-500">Only published + enabled + active dates are shown to visitors.</span></div>
        {loading ? <div className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500"><LoaderCircle size={17} className="animate-spin"/> Loading banners…</div> : records.length ? <div className="divide-y divide-slate-200 dark:divide-white/10">{records.map((record) => <article key={record.id} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"><img src={record.image_url} alt="" className="h-20 w-32 shrink-0 rounded-xl border border-slate-200 bg-slate-50 object-contain dark:border-white/10 dark:bg-slate-900"/><div className="min-w-0 flex-1"><h4 className="font-black">{record.title}</h4><p className="mt-1 text-xs text-slate-500">/{record.id} · Priority {record.sort_order}</p><div className="mt-2 flex flex-wrap gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${record.status === "published" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200" : record.status === "archived" ? "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300" : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"}`}>{record.status}</span><span className={`rounded-full px-2.5 py-1 text-[10px] font-black ${record.enabled ? "bg-indigo-100 text-indigo-800 dark:bg-indigo-500/15 dark:text-indigo-200" : "bg-slate-100 text-slate-500 dark:bg-white/10 dark:text-slate-400"}`}>{record.enabled ? "Enabled" : "Disabled"}</span></div></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => edit(record)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-bold dark:border-white/10"><Pencil size={14}/> Edit</button><button type="button" onClick={() => void remove(record)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-400/20 dark:text-rose-200"><Trash2 size={14}/> Delete</button></div></article>)}</div> : <p className="rounded-xl border border-dashed border-slate-300 p-6 text-center text-sm text-slate-500 dark:border-white/10">No banners yet. Create your first welcome popup above.</p>}
      </div>
    </section>
  );
}
