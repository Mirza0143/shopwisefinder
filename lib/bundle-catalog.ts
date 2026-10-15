import { curatedBundles, type CuratedBundle } from "@/data/bundles";
import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";

export type BundleStatus = "draft" | "published" | "archived";
export type AdminBundleRecord = {
  bundle: CuratedBundle;
  status: BundleStatus;
  source: "static" | "database";
  builtIn: boolean;
  updatedAt: string | null;
};

type BundleRow = {
  slug: string;
  title: string;
  category: CuratedBundle["category"];
  status: BundleStatus;
  sort_order: number | null;
  bundle_data: CuratedBundle;
  updated_at: string | null;
};

const categorySet = new Set(["mobile-gaming", "gaming", "fashion", "desk", "everyday"]);

function rowToBundle(row: BundleRow): CuratedBundle | null {
  const raw = row?.bundle_data as CuratedBundle | undefined;
  if (!raw || typeof raw !== "object" || !row.slug || typeof raw.title !== "string" || !Array.isArray(raw.bundle_items)) return null;
  return {
    ...raw,
    id: row.slug,
    title: row.title || raw.title,
    category: categorySet.has(String(row.category || raw.category)) ? (row.category || raw.category) : "everyday",
    currency: "INR",
    sortOrder: Number.isInteger(row.sort_order) && Number(row.sort_order) > 0 ? Number(row.sort_order) : (raw.sortOrder || undefined),
    bundle_items: raw.bundle_items.filter((item) => item && typeof item.name === "string" && typeof item.image === "string"),
  };
}

async function readRows(): Promise<BundleRow[]> {
  if (!isSupabaseConfigured()) return [];
  const rows = await supabaseRest<BundleRow[]>("swf_bundles?select=*&order=sort_order.asc,title.asc");
  return Array.isArray(rows) ? rows : [];
}

export async function getPublishedBundles(): Promise<CuratedBundle[]> {
  if (!isSupabaseConfigured()) return curatedBundles;
  try {
    const rows = await readRows();
    const rowBySlug = new Map(rows.map((row) => [row.slug, row]));
    const merged: CuratedBundle[] = [];
    for (const base of curatedBundles) {
      const row = rowBySlug.get(base.id);
      if (!row) { merged.push(base); continue; }
      rowBySlug.delete(base.id);
      if (row.status === "archived") continue;
      // A draft edit to a built-in bundle keeps its previously published static version online.
      if (row.status === "draft") { merged.push(base); continue; }
      const override = rowToBundle(row);
      if (override) merged.push(override);
    }
    for (const row of rowBySlug.values()) {
      if (row.status !== "published") continue;
      const bundle = rowToBundle(row);
      if (bundle) merged.push(bundle);
    }
    return merged.map((bundle, index) => ({ bundle, index })).sort((a, b) => {
      const ao = Number(a.bundle.sortOrder) > 0 ? Number(a.bundle.sortOrder) : Number.MAX_SAFE_INTEGER;
      const bo = Number(b.bundle.sortOrder) > 0 ? Number(b.bundle.sortOrder) : Number.MAX_SAFE_INTEGER;
      return ao - bo || a.index - b.index;
    }).map(({ bundle }) => bundle);
  } catch {
    // Expected during setup/offline conditions: keep the public bundle page working
    // without triggering the Next.js development error overlay for a recoverable fallback.
    return curatedBundles;
  }
}

export async function getAdminBundleRecords(): Promise<AdminBundleRecord[]> {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured. Set server-side environment variables first.");
  const rows = await readRows();
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const result: AdminBundleRecord[] = [];
  for (const bundle of curatedBundles) {
    const row = bySlug.get(bundle.id);
    if (!row) {
      result.push({ bundle, status: "published", source: "static", builtIn: true, updatedAt: null });
      continue;
    }
    bySlug.delete(bundle.id);
    const normalized = rowToBundle(row);
    if (normalized) result.push({ bundle: normalized, status: row.status, source: "database", builtIn: true, updatedAt: row.updated_at || null });
  }
  for (const row of bySlug.values()) {
    const normalized = rowToBundle(row);
    if (normalized) result.push({ bundle: normalized, status: row.status, source: "database", builtIn: false, updatedAt: row.updated_at || null });
  }
  return result.sort((a, b) => {
    const rank = (status: BundleStatus) => status === "published" ? 0 : status === "draft" ? 1 : 2;
    const ao = Number(a.bundle.sortOrder) > 0 ? Number(a.bundle.sortOrder) : Number.MAX_SAFE_INTEGER;
    const bo = Number(b.bundle.sortOrder) > 0 ? Number(b.bundle.sortOrder) : Number.MAX_SAFE_INTEGER;
    return rank(a.status) - rank(b.status) || ao - bo || a.bundle.title.localeCompare(b.bundle.title);
  });
}
