import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, sameOriginMutationAllowed, verifyAdminSessionToken } from "@/lib/admin-auth";
import { getAdminBundleRecords } from "@/lib/bundle-catalog";
import { getPublishedCatalog, normalizeSlug } from "@/lib/product-catalog";
import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";
import type { CuratedBundle, BundleItem } from "@/data/bundles";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const VALID_CATEGORIES = new Set(["mobile-gaming", "gaming", "fashion", "desk", "everyday"]);

function authorized(request: NextRequest) {
  return verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
}
function errText(error: unknown) { return error instanceof Error ? error.message : "Unexpected bundle error."; }

function buildBundle(raw: Record<string, unknown>, products: Awaited<ReturnType<typeof getPublishedCatalog>>): { bundle: CuratedBundle; status: "draft" | "published"; sortOrder: number } {
  const title = typeof raw.title === "string" ? raw.title.trim() : "";
  const description = typeof raw.description === "string" ? raw.description.trim() : "";
  const slug = normalizeSlug(typeof raw.slug === "string" && raw.slug.trim() ? raw.slug : title);
  const category = typeof raw.category === "string" ? raw.category : "";
  const status = raw.status === "published" ? "published" : "draft";
  const sortOrder = raw.sortOrder == null || raw.sortOrder === "" ? 100 : Number(raw.sortOrder);
  if (!title || title.length > 180) throw new Error("Bundle title is required and must be at most 180 characters.");
  if (!slug || slug.length < 2) throw new Error("Bundle slug must contain at least two characters.");
  if (!description || description.length > 1500) throw new Error("Bundle description is required and must be at most 1,500 characters.");
  if (!VALID_CATEGORIES.has(category)) throw new Error("Choose a valid bundle category.");
  if (!Number.isInteger(sortOrder) || sortOrder < 1 || sortOrder > 1000000) throw new Error("Display order must be a positive whole number.");
  const selected = Array.isArray(raw.productSlugs) ? raw.productSlugs.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean) : [];
  const uniqueSlugs = [...new Set(selected)];
  if (uniqueSlugs.length < 2) throw new Error("Select at least two published products for a bundle.");
  const bySlug = new Map(products.map((product) => [product.slug, product]));
  const items: BundleItem[] = uniqueSlugs.map((productSlug) => {
    const product = bySlug.get(productSlug);
    if (!product) throw new Error(`Product "${productSlug}" is not currently published and available for bundles.`);
    return {
      id: product.slug,
      name: product.title,
      role: `${product.brand} ${product.category} pick`,
      searchQuery: `${product.brand} ${product.title}`,
      image: product.image,
      estimated_price: Number(product.price),
      current_price: null,
      currency: "INR",
      amazonUrl: product.amazonUrl,
      reviewSlug: product.slug,
    };
  });
  const bundle: CuratedBundle = { id: slug, title, description, category: category as CuratedBundle["category"], bundle_items: items, currency: "INR", sortOrder };
  return { bundle, status, sortOrder };
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try { return NextResponse.json({ records: await getAdminBundleRecords() }, { headers: { "Cache-Control": "no-store" } }); }
  catch (error) { return NextResponse.json({ error: errText(error) }, { status: 502 }); }
}

export async function POST(request: NextRequest) {
  if (!sameOriginMutationAllowed(request)) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  if (!authorized(request)) return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const body = await request.json() as { bundle?: unknown };
    if (!body.bundle || typeof body.bundle !== "object" || Array.isArray(body.bundle)) return NextResponse.json({ error: "Bundle form data is missing." }, { status: 400 });
    const products = await getPublishedCatalog();
    const validated = buildBundle(body.bundle as Record<string, unknown>, products);
    const bundle = validated.bundle;
    await supabaseRest("swf_bundles?on_conflict=slug", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
      body: JSON.stringify([{ slug: bundle.id, title: bundle.title, category: bundle.category, status: validated.status, sort_order: validated.sortOrder, bundle_data: bundle, updated_at: new Date().toISOString() }]),
    });
    return NextResponse.json({ ok: true, slug: bundle.id, status: validated.status });
  } catch (error) { return NextResponse.json({ error: errText(error) }, { status: 400 }); }
}

export async function DELETE(request: NextRequest) {
  if (!sameOriginMutationAllowed(request)) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  if (!authorized(request)) return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const body = await request.json() as { slug?: unknown };
    const slug = typeof body.slug === "string" ? normalizeSlug(body.slug) : "";
    if (!slug) return NextResponse.json({ error: "Bundle slug is required." }, { status: 400 });
    const records = await getAdminBundleRecords();
    const record = records.find((item) => item.bundle.id === slug);
    if (!record) return NextResponse.json({ error: "Bundle was not found." }, { status: 404 });
    if (record.builtIn) {
      await supabaseRest("swf_bundles?on_conflict=slug", { method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" }, body: JSON.stringify([{ slug, title: record.bundle.title, category: record.bundle.category, status: "archived", sort_order: record.bundle.sortOrder || 100, bundle_data: record.bundle, updated_at: new Date().toISOString() }]) });
    } else {
      await supabaseRest(`swf_bundles?slug=eq.${encodeURIComponent(slug)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    }
    return NextResponse.json({ ok: true });
  } catch (error) { return NextResponse.json({ error: errText(error) }, { status: 400 }); }
}
