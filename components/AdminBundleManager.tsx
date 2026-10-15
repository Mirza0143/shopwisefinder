"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { ArrowDownToLine, CheckCircle2, CloudUpload, FileSpreadsheet, Layers3, LoaderCircle, Pencil, Plus, RefreshCw, Save, Trash2, X } from "lucide-react";
import type { Product } from "@/types/product";
import type { CuratedBundle } from "@/data/bundles";

type Status = "draft" | "published" | "archived";
type RecordItem = { bundle: CuratedBundle; status: Status; source: "static" | "database"; builtIn: boolean; updatedAt: string | null };
type ProductOption = { product: Product; status: "published" };
type Props = { products: ProductOption[]; textInput: string };
type FormState = { slug: string; title: string; description: string; category: CuratedBundle["category"]; status: "draft" | "published"; sortOrder: string };
type CsvState = { fileName: string; csv: string; headers: string[]; rows: string[][]; errors: string[] };
const bundleCategories: Array<{ value: CuratedBundle["category"]; label: string }> = [
  { value: "mobile-gaming", label: "Mobile gaming" }, { value: "gaming", label: "Gaming setup" }, { value: "fashion", label: "Fashion & footwear" }, { value: "desk", label: "Desk / workstation" }, { value: "everyday", label: "Everyday essentials" },
];
const csvHeaders = ["slug", "title", "description", "category", "productSlugs", "status", "sortOrder"];
const freshForm = (): FormState => ({ slug: "", title: "", description: "", category: "everyday", status: "draft", sortOrder: "100" });
function slugify(value: string) { return value.normalize("NFKD").toLowerCase().trim().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90); }
function parseCsv(text: string): string[][] {
  const rows: string[][] = []; let row: string[] = []; let cell = ""; let quoted = false; const input = text.replace(/^\uFEFF/, "");
  for (let i = 0; i < input.length; i++) { const char = input[i]; if (quoted) { if (char === '"' && input[i + 1] === '"') { cell += '"'; i++; } else if (char === '"') quoted = false; else cell += char; } else if (char === '"' && cell.length === 0) quoted = true; else if (char === ",") { row.push(cell.trim()); cell = ""; } else if (char === "\n") { row.push(cell.trim().replace(/\r$/, "")); if (row.some(Boolean)) rows.push(row); row = []; cell = ""; } else cell += char; }
  if (quoted) throw new Error("CSV has an unclosed quoted field."); row.push(cell.trim().replace(/\r$/, "")); if (row.some(Boolean)) rows.push(row); return rows;
}
function norm(value: string) { return value.toLowerCase().replace(/[^a-z0-9]/g, ""); }

