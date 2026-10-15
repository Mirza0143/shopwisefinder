import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, sameOriginMutationAllowed, verifyAdminSessionToken } from "@/lib/admin-auth";
import { validateProductInput, type ProductSaveStatus } from "@/lib/catalog-validation";
import { getAdminCatalogRecords, getStaticProducts, toDatabaseRow } from "@/lib/product-catalog";
import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: NextRequest) {
  return verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value);
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : "Unexpected server error.";
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured. Follow README_ADMIN_SETUP_HI.md before managing products." }, { status: 503 });
  try {
    const records = await getAdminCatalogRecords();
    return NextResponse.json({ records }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 502 });
  }
}

export async function POST(request: NextRequest) {
  if (!sameOriginMutationAllowed(request)) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  if (!authorized(request)) return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured. Follow README_ADMIN_SETUP_HI.md before managing products." }, { status: 503 });

  try {
    const body = await request.json() as { product?: Record<string, unknown>; status?: ProductSaveStatus };
    if (!body.product || typeof body.product !== "object" || Array.isArray(body.product)) return NextResponse.json({ error: "Product form data is missing." }, { status: 400 });
    const requestedSlug = typeof body.product.slug === "string" ? body.product.slug : "";
    const existing = (await getAdminCatalogRecords()).find((record) => record.product.slug === requestedSlug);
    const status = body.status === "published" ? "published" : "draft";
    const validated = validateProductInput({ ...body.product, status }, status, existing?.product);
    const savedRows = await supabaseRest<unknown[]>("swf_products?on_conflict=slug", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify([toDatabaseRow(validated.product, validated.status)]),
    });
    return NextResponse.json({ ok: true, product: validated.product, status: validated.status, resultCount: Array.isArray(savedRows) ? savedRows.length : 1 });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}

export async function DELETE(request: NextRequest) {
  if (!sameOriginMutationAllowed(request)) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  if (!authorized(request)) return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  try {
    const body = await request.json() as { slug?: unknown };
    const slug = typeof body.slug === "string" ? body.slug.trim() : "";
    if (!slug) return NextResponse.json({ error: "Product slug is required." }, { status: 400 });
    const records = await getAdminCatalogRecords();
    const record = records.find((item) => item.product.slug === slug);
    if (!record) return NextResponse.json({ error: "Product was not found." }, { status: 404 });
    const existsInStatic = getStaticProducts().some((product) => product.slug === slug);
    if (existsInStatic) {
      // A DB tombstone hides, but never edits, the static source file on the public catalogue.
      await supabaseRest("swf_products?on_conflict=slug", {
        method: "POST",
        headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
        body: JSON.stringify([toDatabaseRow(record.product, "archived")]),
      });
    } else {
      await supabaseRest(`swf_products?slug=eq.${encodeURIComponent(slug)}`, { method: "DELETE", headers: { Prefer: "return=minimal" } });
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: errorMessage(error) }, { status: 400 });
  }
}
