"use client";

import { ChangeEvent, FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { AlertCircle, ArrowDownToLine, BarChart3, CheckCircle2, CirclePlus, CloudUpload, ExternalLink, FileSpreadsheet, ImagePlus, LoaderCircle, LogOut, LifeBuoy, Megaphone, Package, Pencil, RefreshCw, Save, Search, ShieldCheck, Trash2, UploadCloud, X } from "lucide-react";
import type { Product } from "@/types/product";
import { getYouTubeEmbedUrl } from "@/lib/youtube";
import AdminBundleManager from "@/components/AdminBundleManager";
import AdminKpiReport from "@/components/AdminKpiReport";
import AdminBannerManager from "@/components/AdminBannerManager";
import AdminUserSupport from "@/components/AdminUserSupport";
import AdminSecuritySettings from "@/components/AdminSecuritySettings";

type RecordStatus = "draft" | "published" | "archived";
type AdminRecord = { product: Product; status: RecordStatus; source: "static" | "database"; builtIn: boolean; updatedAt: string | null };
type FormValues = {
  slug: string; title: string; brand: string; category: string; description: string; amazonUrl: string; asin: string;
  price: string; originalPrice: string; currency: string; image1: string; image2: string; image3: string;
  pros: string; cons: string; specs: string; status: "draft" | "published"; priceVerified: boolean;
  rating: string; reviewCount: string; ratingChecked: boolean; displayOrder: string; videoUrl: string;
  featured: boolean; trending: boolean; editorChoice: boolean; isDemoData: boolean;
};
type CsvPreviewState = { fileName: string; csv: string; headers: string[]; rows: string[][]; missingRequired: string[]; duplicateSlugs: number[] };

const categories = ["Phones", "Fashion & Footwear", "Shoes", "Mobile Accessories", "Everyday Essentials", "Audio", "Grooming", "PCs", "Monitors", "Keyboards", "Office", "Home & Kitchen", "Sports & Outdoors", "Accessories", "Other"];
const CSV_HEADERS = ["slug", "title", "brand", "category", "description", "amazonUrl", "asin", "price", "originalPrice", "currency", "image1", "image2", "image3", "pros", "cons", "specsJson", "status", "priceVerified", "rating", "reviewCount", "ratingChecked", "displayOrder", "videoUrl", "featured", "trending", "editorChoice", "isDemoData"];

function emptyForm(): FormValues {
  return { slug: "", title: "", brand: "", category: "Phones", description: "", amazonUrl: "", asin: "", price: "", originalPrice: "", currency: "INR", image1: "", image2: "", image3: "", pros: "", cons: "", specs: "{}", status: "draft", priceVerified: false, rating: "", reviewCount: "", ratingChecked: false, displayOrder: "", videoUrl: "", featured: false, trending: false, editorChoice: false, isDemoData: false };
}
function slugify(title: string) { return title.normalize("NFKD").toLowerCase().trim().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90); }
function productToForm(record: AdminRecord): FormValues {
  const p = record.product;
  const images = (p.images?.length ? p.images : [p.image]).slice(0, 3);
  return {
    slug: p.slug, title: p.title, brand: p.brand, category: p.category === "Other" ? "" : p.category, description: p.description,
    amazonUrl: p.amazonUrl || "", asin: p.asin || "", price: String(p.price ?? ""), originalPrice: String(p.originalPrice ?? p.price ?? ""), currency: p.currency || "INR",
    image1: images[0] || p.image || "", image2: images[1] || "", image3: images[2] || "",
    pros: (p.pros || []).join("\n"), cons: (p.cons || []).join("\n"), specs: JSON.stringify(p.specs || {}, null, 2),
    status: record.status === "published" ? "published" : "draft", priceVerified: p.priceSource === "manual_verified", rating: p.rating > 0 ? String(p.rating) : "", reviewCount: p.reviewCount > 0 ? String(p.reviewCount) : "", ratingChecked: p.ratingSource === "manual_checked", displayOrder: p.displayOrder ? String(p.displayOrder) : "", videoUrl: p.videoUrl || "", featured: Boolean(p.featured), trending: Boolean(p.trending), editorChoice: Boolean(p.editorChoice), isDemoData: Boolean(p.isDemoData),
  };
}
function normalizeCsvHeader(value: string) { return value.toLowerCase().replace(/[^a-z0-9]/g, ""); }
function parseCsvPreview(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;
  const input = text.replace(/^\uFEFF/, "");
  for (let index = 0; index < input.length; index++) {
    const char = input[index];
    if (quoted) {
      if (char === '"' && input[index + 1] === '"') { cell += '"'; index++; }
      else if (char === '"') quoted = false;
      else cell += char;
    } else if (char === '"' && cell.length === 0) quoted = true;
    else if (char === ",") { row.push(cell.trim()); cell = ""; }
    else if (char === "\n") { row.push(cell.trim().replace(/\r$/, "")); if (row.some((value) => value.length)) rows.push(row); row = []; cell = ""; }
    else cell += char;
  }
  if (quoted) throw new Error("CSV contains an unclosed quote. Re-export it from Excel or Google Sheets as CSV.");
  row.push(cell.trim().replace(/\r$/, ""));
  if (row.some((value) => value.length)) rows.push(row);
  return rows;
}
function previewCell(headers: string[], row: string[], name: string) {
  const target = normalizeCsvHeader(name);
  const index = headers.findIndex((header) => normalizeCsvHeader(header) === target);
  return index >= 0 ? row[index] || "" : "";
}