export default function AdminBundleManager({ products, textInput }: Props) {
  const [records, setRecords] = useState<RecordItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [notice, setNotice] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [form, setForm] = useState<FormState>(freshForm);
  const [selectedSlugs, setSelectedSlugs] = useState<string[]>([]);
  const [editing, setEditing] = useState<RecordItem | null>(null);
  const [saving, setSaving] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"all" | Status>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [importFile, setImportFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvState | null>(null);
  const [csvDefaultStatus, setCsvDefaultStatus] = useState<"draft" | "published">("draft");
  const [importing, setImporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setLoadError("");
    try {
      const response = await fetch("/api/admin/bundles", { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as { records?: RecordItem[]; error?: string };
      if (response.status === 401) { window.location.assign("/admin/login"); return; }
      if (!response.ok) throw new Error(payload.error || "Could not load bundles.");
      setRecords(payload.records || []);
    } catch (error) { setLoadError(error instanceof Error ? error.message : "Could not load bundles."); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  const filtered = useMemo(() => records.filter((record) => (statusFilter === "all" || record.status === statusFilter) && (categoryFilter === "all" || record.bundle.category === categoryFilter)).sort((a, b) => {
    const ao = Number(a.bundle.sortOrder) > 0 ? Number(a.bundle.sortOrder) : Number.MAX_SAFE_INTEGER;
    const bo = Number(b.bundle.sortOrder) > 0 ? Number(b.bundle.sortOrder) : Number.MAX_SAFE_INTEGER;
    return ao - bo || a.bundle.title.localeCompare(b.bundle.title);
  }), [records, statusFilter, categoryFilter]);

  function resetForm() { setForm(freshForm()); setSelectedSlugs([]); setEditing(null); }
  function startEdit(record: RecordItem) {
    setEditing(record);
    setForm({ slug: record.bundle.id, title: record.bundle.title, description: record.bundle.description, category: record.bundle.category, status: record.status === "published" ? "published" : "draft", sortOrder: String(record.bundle.sortOrder || 100) });
    setSelectedSlugs(record.bundle.bundle_items.map((item) => item.reviewSlug || "").filter((slug) => products.some((product) => product.product.slug === slug)));
    setNotice(null);
    document.getElementById("bundle-editor")?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  async function save(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(null);
    if (new Set(selectedSlugs).size < 2) { setNotice({ kind: "error", text: "Select at least two published products for a bundle." }); return; }
    setSaving(true);
    try {
      const payload = { bundle: { ...form, slug: editing ? form.slug : slugify(form.title), productSlugs: [...new Set(selectedSlugs)], sortOrder: Number(form.sortOrder) } };
      const response = await fetch("/api/admin/bundles", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify(payload) });
      const result = await response.json().catch(() => ({})) as { error?: string; status?: string };
      if (response.status === 401) { window.location.assign("/admin/login"); return; }
      if (!response.ok) throw new Error(result.error || "Could not save bundle.");
      setNotice({ kind: "success", text: `${form.title} saved as ${result.status || form.status}.` }); resetForm(); await load();
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "Could not save bundle." }); }
    finally { setSaving(false); }
  }

  async function remove(record: RecordItem) {
    const action = record.builtIn ? "archive/hide this built-in bundle" : "delete this custom bundle";
    if (!window.confirm(`Are you sure you want to ${action}?\n\n${record.bundle.title}`)) return;
    setNotice(null);
    try {
      const response = await fetch("/api/admin/bundles", { method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ slug: record.bundle.id }) });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (response.status === 401) { window.location.assign("/admin/login"); return; }
      if (!response.ok) throw new Error(payload.error || "Could not remove bundle.");
      setNotice({ kind: "success", text: record.builtIn ? "Built-in bundle archived; source file remains unchanged." : "Bundle deleted." });
      if (editing?.bundle.id === record.bundle.id) resetForm();
      await load();
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "Could not remove bundle." }); }
  }

  function downloadTemplate() {
    const blob = new Blob([`${csvHeaders.join(",")}\r\n`], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob); const anchor = document.createElement("a"); anchor.href = url; anchor.download = "shopwisefinder-bundles-template.csv"; anchor.click(); URL.revokeObjectURL(url);
  }

  async function previewCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setNotice(null);
    if (!importFile) { setNotice({ kind: "error", text: "Choose a bundle CSV first." }); return; }
    if (importFile.size > 2 * 1024 * 1024) { setNotice({ kind: "error", text: "CSV must be 2 MB or smaller." }); return; }
    try {
      const csv = await importFile.text(); const rows = parseCsv(csv);
      if (rows.length < 2 || rows.length > 101) throw new Error("Provide between 1 and 100 bundle rows.");
      const headers = rows[0]; const headerSet = new Set(headers.map(norm));
      const missing = ["title", "description", "category", "productSlugs"].filter((value) => !headerSet.has(norm(value)));
      const dataRows = rows.slice(1); const seen = new Set<string>(); const duplicate: string[] = [];
      const get = (row: string[], name: string) => { const i = headers.findIndex((item) => norm(item) === norm(name)); return i < 0 ? "" : row[i] || ""; };
      dataRows.forEach((row, i) => { const slug = slugify(get(row, "slug") || get(row, "title")); if (slug && seen.has(slug)) duplicate.push(`row ${i + 2}: ${slug}`); if (slug) seen.add(slug); });
      const errors = [...missing.map((name) => `Missing column: ${name}`), ...duplicate];
      setCsvPreview({ fileName: importFile.name, csv, headers, rows: dataRows, errors });
      setNotice(errors.length ? { kind: "error", text: `Fix the CSV preview errors: ${errors.join("; ")}` } : { kind: "success", text: `Preview ready for ${dataRows.length} bundle(s). Nothing saved yet.` });
    } catch (error) { setCsvPreview(null); setNotice({ kind: "error", text: error instanceof Error ? error.message : "Could not preview bundle CSV." }); }
  }

  async function importCsv() {
    if (!csvPreview || csvPreview.errors.length) return;
    setImporting(true); setNotice(null);
    try {
      const response = await fetch("/api/admin/bundles/import", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ csv: csvPreview.csv, defaultStatus: csvDefaultStatus }) });
      const payload = await response.json().catch(() => ({})) as { error?: string; message?: string; errors?: Array<{ row: number; error: string }>; imported?: number };
      if (response.status === 401) { window.location.assign("/admin/login"); return; }
      if (!response.ok || payload.errors?.length) throw new Error([payload.message, payload.error, ...(payload.errors || []).map((item) => `Row ${item.row}: ${item.error}`)].filter(Boolean).join("\n") || "Bundle import failed.");
      setNotice({ kind: "success", text: payload.message || `${payload.imported || 0} bundle(s) imported.` }); setImportFile(null); setCsvPreview(null); const input = document.getElementById("bundle-csv-file") as HTMLInputElement | null; if (input) input.value = ""; await load();
    } catch (error) { setNotice({ kind: "error", text: error instanceof Error ? error.message : "Bundle import failed." }); }
    finally { setImporting(false); }
  }

  return (
    <section className="mb-8 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950 sm:p-7">
      <header className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.17em] text-indigo-600 dark:text-indigo-300"><Layers3 size={15}/> Curated bundles</p><h2 className="mt-2 text-2xl font-black">Create and import product bundles</h2><p className="mt-1 max-w-3xl text-sm leading-6 text-slate-600 dark:text-slate-300">Choose two or more published products, assign a bundle category and order, then save as Draft or Published. Bundles display on the public /bundles page only when published.</p></div><button type="button" onClick={() => void load()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3.5 text-sm font-bold dark:border-white/10"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/> Refresh bundles</button></header>
      {notice && <div role="status" className={`mb-5 whitespace-pre-line rounded-xl border p-3 text-sm ${notice.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100" : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-100"}`}>{notice.text}</div>}
      {loadError && <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-900 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-100"><strong>Bundle database setup needed.</strong><p className="mt-1">{loadError}</p><p className="mt-1">Run <code>supabase/admin-bundles-support-toggles-v4.sql</code> in the same Supabase project SQL Editor, then refresh. This repair migration creates the missing bundle table (if v2 was skipped) and adds support channel toggles safely.</p></div>}

      <div id="bundle-editor" className="rounded-2xl border border-slate-200 p-4 dark:border-white/10 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3"><div><h3 className="text-lg font-black">{editing ? "Edit bundle" : "New bundle"}</h3><p className="mt-1 text-sm text-slate-500">Products must already be published to be selectable.</p></div>{editing && <button type="button" onClick={resetForm} className="inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-xs font-bold dark:border-white/10"><X size={13}/> Cancel</button>}</div>
        <form onSubmit={save} className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm font-bold">Bundle title *<input required maxLength={180} value={form.title} onChange={(event) => setForm((old) => ({ ...old, title: event.target.value, ...(editing ? {} : { slug: slugify(event.target.value) }) }))} className={textInput} placeholder="Everyday audio kit" /></label>
            <label className="block text-sm font-bold">Bundle slug *<input required maxLength={90} value={editing ? form.slug : slugify(form.title)} onChange={(event) => setForm((old) => ({ ...old, slug: slugify(event.target.value) }))} className={textInput} placeholder="everyday-audio-kit" /></label>
            <label className="block text-sm font-bold">Category *<select value={form.category} onChange={(event) => setForm((old) => ({ ...old, category: event.target.value as FormState["category"] }))} className={textInput}>{bundleCategories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></label>
            <label className="block text-sm font-bold">Display order *<input required type="number" min="1" max="1000000" step="1" value={form.sortOrder} onChange={(event) => setForm((old) => ({ ...old, sortOrder: event.target.value }))} className={textInput} /><span className="mt-1 block text-xs font-normal text-slate-500">1 shows first; 2 follows it.</span></label>
            <label className="block text-sm font-bold">Status *<select value={form.status} onChange={(event) => setForm((old) => ({ ...old, status: event.target.value as FormState["status"] }))} className={textInput}><option value="draft">Draft — hidden</option><option value="published">Published — visible</option></select></label>
            <label className="block text-sm font-bold md:col-span-2 lg:col-span-1">Bundle description *<textarea required maxLength={1500} value={form.description} onChange={(event) => setForm((old) => ({ ...old, description: event.target.value }))} className={`${textInput} min-h-20 resize-y`} placeholder="Explain how these products work together." /></label>
          </div>
          <fieldset className="rounded-xl border border-indigo-200 p-3 dark:border-indigo-400/20"><legend className="px-2 text-sm font-black">Select products for this bundle * ({selectedSlugs.length} selected)</legend>{products.length ? <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{products.map(({ product }) => <label key={product.slug} className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 text-sm hover:border-indigo-300 dark:border-white/10"><input type="checkbox" checked={selectedSlugs.includes(product.slug)} onChange={(event) => setSelectedSlugs((old) => event.target.checked ? [...old, product.slug] : old.filter((slug) => slug !== product.slug))} className="mt-1 h-4 w-4 accent-indigo-600"/><img src={product.image} alt="" className="h-12 w-12 rounded-lg bg-slate-100 object-contain"/><span className="min-w-0"><strong className="block line-clamp-2">{product.title}</strong><span className="mt-1 block text-xs text-slate-500">{product.category} · INR {Number(product.price).toLocaleString()}</span></span></label>)}</div> : <p className="p-4 text-sm text-slate-500">No published products are available. Publish at least two products before creating a bundle.</p>}</fieldset>
          <button type="submit" disabled={saving || selectedSlugs.length < 2} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white disabled:opacity-50">{saving ? <LoaderCircle size={16} className="animate-spin"/> : <Save size={16}/>} {saving ? "Saving…" : form.status === "published" ? "Save & publish bundle" : "Save bundle as draft"}</button>
        </form>
      </div>

      <div className="mt-7 rounded-2xl border border-slate-200 p-4 dark:border-white/10 sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-lg font-black">Bulk bundle import</h3><p className="mt-1 text-sm text-slate-500">CSV column <code>productSlugs</code> accepts 2+ published product slugs separated by <code>|</code>.</p></div><button type="button" onClick={downloadTemplate} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 px-3 text-sm font-bold dark:border-white/10"><ArrowDownToLine size={15}/> Download CSV template</button></div>
        <form onSubmit={previewCsv} className="grid gap-3 md:grid-cols-[minmax(0,1fr)_210px_auto] md:items-end"><label className="block text-sm font-bold">Bundle CSV<input id="bundle-csv-file" required type="file" accept=".csv,text/csv" onChange={(event: ChangeEvent<HTMLInputElement>) => { setImportFile(event.target.files?.[0] || null); setCsvPreview(null); }} className="mt-1.5 block min-h-11 w-full rounded-xl border border-slate-300 bg-white p-2 text-sm dark:border-white/10 dark:bg-slate-900"/><span className="mt-1 block text-xs font-normal text-slate-500">Max 2 MB · up to 100 bundles</span></label><label className="block text-sm font-bold">Default status<select value={csvDefaultStatus} onChange={(event) => setCsvDefaultStatus(event.target.value as "draft" | "published")} className={textInput}><option value="draft">Draft</option><option value="published">Published</option></select></label><button type="submit" disabled={!importFile || importing} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 text-sm font-black text-white disabled:opacity-50 dark:bg-indigo-500"><FileSpreadsheet size={16}/> Preview CSV</button></form>
        {csvPreview && <div className="mt-4 rounded-xl border border-indigo-200 bg-indigo-50/50 p-4 dark:border-indigo-400/20 dark:bg-indigo-500/[.06]"><p className="font-black">{csvPreview.fileName} · {csvPreview.rows.length} bundle row(s)</p>{csvPreview.errors.length > 0 && <ul className="mt-2 list-disc pl-5 text-sm text-rose-700 dark:text-rose-200">{csvPreview.errors.map((error) => <li key={error}>{error}</li>)}</ul>}<div className="mt-3 overflow-x-auto"><table className="w-full min-w-[500px] text-left text-xs"><thead><tr>{["Title", "Category", "Product slugs"].map((value) => <th key={value} className="p-2">{value}</th>)}</tr></thead><tbody>{csvPreview.rows.slice(0, 5).map((row, index) => { const get = (name: string) => { const col = csvPreview.headers.findIndex((header) => norm(header) === norm(name)); return col >= 0 ? row[col] || "" : ""; }; return <tr key={index} className="border-t border-slate-200 dark:border-white/10"><td className="p-2">{get("title") || "—"}</td><td className="p-2">{get("category") || "—"}</td><td className="p-2">{get("productSlugs") || "—"}</td></tr>; })}</tbody></table></div><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={() => void importCsv()} disabled={importing || csvPreview.errors.length > 0} className="inline-flex min-h-10 items-center gap-2 rounded-lg bg-indigo-600 px-3.5 text-sm font-bold text-white disabled:opacity-50">{importing ? <LoaderCircle size={15} className="animate-spin"/> : <CloudUpload size={15}/>} Confirm import</button><button type="button" onClick={() => setCsvPreview(null)} className="inline-flex min-h-10 items-center gap-2 rounded-lg border px-3.5 text-sm font-bold dark:border-white/10"><X size={15}/> Cancel</button></div></div>}
      </div>

      <div className="mt-7"><div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h3 className="text-lg font-black">Bundle catalogue ({filtered.length})</h3><p className="mt-1 text-sm text-slate-500">Edit or delete custom bundles. Built-in bundles are archived instead of removed from source.</p></div><div className="grid grid-cols-2 gap-2"><select aria-label="Filter bundles by status" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className={textInput}><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select><select aria-label="Filter bundles by category" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={textInput}><option value="all">All categories</option>{bundleCategories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}</select></div></div>
        {loading ? <p className="py-8 text-sm text-slate-500">Loading bundles…</p> : filtered.length ? <div className="divide-y divide-slate-200 dark:divide-white/10">{filtered.map((record) => <article key={`${record.bundle.id}-${record.source}`} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"><img src={record.bundle.bundle_items[0]?.image || ""} alt="" className="h-16 w-16 rounded-xl bg-slate-100 object-contain"/><div className="min-w-0 flex-1"><strong className="block">{record.bundle.title}</strong><p className="mt-1 text-xs text-slate-500">{record.bundle.category} · {record.bundle.bundle_items.length} products · order {record.bundle.sortOrder || "default"}</p><div className="mt-2 flex flex-wrap gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${record.status === "published" ? "bg-emerald-100 text-emerald-800" : record.status === "archived" ? "bg-slate-200 text-slate-700" : "bg-amber-100 text-amber-800"}`}>{record.status}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600">{record.source === "static" ? "Built-in" : "Database"}</span></div></div><div className="flex gap-2"><button type="button" onClick={() => startEdit(record)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-bold dark:border-white/10"><Pencil size={14}/> Edit</button><button type="button" onClick={() => void remove(record)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-700 dark:border-rose-400/20 dark:text-rose-200"><Trash2 size={14}/> {record.builtIn ? "Archive" : "Delete"}</button></div></article>)}</div> : <p className="py-8 text-center text-sm text-slate-500">No bundles match these filters.</p>}
      </div>
    </section>
  );
}
