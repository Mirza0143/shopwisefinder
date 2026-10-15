import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, sameOriginMutationAllowed, verifyAdminSessionToken } from "@/lib/admin-auth";
import { csvRowToProduct, parseCsv, type ProductSaveStatus } from "@/lib/catalog-validation";
import { getAdminCatalogRecords, toDatabaseRow } from "@/lib/product-catalog";
import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_BYTES = 2 * 1024 * 1024;
const MAX_ROWS = 200;

export async function POST(request: NextRequest) {
  if (!sameOriginMutationAllowed(request)) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  if (!verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value)) return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  try {
    const body = await request.json() as { csv?: unknown; defaultStatus?: unknown };
    if (typeof body.csv !== "string" || !body.csv.trim()) return NextResponse.json({ error: "Upload a CSV file first." }, { status: 400 });
    if (Buffer.byteLength(body.csv, "utf8") > MAX_BYTES) return NextResponse.json({ error: "CSV must be 2 MB or smaller." }, { status: 413 });
    const defaultStatus: ProductSaveStatus = body.defaultStatus === "published" ? "published" : "draft";
    const rows = parseCsv(body.csv);
    if (rows.length < 2) return NextResponse.json({ error: "CSV must contain a header row and at least one product row." }, { status: 400 });
    if (rows.length - 1 > MAX_ROWS) return NextResponse.json({ error: `Import at most ${MAX_ROWS} products per file.` }, { status: 400 });
    const headers = rows[0];
    const existingRecords = await getAdminCatalogRecords();
    const existingBySlug = new Map(existingRecords.map((record) => [record.product.slug, record.product]));
    const valid: Array<ReturnType<typeof toDatabaseRow>> = [];
    const errors: Array<{ row: number; error: string }> = [];
    const seenSlugs = new Set<string>();
    for (let index = 1; index < rows.length; index++) {
      try {
        const validated = csvRowToProduct(headers, rows[index], defaultStatus);
        const slug = validated.product.slug;
        if (seenSlugs.has(slug)) throw new Error(`Duplicate slug "${slug}" in this CSV.`);
        seenSlugs.add(slug);
        const previous = existingBySlug.get(slug);
        if (previous) {
          // Keep editorial metadata when a CSV is updating an existing product.
          validated.product = { ...previous, ...validated.product, id: previous.id, review: previous.review, rating: previous.rating, reviewCount: previous.reviewCount };
        }
        valid.push(toDatabaseRow(validated.product, validated.status));
      } catch (error) {
        errors.push({ row: index + 1, error: error instanceof Error ? error.message : "Invalid product row." });
      }
    }

    // Fail the whole import before touching the database if any row failed validation.
    // This avoids an unexpected partial import where valid rows go live but others do not.
    if (errors.length) {
      return NextResponse.json({ ok: false, imported: 0, errors, defaultStatus, message: `No rows imported. Fix the ${errors.length} row error(s), preview the CSV again, and retry.` }, { status: 422 });
    }
    if (!valid.length) return NextResponse.json({ error: "No valid product rows were found." }, { status: 400 });
    await supabaseRest<unknown[]>("swf_products?on_conflict=slug", {
      method: "POST",
      headers: { Prefer: "resolution=merge-duplicates,return=representation" },
      body: JSON.stringify(valid),
    });
    return NextResponse.json({ ok: true, imported: valid.length, errors: [], defaultStatus, message: `${valid.length} product row(s) imported successfully.` });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "CSV import failed." }, { status: 400 });
  }
}