export default function AdminDashboard() {
  const [records, setRecords] = useState<AdminRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState("");
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | RecordStatus>("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [form, setForm] = useState<FormValues>(emptyForm);
  const [editingSource, setEditingSource] = useState<AdminRecord | null>(null);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: "success" | "error"; text: string } | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [csvPreview, setCsvPreview] = useState<CsvPreviewState | null>(null);
  const [defaultImportStatus, setDefaultImportStatus] = useState<"draft" | "published">("draft");
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<{ imported: number; errors: Array<{ row: number; error: string }>; message: string } | null>(null);

  const loadRecords = useCallback(async () => {
    setLoading(true);
    setLoadError("");
    try {
      const response = await fetch("/api/admin/products", { cache: "no-store", credentials: "same-origin" });
      const payload = await response.json().catch(() => ({})) as { records?: AdminRecord[]; error?: string };
      if (response.status === 401) { window.location.assign("/admin/login"); return; }
      if (!response.ok) throw new Error(payload.error || "Could not load products.");
      setRecords(payload.records || []);
    } catch (error) {
      setLoadError(error instanceof Error ? error.message : "Could not load products.");
    } finally { setLoading(false); }
  }, []);

  useEffect(() => { void loadRecords(); }, [loadRecords]);

  const filteredRecords = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return records.filter((record) => {
      const matchesQuery = !needle || [record.product.title, record.product.brand, record.product.category, record.product.slug, record.product.asin].some((value) => String(value || "").toLowerCase().includes(needle));
      const matchesStatus = statusFilter === "all" || record.status === statusFilter;
      const matchesCategory = categoryFilter === "all" || record.product.category === categoryFilter;
      return matchesQuery && matchesStatus && matchesCategory;
    }).sort((a, b) => {
      const orderA = Number(a.product.displayOrder) > 0 ? Number(a.product.displayOrder) : Number.MAX_SAFE_INTEGER;
      const orderB = Number(b.product.displayOrder) > 0 ? Number(b.product.displayOrder) : Number.MAX_SAFE_INTEGER;
      return orderA - orderB || a.product.title.localeCompare(b.product.title);
    });
  }, [records, query, statusFilter, categoryFilter]);

  function update<K extends keyof FormValues>(key: K, value: FormValues[K]) { setForm((current) => ({ ...current, [key]: value })); }
  function startNew() { setEditingSource(null); setForm(emptyForm()); setMessage(null); document.getElementById("product-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }); }
  function startEdit(record: AdminRecord) { setEditingSource(record); setForm(productToForm(record)); setMessage(null); document.getElementById("product-editor")?.scrollIntoView({ behavior: "smooth", block: "start" }); }

  async function saveProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    if (!form.image1.trim() || !form.image2.trim() || !form.image3.trim()) { setMessage({ kind: "error", text: "Enter all three image URLs. Use three different photos of this exact product." }); return; }
    let specs: Record<string, string>;
    try {
      const parsed = JSON.parse(form.specs || "{}");
      if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error();
      specs = parsed as Record<string, string>;
    } catch { setMessage({ kind: "error", text: 'Specifications must be valid JSON, for example: {"Battery":"5000 mAh"}.' }); return; }
    const titleSlug = editingSource ? form.slug : slugify(form.title);
    if (!titleSlug) { setMessage({ kind: "error", text: "Enter a product name so a URL slug can be created." }); return; }
    const product = {
      ...(editingSource?.product || {}),
      id: editingSource?.product.id || `swf-${titleSlug}`,
      slug: titleSlug,
      title: form.title, brand: form.brand, category: form.category, description: form.description,
      amazonUrl: form.amazonUrl, asin: form.asin, price: Number(form.price), originalPrice: form.originalPrice ? Number(form.originalPrice) : Number(form.price), currency: form.currency,
      image: form.image1.trim(), images: [form.image1.trim(), form.image2.trim(), form.image3.trim()],
      pros: form.pros.split(/\r?\n/).map((value) => value.trim()).filter(Boolean),
      cons: form.cons.split(/\r?\n/).map((value) => value.trim()).filter(Boolean), specs,
      featured: form.featured, trending: form.trending, editorChoice: form.editorChoice,
      priceVerified: form.priceVerified, isDemoData: form.isDemoData,
      rating: form.rating === "" ? 0 : Number(form.rating), reviewCount: form.reviewCount === "" ? 0 : Number(form.reviewCount), ratingChecked: form.ratingChecked,
      displayOrder: form.displayOrder === "" ? null : Number(form.displayOrder), videoUrl: form.videoUrl.trim() || undefined,
    };
    setSaving(true);
    try {
      const response = await fetch("/api/admin/products", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ product, status: form.status }) });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (response.status === 401) { window.location.assign("/admin/login"); return; }
      if (!response.ok) throw new Error(payload.error || "Could not save product.");
      setMessage({ kind: "success", text: `${form.title} saved as ${form.status}.` });
      setEditingSource(null);
      setForm(emptyForm());
      await loadRecords();
    } catch (error) {
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not save product." });
    } finally { setSaving(false); }
  }

  async function deleteProduct(record: AdminRecord) {
    const label = record.builtIn ? "This product is part of the built-in catalogue. It will be archived/hidden, not physically deleted from the source file." : "This database product will be deleted.";
    if (!window.confirm(`Remove ${record.product.title}?\n\n${label}`)) return;
    setMessage(null);
    try {
      const response = await fetch("/api/admin/products", { method: "DELETE", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ slug: record.product.slug }) });
      const payload = await response.json().catch(() => ({})) as { error?: string };
      if (response.status === 401) { window.location.assign("/admin/login"); return; }
      if (!response.ok) throw new Error(payload.error || "Could not remove product.");
      if (editingSource?.product.slug === record.product.slug) { setEditingSource(null); setForm(emptyForm()); }
      setMessage({ kind: "success", text: record.builtIn ? "Product archived. The source file was not changed." : "Product removed from the database." });
      await loadRecords();
    } catch (error) { setMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not remove product." }); }
  }

  async function previewCsv(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setMessage(null);
    setImportResult(null);
    if (!csvFile) { setMessage({ kind: "error", text: "Choose a CSV file first." }); return; }
    if (csvFile.size > 2 * 1024 * 1024) { setMessage({ kind: "error", text: "CSV files must be 2 MB or smaller." }); return; }
    try {
      const csv = await csvFile.text();
      const parsed = parseCsvPreview(csv);
      if (parsed.length < 2) throw new Error("CSV must contain a header row and at least one product row.");
      if (parsed.length - 1 > 200) throw new Error("Import at most 200 products per file.");
      const headers = parsed[0];
      const dataRows = parsed.slice(1);
      const present = new Set(headers.map(normalizeCsvHeader));
      const required = ["title", "brand", "category", "description", "amazonUrl", "price", "image1", "image2", "image3"];
      const missingRequired = required.filter((header) => !present.has(normalizeCsvHeader(header)));
      const seen = new Set<string>();
      const duplicateSlugs: number[] = [];
      dataRows.forEach((row, index) => {
        const explicit = previewCell(headers, row, "slug");
        const title = previewCell(headers, row, "title") || previewCell(headers, row, "productName");
        const slug = slugify(explicit || title);
        if (slug && seen.has(slug)) duplicateSlugs.push(index + 2);
        if (slug) seen.add(slug);
      });
      setCsvPreview({ fileName: csvFile.name, csv, headers, rows: dataRows, missingRequired, duplicateSlugs });
      if (missingRequired.length) setMessage({ kind: "error", text: `Missing required CSV columns: ${missingRequired.join(", ")}. Download the template and fix the header row.` });
      else if (duplicateSlugs.length) setMessage({ kind: "error", text: `Duplicate product slugs detected on CSV rows ${duplicateSlugs.join(", ")}. Fix these rows before import.` });
      else setMessage({ kind: "success", text: `Preview ready for ${dataRows.length} product row(s). Nothing has been saved yet.` });
    } catch (error) {
      setCsvPreview(null);
      setMessage({ kind: "error", text: error instanceof Error ? error.message : "Could not read the CSV file." });
    }
  }

  async function confirmImport() {
    if (!csvPreview) return;
    if (csvPreview.missingRequired.length || csvPreview.duplicateSlugs.length) {
      setMessage({ kind: "error", text: "Fix the CSV preview issues before confirming the import." });
      return;
    }
    setImporting(true); setImportResult(null); setMessage(null);
    try {
      const response = await fetch("/api/admin/import", { method: "POST", headers: { "Content-Type": "application/json" }, credentials: "same-origin", body: JSON.stringify({ csv: csvPreview.csv, defaultStatus: defaultImportStatus }) });
      const payload = await response.json().catch(() => ({})) as { error?: string; imported?: number; errors?: Array<{ row: number; error: string }>; message?: string };
      if (response.status === 401) { window.location.assign("/admin/login"); return; }
      if (payload.errors?.length) {
        const result = { imported: payload.imported || 0, errors: payload.errors, message: payload.message || "CSV validation failed; no rows were imported." };
        setImportResult(result);
        setMessage({ kind: "error", text: result.message });
        return;
      }
      if (!response.ok) throw new Error(payload.error || "Bulk import failed.");
      const result = { imported: payload.imported || 0, errors: [], message: payload.message || "Import completed." };
      setImportResult(result);
      setMessage({ kind: "success", text: result.message });
      setCsvFile(null);
      setCsvPreview(null);
      const input = document.getElementById("bulk-csv-file") as HTMLInputElement | null;
      if (input) input.value = "";
      await loadRecords();
    } catch (error) { setMessage({ kind: "error", text: error instanceof Error ? error.message : "Bulk import failed." }); }
    finally { setImporting(false); }
  }

  function downloadTemplate() {
    const csv = `${CSV_HEADERS.join(",")}\r\n`;
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = "shopwisefinder-products-template.csv"; anchor.click(); URL.revokeObjectURL(url);
  }

  async function logout() {
    await fetch("/api/admin/auth/logout", { method: "POST", credentials: "same-origin" }).catch(() => undefined);
    window.location.assign("/admin/login");
  }

  const textInput = "mt-1.5 min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 dark:border-white/15 dark:bg-slate-900 dark:text-white";
  const textArea = `${textInput} min-h-24 resize-y`;

  return (
    <main className="mx-auto min-h-screen max-w-7xl px-4 py-8 sm:px-6 lg:px-8 lg:py-12">
      <header className="mb-8 flex flex-col gap-4 border-b border-slate-200 pb-6 dark:border-white/10 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-indigo-600 text-white"><Package size={23}/></div><div><p className="text-xs font-black uppercase tracking-[.18em] text-indigo-600 dark:text-indigo-300">ShopWiseFinder</p><h1 className="mt-1 text-3xl font-black tracking-tight sm:text-4xl">Product manager</h1><p className="mt-2 text-sm text-slate-600 dark:text-slate-300">Private workspace · Add one product or import a CSV batch.</p></div></div>
        <div className="flex flex-wrap gap-2"><a href="/" target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-bold dark:border-white/10 dark:bg-white/5"><ExternalLink size={15}/> View site</a><button onClick={() => void loadRecords()} disabled={loading} className="inline-flex min-h-10 items-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 text-sm font-bold disabled:opacity-60 dark:border-white/10 dark:bg-white/5"><RefreshCw size={15} className={loading ? "animate-spin" : ""}/> Refresh</button><button onClick={() => void logout()} className="inline-flex min-h-10 items-center gap-2 rounded-xl bg-slate-950 px-3.5 text-sm font-bold text-white dark:bg-indigo-500"><LogOut size={15}/> Sign out</button></div>
      </header>

      <nav aria-label="Admin tools" className="mb-8 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        <a href="#kpi-report" className="group inline-flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950"><BarChart3 size={19} className="text-indigo-600 dark:text-indigo-300"/><span className="flex-1">KPI Report</span><span aria-hidden="true" className="text-slate-400 transition group-hover:translate-x-1">→</span></a>
        <a href="#admin-import" className="group inline-flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950"><UploadCloud size={19} className="text-indigo-600 dark:text-indigo-300"/><span className="flex-1">Import Items</span><span aria-hidden="true" className="text-slate-400 transition group-hover:translate-x-1">→</span></a>
        <a href="#banner-manager" className="group inline-flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950"><Megaphone size={19} className="text-indigo-600 dark:text-indigo-300"/><span className="flex-1">Banners</span><span aria-hidden="true" className="text-slate-400 transition group-hover:translate-x-1">→</span></a>
        <a href="#user-support" className="group inline-flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950"><LifeBuoy size={19} className="text-indigo-600 dark:text-indigo-300"/><span className="flex-1">User Support</span><span aria-hidden="true" className="text-slate-400 transition group-hover:translate-x-1">→</span></a>
        <a href="#admin-security" className="group inline-flex min-h-14 items-center gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-extrabold shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:shadow-md dark:border-white/10 dark:bg-slate-950"><ShieldCheck size={19} className="text-indigo-600 dark:text-indigo-300"/><span className="flex-1">Admin Security</span><span aria-hidden="true" className="text-slate-400 transition group-hover:translate-x-1">→</span></a>
      </nav>

      <AdminKpiReport />

      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total catalog rows</p><p className="mt-2 text-3xl font-black">{records.length}</p></div>
        <div className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-white/10 dark:bg-slate-950"><p className="text-xs font-bold uppercase tracking-wide text-slate-500">Published status</p><p className="mt-2 text-3xl font-black">{records.filter((row) => row.status === "published").length}</p></div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 dark:border-amber-400/20 dark:bg-amber-500/10"><p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-amber-800 dark:text-amber-200"><RefreshCw size={13}/> Automatic price sync</p><p className="mt-2 text-sm font-extrabold text-amber-950 dark:text-amber-100">Not enabled yet</p><p className="mt-1 text-xs leading-5 text-amber-900 dark:text-amber-200">Manual prices remain labelled until Amazon Creators API access and credentials are configured.</p></div>
      </div>

      {message && <div role="status" className={`mb-6 flex items-start gap-3 rounded-xl border p-4 text-sm ${message.kind === "success" ? "border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-100" : "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-100"}`}><span className="mt-0.5">{message.kind === "success" ? <CheckCircle2 size={18}/> : <AlertCircle size={18}/>}</span><span>{message.text}</span></div>}

      {loadError && <div className="mb-6 rounded-2xl border border-rose-200 bg-rose-50 p-5 text-sm leading-6 text-rose-900 dark:border-rose-400/20 dark:bg-rose-500/10 dark:text-rose-100"><p className="font-black">Products could not be loaded</p><p className="mt-1">{loadError}</p><p className="mt-2 text-xs">Check that Supabase setup SQL has been run and the server-only environment variables are set in `.env.local` and Netlify.</p></div>}

      <section id="product-editor" className="mb-8 scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-white/10 dark:bg-slate-950 sm:p-7">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.17em] text-indigo-600 dark:text-indigo-300"><ImagePlus size={15}/> Product details</p><h2 className="mt-2 text-2xl font-black">{editingSource ? "Edit product" : "Add a product"}</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Three different, accurate product images are required. Do not use photos of another product.</p>{editingSource?.source === "static" && <p className="mt-2 text-xs font-bold text-amber-800 dark:text-amber-200">This currently comes from the built-in catalogue. Saving creates a database override; it will not edit the JSON source file.</p>}</div><button type="button" onClick={startNew} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-300 px-3.5 text-sm font-bold dark:border-white/10"><CirclePlus size={16}/> New product</button></div>
        <form onSubmit={saveProduct} className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <label className="block text-sm font-bold">Product name *<input required maxLength={180} value={form.title} onChange={(event) => { const title = event.target.value; update("title", title); if (!editingSource) update("slug", slugify(title)); }} className={textInput} placeholder="Reebok Velocity Runner" /></label>
            <label className="block text-sm font-bold">Brand *<input required maxLength={100} value={form.brand} onChange={(event) => update("brand", event.target.value)} className={textInput} placeholder="Reebok" /></label>
            <label className="block text-sm font-bold">Category *<select required value={categories.includes(form.category) ? form.category : "Other"} onChange={(event) => update("category", event.target.value === "Other" ? "" : event.target.value)} className={textInput}>{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select>{(!form.category || !categories.includes(form.category)) && <input aria-label="Custom category" required maxLength={80} value={form.category} onChange={(event) => update("category", event.target.value)} className={textInput} placeholder="Enter custom category" />}</label>
            <label className="block text-sm font-bold sm:col-span-2">Amazon affiliate product link *<input required type="url" value={form.amazonUrl} onChange={(event) => update("amazonUrl", event.target.value)} className={textInput} placeholder="https://www.amazon.in/dp/...?...tag=your-tag-21" /></label>
            <label className="block text-sm font-bold">ASIN (auto-detected if blank)<input maxLength={10} value={form.asin} onChange={(event) => update("asin", event.target.value.toUpperCase())} className={textInput} placeholder="B094VGRGY2" /></label>
            <label className="block text-sm font-bold">Current price *<input required type="number" min="0.01" step="0.01" value={form.price} onChange={(event) => update("price", event.target.value)} className={textInput} placeholder="2499" /></label>
            <label className="block text-sm font-bold">Original/list price<input type="number" min="0.01" step="0.01" value={form.originalPrice} onChange={(event) => update("originalPrice", event.target.value)} className={textInput} placeholder="Same as price if not verified" /></label>
            <label className="block text-sm font-bold">Currency<select value="INR" disabled className={textInput}><option value="INR">INR — Indian rupees</option></select><span className="mt-1 block text-xs font-normal text-slate-500">This Associates store is configured for Amazon.in.</span></label>
            <label className="block text-sm font-bold">Publication status *<select value={form.status} onChange={(event) => update("status", event.target.value as FormValues["status"])} className={textInput}><option value="draft">Draft — hidden from shoppers</option><option value="published">Published — visible on website</option></select></label>
            <label className="block text-sm font-bold">Display order / index<input type="number" min="1" max="1000000" step="1" value={form.displayOrder} onChange={(event) => update("displayOrder", event.target.value)} className={textInput} placeholder="1 = first, 2 = second"/><span className="mt-1 block text-xs font-normal text-slate-500">Blank = default ordering. Smaller number appears earlier on the Products page.</span></label>
            <label className="block text-sm font-bold">YouTube review URL (optional)<input type="url" value={form.videoUrl} onChange={(event) => update("videoUrl", event.target.value)} className={textInput} placeholder="https://www.youtube.com/watch?v=XXXXXXXXXXX"/><span className="mt-1 block text-xs font-normal text-slate-500">Paste a YouTube video/watch/share link; we will preview the video below.</span></label>
          </div>
          <fieldset className="rounded-2xl border border-indigo-200 p-4 dark:border-indigo-400/20"><legend className="px-2 text-sm font-black">Product images — three separate URLs *</legend><div className="grid gap-4 md:grid-cols-3">{([1,2,3] as const).map((number) => { const key = `image${number}` as const; const imageUrl = form[key]; return <label key={key} className="block text-sm font-bold">Image {number}{number === 1 ? " (main)" : ""} *<input required type="url" value={imageUrl} onChange={(event) => update(key, event.target.value)} className={textInput} placeholder="https://…"/><div className="mt-2 flex h-36 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-slate-50 dark:border-white/10 dark:bg-slate-900">{imageUrl && /^https:\/\//i.test(imageUrl) ? <img src={imageUrl} alt={`Product image ${number} preview`} className="h-full w-full object-contain p-2" onError={(event) => { event.currentTarget.style.opacity = "0.18"; }} onLoad={(event) => { event.currentTarget.style.opacity = "1"; }} /> : <span className="px-3 text-center text-xs text-slate-500">Image preview appears here</span>}</div></label>; })}</div><p className="mt-3 text-xs leading-5 text-slate-500 dark:text-slate-400">Use approved Amazon-provided image URLs or images you have permission to display. The form checks URL format, but cannot prove an image matches the product.</p></fieldset>
          {form.videoUrl.trim() && <div className="rounded-2xl border border-slate-200 p-4 dark:border-white/10"><p className="mb-3 text-sm font-black">Video preview</p>{getYouTubeEmbedUrl(form.videoUrl) ? <div className="aspect-video max-w-2xl overflow-hidden rounded-xl bg-slate-900"><iframe title={`Video preview for ${form.title || "product"}`} src={getYouTubeEmbedUrl(form.videoUrl) || undefined} className="h-full w-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div> : <p className="text-sm text-amber-700 dark:text-amber-300">Enter a valid YouTube watch/share/Shorts URL to preview it.</p>}</div>}
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4"><label className="block text-sm font-bold">Amazon rating (0–5)<input type="number" min="0" max="5" step="0.1" value={form.rating} onChange={(event) => update("rating", event.target.value)} className={textInput} placeholder="e.g. 4.2"/><span className="mt-1 block text-xs font-normal text-slate-500">Only enter a rating you saw on the exact Amazon listing.</span></label><label className="block text-sm font-bold">Ratings count<input type="number" min="0" max="100000000" step="1" value={form.reviewCount} onChange={(event) => update("reviewCount", event.target.value)} className={textInput} placeholder="e.g. 2188"/></label><label className="col-span-full inline-flex items-start gap-2 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={form.ratingChecked} onChange={(event) => update("ratingChecked", event.target.checked)} className="mt-1 h-4 w-4 accent-indigo-600"/><span>I checked the rating and count on the exact Amazon listing today.<span className="mt-1 block text-xs font-normal text-slate-500">If not checked, the public site continues to show “Rating not verified”. The rating remains labelled as manually checked, not an independently verified review score.</span></span></label></div>
          <div className="grid gap-4 lg:grid-cols-2"><label className="block text-sm font-bold">Description *<textarea required maxLength={3000} value={form.description} onChange={(event) => update("description", event.target.value)} className={textArea} placeholder="A concise factual product description."/></label><label className="block text-sm font-bold">Specifications as JSON<textarea spellCheck={false} value={form.specs} onChange={(event) => update("specs", event.target.value)} className={`${textArea} font-mono text-xs`} placeholder={'{"Material":"Mesh","Use":"Running"}'}/></label><label className="block text-sm font-bold">Pros (one per line)<textarea value={form.pros} onChange={(event) => update("pros", event.target.value)} className={textArea} placeholder="Breathable mesh upper\nCushioned sole"/></label><label className="block text-sm font-bold">Cons / things to check (one per line)<textarea value={form.cons} onChange={(event) => update("cons", event.target.value)} className={textArea} placeholder="Fit may vary\nCheck seller and size chart"/></label></div>
          <div className="flex flex-wrap gap-x-5 gap-y-3">{(["priceVerified", "featured", "trending", "editorChoice", "isDemoData"] as const).map((key) => <label key={key} className="inline-flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={form[key]} onChange={(event) => update(key, event.target.checked)} className="h-4 w-4 accent-indigo-600"/>{key === "priceVerified" ? "I personally checked this price today (records a price-history observation)" : key === "featured" ? "Feature on home page" : key === "trending" ? "Mark as trending" : key === "editorChoice" ? "Editor's choice" : "Mark as illustrative/demo product"}</label>)}</div>
          <div className="flex flex-wrap gap-3"><button disabled={saving} type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-black text-white shadow-md shadow-indigo-600/15 transition hover:bg-indigo-700 disabled:opacity-65">{saving ? <LoaderCircle size={17} className="animate-spin"/> : <Save size={17}/>} {saving ? "Saving…" : form.status === "published" ? "Save & publish" : "Save as draft"}</button>{editingSource && <button type="button" onClick={() => { setEditingSource(null); setForm(emptyForm()); setMessage(null); }} className="inline-flex min-h-12 items-center gap-2 rounded-xl border border-slate-300 px-5 text-sm font-bold dark:border-white/10"><X size={16}/> Cancel edit</button>}</div>
        </form>
      </section>

      <section id="admin-import" className="mb-8 scroll-mt-6 rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950 sm:p-7">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.17em] text-indigo-600 dark:text-indigo-300"><FileSpreadsheet size={15}/> Bulk product import</p><h2 className="mt-2 text-2xl font-black">Import a CSV batch</h2><p className="mt-1 text-sm leading-6 text-slate-600 dark:text-slate-300">Prepare multiple rows in Excel or Google Sheets, export as CSV, then import up to 200 products per file.</p></div><button type="button" onClick={downloadTemplate} className="inline-flex min-h-10 items-center justify-center gap-2 self-start rounded-xl border border-slate-300 px-3.5 text-sm font-bold dark:border-white/10"><ArrowDownToLine size={16}/> Download template</button></div>
        <form onSubmit={previewCsv} className="grid gap-4 md:grid-cols-[minmax(0,1fr)_220px_auto] md:items-end"><label className="block text-sm font-bold">CSV file<input id="bulk-csv-file" required type="file" accept=".csv,text/csv" onChange={(event: ChangeEvent<HTMLInputElement>) => { setCsvFile(event.target.files?.[0] || null); setCsvPreview(null); setImportResult(null); setMessage(null); }} className="mt-1.5 block min-h-12 w-full rounded-xl border border-slate-300 bg-white p-2 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-xs file:font-bold file:text-indigo-700 dark:border-white/10 dark:bg-slate-900"/><span className="mt-1 block text-xs font-normal text-slate-500">Maximum 2 MB · three unique image URLs per row</span></label><label className="block text-sm font-bold">Default status if column is blank<select value={defaultImportStatus} onChange={(event) => setDefaultImportStatus(event.target.value as "draft" | "published")} className={textInput}><option value="draft">Draft — review first</option><option value="published">Published — add live</option></select></label><button disabled={importing || !csvFile} type="submit" className="inline-flex min-h-12 items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 py-3 text-sm font-black text-white disabled:opacity-60 dark:bg-indigo-500"><FileSpreadsheet size={17}/> Preview CSV</button></form>
        {csvPreview && <div className="mt-5 rounded-2xl border border-indigo-200 bg-indigo-50/70 p-4 dark:border-indigo-400/20 dark:bg-indigo-500/[.07]">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-black">Import preview: {csvPreview.fileName}</p><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">{csvPreview.rows.length} product row(s). No database changes have been made.</p></div><span className="rounded-full bg-white px-3 py-1.5 text-xs font-black text-slate-700 dark:bg-slate-900 dark:text-slate-200">Default: {defaultImportStatus}</span></div>
          {csvPreview.missingRequired.length > 0 && <p className="mt-3 rounded-lg bg-rose-100 p-3 text-sm font-semibold text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">Missing required columns: {csvPreview.missingRequired.join(", ")}</p>}
          {csvPreview.duplicateSlugs.length > 0 && <p className="mt-3 rounded-lg bg-rose-100 p-3 text-sm font-semibold text-rose-800 dark:bg-rose-500/10 dark:text-rose-200">Duplicate slugs on row(s): {csvPreview.duplicateSlugs.join(", ")}. Fix duplicates before confirming.</p>}
          <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200 bg-white dark:border-white/10 dark:bg-slate-950"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-slate-100 dark:bg-white/5"><tr>{["Title", "Brand", "Category", "Price", "Status", "Image URLs"].map((heading) => <th key={heading} className="p-3 font-black">{heading}</th>)}</tr></thead><tbody>{csvPreview.rows.slice(0, 5).map((row, index) => <tr key={index} className="border-t border-slate-200 dark:border-white/10"><td className="max-w-64 p-3 font-semibold">{previewCell(csvPreview.headers, row, "title") || previewCell(csvPreview.headers, row, "productName") || "—"}</td><td className="p-3">{previewCell(csvPreview.headers, row, "brand") || "—"}</td><td className="p-3">{previewCell(csvPreview.headers, row, "category") || "—"}</td><td className="p-3">{previewCell(csvPreview.headers, row, "price") || "—"}</td><td className="p-3">{previewCell(csvPreview.headers, row, "status") || defaultImportStatus}</td><td className="p-3">{["image1", "image2", "image3"].filter((field) => /^https:\/\//i.test(previewCell(csvPreview.headers, row, field))).length}/3</td></tr>)}</tbody></table></div>
          {csvPreview.rows.length > 5 && <p className="mt-2 text-xs text-slate-500">Showing the first 5 rows only; all {csvPreview.rows.length} rows will be validated on confirmation.</p>}
          <div className="mt-4 flex flex-wrap gap-2"><button type="button" disabled={importing || csvPreview.missingRequired.length > 0 || csvPreview.duplicateSlugs.length > 0} onClick={() => void confirmImport()} className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-50">{importing ? <LoaderCircle size={16} className="animate-spin"/> : <CloudUpload size={16}/>} {importing ? "Importing…" : `Confirm and import ${csvPreview.rows.length} products`}</button><button type="button" disabled={importing} onClick={() => { setCsvPreview(null); setMessage(null); }} className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-slate-300 px-4 py-2.5 text-sm font-bold dark:border-white/10"><X size={15}/> Cancel preview</button></div>
        </div>}
        {importResult && <div className="mt-4 rounded-xl border border-slate-200 p-4 dark:border-white/10"><p className="text-sm font-black">{importResult.imported} row(s) imported successfully</p>{importResult.errors.length > 0 && <ul className="mt-3 space-y-2 text-xs leading-5 text-rose-700 dark:text-rose-200">{importResult.errors.map((item) => <li key={`${item.row}-${item.error}`}>Row {item.row}: {item.error}</li>)}</ul>}</div>}
        <p className="mt-4 text-xs leading-5 text-slate-500 dark:text-slate-400">Required CSV columns: title, brand, category, description, amazonUrl, price, image1, image2, image3. Use vertical bars (|) to separate pros/cons. Use valid JSON in specsJson. Duplicate slugs within the same file are rejected; slugs matching existing products update that product’s database record.</p>
      </section>

      <section className="rounded-3xl border border-slate-200 bg-white p-5 dark:border-white/10 dark:bg-slate-950 sm:p-7">
        <div className="mb-5"><div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-black uppercase tracking-[.17em] text-indigo-600 dark:text-indigo-300">Catalogue</p><h2 className="mt-2 text-2xl font-black">Products ({filteredRecords.length})</h2><p className="mt-1 text-sm text-slate-600 dark:text-slate-300">Filter by status/category, edit products, archive built-in items, and set display order: 1 appears before 2.</p></div><label className="relative block w-full sm:max-w-xs"><Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500"/><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, brand or ASIN" className="min-h-11 w-full rounded-xl border border-slate-300 bg-white pl-10 pr-3 text-sm dark:border-white/10 dark:bg-slate-900"/></label></div><div className="mt-4 grid gap-3 sm:grid-cols-2"><label className="block text-sm font-bold">Filter by status<select value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as typeof statusFilter)} className={textInput}><option value="all">All statuses</option><option value="draft">Draft</option><option value="published">Published</option><option value="archived">Archived</option></select></label><label className="block text-sm font-bold">Filter by category<select value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)} className={textInput}><option value="all">All categories</option>{Array.from(new Set(records.map((record) => record.product.category))).sort().map((category) => <option key={category} value={category}>{category}</option>)}</select></label></div></div>
        {loading ? <div className="flex items-center justify-center gap-2 py-12 text-sm text-slate-500"><LoaderCircle size={18} className="animate-spin"/> Loading catalogue…</div> : filteredRecords.length ? <div className="divide-y divide-slate-200 dark:divide-white/10">{filteredRecords.map((record) => <article key={`${record.product.slug}-${record.source}`} className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center"><img src={record.product.image} alt="" className="h-20 w-20 shrink-0 rounded-xl border border-slate-200 bg-slate-50 object-contain dark:border-white/10 dark:bg-slate-900"/><div className="min-w-0 flex-1"><h3 className="break-words font-black">{record.product.title}</h3><p className="mt-1 text-xs text-slate-500">{record.product.brand} · {record.product.category} · {record.product.slug}</p><div className="mt-2 flex flex-wrap gap-2"><span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase ${record.status === "published" ? "bg-emerald-100 text-emerald-800 dark:bg-emerald-500/15 dark:text-emerald-200" : record.status === "archived" ? "bg-slate-200 text-slate-700 dark:bg-white/10 dark:text-slate-300" : "bg-amber-100 text-amber-800 dark:bg-amber-500/15 dark:text-amber-200"}`}>{record.status}</span><span className="rounded-full bg-slate-100 px-2.5 py-1 text-[10px] font-bold text-slate-600 dark:bg-white/10 dark:text-slate-300">{record.source === "static" ? "Built-in catalogue" : "Database"}</span><span className="text-xs font-bold text-slate-700 dark:text-slate-200">{record.product.currency} {Number(record.product.price).toLocaleString()}</span><span className="text-xs text-slate-500">{record.product.images?.length || (record.product.image ? 1 : 0)} saved image(s)</span><span className="text-xs text-slate-500">{record.product.priceHistory?.observations?.length || 0} price observations</span><span className="text-xs text-slate-500">Order: {record.product.displayOrder || "default"}</span></div></div><div className="flex shrink-0 gap-2"><button type="button" onClick={() => startEdit(record)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-slate-300 px-3 text-xs font-bold dark:border-white/10"><Pencil size={14}/> Edit</button><button type="button" onClick={() => void deleteProduct(record)} className="inline-flex min-h-10 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-xs font-bold text-rose-700 hover:bg-rose-50 dark:border-rose-400/20 dark:text-rose-200 dark:hover:bg-rose-500/10"><Trash2 size={14}/> {record.builtIn ? "Archive" : "Delete"}</button></div></article>)}</div> : <p className="py-12 text-center text-sm text-slate-500">No products found.</p>}
      </section>
      <AdminBundleManager products={records.filter((record) => record.status === "published").map((record) => ({ product: record.product, status: "published" as const }))} textInput={textInput} />
      <AdminBannerManager />
      <AdminUserSupport />
      <AdminSecuritySettings />

      <footer className="mt-8 flex items-start gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-xs leading-5 text-slate-600 dark:border-white/10 dark:bg-white/[.025] dark:text-slate-300"><ShieldCheck size={16} className="mt-0.5 shrink-0 text-indigo-600 dark:text-indigo-300"/><span>Only this authenticated admin interface writes to the database. Supabase service credentials stay on the server; they must never use a `NEXT_PUBLIC_` environment variable. Public pages only receive published product data.</span></footer>
    </main>
  );
}
