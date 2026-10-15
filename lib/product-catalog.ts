import staticProductsJson from "@/data/products.json";
import type { Product } from "@/types/product";
import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";

export type ProductStatus = "draft" | "published" | "archived";
export type CatalogRow = {
  slug: string;
  title: string;
  brand: string;
  category: string;
  asin: string | null;
  price: number | null;
  currency: string;
  images: string[] | null;
  price_source: string | null;
  price_checked_at: string | null;
  product_data: Product;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
};
export type AdminCatalogRecord = {
  product: Product;
  status: ProductStatus;
  source: "static" | "database";
  builtIn: boolean;
  updatedAt: string | null;
};

const staticProducts = staticProductsJson as unknown as Product[];
const TABLE = "swf_products";

export function getStaticProducts(): Product[] {
  return staticProducts;
}

export async function getDatabaseCatalogRows(): Promise<CatalogRow[]> {
  if (!isSupabaseConfigured()) return [];
  const rows = await supabaseRest<CatalogRow[]>(`${TABLE}?select=*&order=updated_at.desc`);
  return Array.isArray(rows) ? rows : [];
}

function normalizeDbProduct(row: CatalogRow): Product | null {
  const raw = row?.product_data as Product | undefined;
  if (!raw || typeof raw !== "object" || !row.slug || !raw.title) return null;
  const images = Array.isArray(row.images) && row.images.length
    ? row.images.filter((image): image is string => typeof image === "string" && image.startsWith("https://")).slice(0, 3)
    : Array.isArray(raw.images) ? raw.images.slice(0, 3) : [];
  return {
    ...raw,
    id: String(raw.id || `swf-${row.slug}`),
    slug: row.slug,
    image: images[0] || raw.image,
    images: images.length ? images : (raw.images || (raw.image ? [raw.image] : [])),
    title: row.title || raw.title,
    brand: row.brand || raw.brand,
    category: row.category || raw.category,
    amazonUrl: raw.amazonUrl,
    price: Number(row.price ?? raw.price ?? 0),
    originalPrice: Number(raw.originalPrice ?? row.price ?? raw.price ?? 0),
    currency: row.currency || raw.currency || "INR",
    priceSource: (row.price_source || raw.priceSource || "unknown") as Product["priceSource"],
    priceCheckedAt: row.price_checked_at || raw.priceCheckedAt || null,
    isDemoData: Boolean(raw.isDemoData),
  };
}

export async function getPublishedCatalog(): Promise<Product[]> {
  const rows = await getDatabaseCatalogRows().catch((error) => {
    console.error("ShopWiseFinder catalog database read failed; serving static catalogue fallback.", error instanceof Error ? error.message : "Unknown database error");
    return [];
  });
  const rowBySlug = new Map(rows.map((row) => [row.slug, row]));
  // A draft edit of a built-in item must not accidentally remove its current live version.
  // Published DB rows replace their static equivalents; archived rows intentionally hide them.
  const untouchedStatic = staticProducts.filter((product) => {
    const override = rowBySlug.get(product.slug);
    return !override || override.status === "draft";
  });
  const publishedDatabase = rows
    .filter((row) => row.status === "published")
    .map(normalizeDbProduct)
    .filter((product): product is Product => Boolean(product));
  const merged = [...untouchedStatic, ...publishedDatabase];
  const bySlug = new Map<string, Product>();
  for (const product of merged) bySlug.set(product.slug, product);
  return Array.from(bySlug.values()).map((product, index) => ({ product, index })).sort((a, b) => {
    const ao = Number(a.product.displayOrder) > 0 ? Number(a.product.displayOrder) : Number.MAX_SAFE_INTEGER;
    const bo = Number(b.product.displayOrder) > 0 ? Number(b.product.displayOrder) : Number.MAX_SAFE_INTEGER;
    return ao - bo || a.index - b.index;
  }).map(({ product }) => product);
}

export async function getAdminCatalogRecords(): Promise<AdminCatalogRecord[]> {
  if (!isSupabaseConfigured()) throw new Error("Supabase is not configured yet. Follow README_ADMIN_SETUP_HI.md first.");
  const rows = await getDatabaseCatalogRows();
  const bySlug = new Map(rows.map((row) => [row.slug, row]));
  const records: AdminCatalogRecord[] = [];
  for (const product of staticProducts) {
    const row = bySlug.get(product.slug);
    if (row) {
      const normalized = normalizeDbProduct(row);
      if (normalized) records.push({ product: normalized, status: row.status, source: "database", builtIn: true, updatedAt: row.updated_at || null });
      bySlug.delete(product.slug);
    } else {
      records.push({ product, status: "published", source: "static", builtIn: true, updatedAt: null });
    }
  }
  for (const row of bySlug.values()) {
    const product = normalizeDbProduct(row);
    if (product) records.push({ product, status: row.status, source: "database", builtIn: false, updatedAt: row.updated_at || null });
  }
  return records.sort((a, b) => {
    const statusRank = (status: ProductStatus) => status === "published" ? 0 : status === "draft" ? 1 : 2;
    return statusRank(a.status) - statusRank(b.status) || a.product.title.localeCompare(b.product.title);
  });
}

export function toDatabaseRow(product: Product, status: ProductStatus) {
  return {
    slug: product.slug,
    title: product.title,
    brand: product.brand,
    category: product.category,
    asin: product.asin || null,
    price: product.price,
    currency: product.currency || "INR",
    images: product.images?.slice(0, 3) || [product.image],
    price_source: product.priceSource || "unknown",
    price_checked_at: product.priceCheckedAt || null,
    product_data: product,
    status,
    updated_at: new Date().toISOString(),
  };
}

export function normalizeSlug(value: string): string {
  return value.normalize("NFKD").toLowerCase().trim().replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 90);
}

export function extractAsin(value: string): string | null {
  const match = value.match(/\/(?:dp|gp\/product|product)\/([A-Z0-9]{10})(?:[/?#]|$)/i) || value.match(/\b([A-Z0-9]{10})\b/);
  return match ? match[1].toUpperCase() : null;
}
