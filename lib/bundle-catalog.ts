import { curatedBundles, type CuratedBundle } from "@/data/bundles";
import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";
import { getPublishedCatalog } from "@/lib/product-catalog";

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

function bundleHasPublishedProducts(bundle: CuratedBundle, publishedSlugs: Set<string>): boolean {
  // A bundle is public only if it has at least two items and every item maps to
  // a currently published, non-demo catalogue product.
  return bundle.bundle_items.length >= 2 &&
    bundle.bundle_items.every((item) => typeof item.reviewSlug === "string" && publishedSlugs.has(item.reviewSlug));
}

async function keepOnlyBundlesWithPublishedProducts(bundles: CuratedBundle[]): Promise<CuratedBundle[]> {
  const products = await getPublishedCatalog();
  const publishedSlugs = new Set(products.map((product) => product.slug));
  // This prevents legacy built-in/demo bundles from resurfacing when products are hidden.
  return bundles.filter((bundle) => bundleHasPublishedProducts(bundle, publishedSlugs));
}

export async function getPublishedBundles(): Promise<CuratedBundle[]> {
  // Fail closed: static sample bundles are admin templates, not public inventory.
  if (!isSupabaseConfigured()) return [];
  try {
    const rows = await readRows();
    const published = rows
      .filter((row) => row.status === "published")
      .map(rowToBundle)
      .filter((bundle): bundle is CuratedBundle => Boolean(bundle));

    const eligible = await keepOnlyBundlesWithPublishedProducts(published);
    return eligible.map((bundle, index) => ({ bundle, index })).sort((a, b) => {
      const ao = Number(a.bundle.sortOrder) > 0 ? Number(a.bundle.sortOrder) : Number.MAX_SAFE_INTEGER;
      const bo = Number(b.bundle.sortOrder) > 0 ? Number(b.bundle.sortOrder) : Number.MAX_SAFE_INTEGER;
      return ao - bo || a.index - b.index;
    }).map(({ bundle }) => bundle);
  } catch (error) {
    // Do not fall back to demo content if Supabase is unavailable. Public pages
    // should show no bundles rather than expose illustrative/sample bundles.
    console.error("ShopWiseFinder published bundle read failed; hiding bundles until data is available.", error instanceof Error ? error.message : "Unknown database error");
    return [];
  }
}

export async function getAdminBundleRecords(): Promise<AdminBundleRecord[]> {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured. Set server-side environment variables first.");
  const rows = await readRows();
  const products = await getPublishedCatalog();
  const publishedSlugs = new Set(products.map((product) => product.slug));
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const result: AdminBundleRecord[] = [];
  for (const bundle of curatedBundles) {
    const row = bySlug.get(bundle.id);
    if (!row) {
      result.push({ bundle, status: "draft", source: "static", builtIn: true, updatedAt: null });
      continue;
    }
    bySlug.delete(bundle.id);
    const normalized = rowToBundle(row);
    if (normalized) {
      const effectiveStatus: BundleStatus = row.status === "published" && !bundleHasPublishedProducts(normalized, publishedSlugs) ? "draft" : row.status;
      result.push({ bundle: normalized, status: effectiveStatus, source: "database", builtIn: true, updatedAt: row.updated_at || null });
    }
  }
  for (const row of bySlug.values()) {
    const normalized = rowToBundle(row);
    if (normalized) {
      const effectiveStatus: BundleStatus = row.status === "published" && !bundleHasPublishedProducts(normalized, publishedSlugs) ? "draft" : row.status;
      result.push({ bundle: normalized, status: effectiveStatus, source: "database", builtIn: false, updatedAt: row.updated_at || null });
    }
  }
  return result.sort((a, b) => {
    const rank = (status: BundleStatus) => status === "published" ? 0 : status === "draft" ? 1 : 2;
    const ao = Number(a.bundle.sortOrder) > 0 ? Number(a.bundle.sortOrder) : Number.MAX_SAFE_INTEGER;
    const bo = Number(b.bundle.sortOrder) > 0 ? Number(b.bundle.sortOrder) : Number.MAX_SAFE_INTEGER;
    return rank(a.status) - rank(b.status) || ao - bo || a.bundle.title.localeCompare(b.bundle.title);
  });
}
