import { randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, sameOriginMutationAllowed, verifyAdminSessionToken } from "@/lib/admin-auth";
import { isSupabaseConfigured } from "@/lib/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_FILE_BYTES = 4 * 1024 * 1024;
const MIME_EXT: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(request: NextRequest) {
  if (!sameOriginMutationAllowed(request)) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  if (!verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value)) return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const base = (process.env.SUPABASE_URL || "").trim().replace(/\/+$/, "");
  const key = (process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SECRET_KEY || "").trim();
  try {
    const form = await request.formData();
    const file = form.get("image");
    if (!file || typeof file === "string" || typeof file.arrayBuffer !== "function") return NextResponse.json({ error: "Choose a banner image file first." }, { status: 400 });
    if (!(file.type in MIME_EXT)) return NextResponse.json({ error: "Use a JPG, PNG or WebP banner image." }, { status: 415 });
    if (file.size <= 0 || file.size > MAX_FILE_BYTES) return NextResponse.json({ error: "Banner images must be smaller than 4 MB." }, { status: 413 });
    const objectName = `${Date.now()}-${randomUUID()}.${MIME_EXT[file.type]}`;
    const uploadUrl = `${base}/storage/v1/object/swf-banners/${objectName}`;
    const headers: Record<string, string> = { apikey: key, "Content-Type": file.type, "Cache-Control": "3600", "x-upsert": "false" };
    // Supabase sb_secret_ keys are opaque API keys; legacy service_role values are JWTs.
    if (!key.startsWith("sb_secret_")) headers.Authorization = `Bearer ${key}`;
    const response = await fetch(uploadUrl, { method: "POST", headers, body: Buffer.from(await file.arrayBuffer()), cache: "no-store", signal: AbortSignal.timeout(10_000) });
    const body = await response.text();
    if (!response.ok) {
      let message = body.slice(0, 350);
      try { const parsed = JSON.parse(body) as { message?: string; error?: string }; message = parsed.message || parsed.error || message; } catch { /* use bounded body */ }
      return NextResponse.json({ error: `Banner upload failed (${response.status}). Check the v3 SQL migration and storage bucket. ${message}` }, { status: 502 });
    }
    const imageUrl = `${base}/storage/v1/object/public/swf-banners/${objectName}`;
    return NextResponse.json({ image_url: imageUrl });
  } catch (error) { return NextResponse.json({ error: error instanceof Error ? error.message : "Banner image upload failed." }, { status: 400 }); }
}
