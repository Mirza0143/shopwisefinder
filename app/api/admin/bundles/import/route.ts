import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, sameOriginMutationAllowed, verifyAdminSessionToken } from "@/lib/admin-auth";
import { getPublishedCatalog, normalizeSlug } from "@/lib/product-catalog";
import { getProductProvider } from "@/lib/marketplaces";
import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";
import { parseCsv } from "@/lib/catalog-validation";
import type { CuratedBundle, BundleItem } from "@/data/bundles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 100;
const VALID_CATEGORIES = new Set(["mobile-gaming", "gaming", "fashion", "desk", "everyday"]);

export async function POST(request: NextRequest) {
  if (!sameOriginMutationAllowed(request)) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  if (!verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value)) return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const body = await request.json() as { csv?: unknown; defaultStatus?: unknown };
    if (typeof body.csv !== "string" || !body.csv.trim()) return NextResponse.json({ error: "Choose a bundle CSV first." }, { status: 400 });
    if (Buffer.byteLength(body.csv, "utf8") > MAX_BYTES) return NextResponse.json({ error: "CSV must be 2 MB or smaller." }, { status: 413 });
    const rows = parseCsv(body.csv);
    if (rows.length < 2 || rows.length - 1 > MAX_ROWS) return NextResponse.json({ error: `Upload between 1 and ${MAX_ROWS} bundle rows per CSV.` }, { status: 400 });
    const key = (value: string) => value.toLowerCase().replace(/[^a-z0-9]/g, "");
    const headers = rows[0].map(key);
    const index = (name: string) => headers.indexOf(key(name));
    const cell = (row: string[], name: string) => { const i = index(name); return i >= 0 ? (row[i] || "").trim() : ""; };
    const required = ["title", "description", "category", "productSlugs"];
    const missing = required.filter((name) => index(name) < 0);
    if (missing.length) return NextResponse.json({ error: `Missing required CSV columns: ${missing.join(", ")}` }, { status: 400 });
    const products = await getPublishedCatalog();
    const bySlug = new Map(products.map((product) => [product.slug, product]));
    const validRows: Array<Record<string, unknown>> = [];
    const errors: Array<{ row: number; error: string }> = [];
    const seen = new Set<string>();
    for (let n = 1; n < rows.length; n++) {
      const row = rows[n];
      try {
        const title = cell(row, "title");
        const slug = normalizeSlug(cell(row, "slug") || title);
        const description = cell(row, "description");
        const category = cell(row, "category");
        const status = (cell(row, "status") || (body.defaultStatus === "published" ? "published" : "draft")) === "published" ? "published" : "draft";
        const sortOrder = cell(row, "sortOrder") ? Number(cell(row, "sortOrder")) : 100;
        const slugs = [...new Set(cell(row, "productSlugs").split(/[|;]/).map((item) => item.trim()).filter(Boolean))];
        if (!title || title.length > 180) throw new Error("Title is required (maximum 180 characters).");
        if (!slug || slug.length < 2) throw new Error("Invalid slug.");
        if (seen.has(slug)) throw new Error(`Duplicate bundle slug "${slug}" in this file.`);
        seen.add(slug);
        if (!description || description.length > 1500) throw new Error("Description is required (maximum 1,500 characters).");
        if (!VALID_CATEGORIES.has(category)) throw new Error("Category must be mobile-gaming, gaming, fashion, desk, or everyday.");
        if (!Number.isInteger(sortOrder) || sortOrder < 1 || sortOrder > 1000000) throw new Error("sortOrder must be a positive whole number.");
        if (slugs.length < 2) throw new Error("Add at least two product slugs separated by |.");
        const items: BundleItem[] = slugs.map((productSlug) => {
          const product = bySlug.get(productSlug);
          if (!product) throw new Error(`Product slug "${productSlug}" is not published or does not exist.`);
          return { id: product.slug, name: product.title, role: `${product.brand} ${product.category} pick`, searchQuery: `${product.brand} ${product.title}`, image: product.image, estimated_price: Number(product.price), current_price: null, currency: "INR", provider: getProductProvider(product), providerUrl: product.providerUrl, affiliateUrl: product.affiliateUrl || product.amazonUrl, amazonUrl: product.amazonUrl, reviewSlug: product.slug };
        });
        const bundle: CuratedBundle = { id: slug, title, description, category: category as CuratedBundle["category"], currency: "INR", bundle_items: items, sortOrder };
        validRows.push({ slug, title, category, status, sort_order: sortOrder, bundle_data: bundle, updated_at: new Date().toISOString() });
      } catch (error) { errors.push({ row: n + 1, error: error instanceof Error ? error.message : "Invalid bundle row." }); }
    }
    if (errors.length) return NextResponse.json({ imported: 0, errors, message: `No bundles imported. Fix ${errors.length} row error(s), then preview and retry.` }, { status: 422 });
    await supabaseRest("swf_bundles?on_conflict=slug", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify(validRows) });
    return NextResponse.json({ imported: validRows.length, errors: [], message: `${validRows.length} bundle(s) imported successfully as database records.` });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Bundle CSV import failed." }, { status: 400 }); }
}
