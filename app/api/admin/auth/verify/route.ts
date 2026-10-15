import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, ADMIN_SESSION_TTL_SECONDS, adminAuthConfigurationReady, createAdminSessionToken, sameOriginMutationAllowed } from "@/lib/admin-auth";
import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";
import { getTelegramAdminSettings } from "@/lib/admin-telegram-settings";
const ADMIN_OTP_COOKIE_NAME = "swf_admin_otp_challenge";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
const MAX_CODE_ATTEMPTS = 5;
type ChallengeRecord = { id: string; otp_hash: string; attempts: number; expires_at: string; consumed_at: string | null };

function hashCode(challengeId: string, code: string): string {
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET || "").update(`${challengeId}:${code}`).digest("hex");
}
function equalHex(left: string, right: string): boolean {
  try {
    const a = Buffer.from(left, "hex");
    const b = Buffer.from(right, "hex");
    return a.length === 32 && b.length === 32 && timingSafeEqual(a, b);
  } catch { return false; }
}
function clearChallengeCookie(response: NextResponse) {
  response.cookies.set(ADMIN_OTP_COOKIE_NAME, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/admin/auth", maxAge: 0 });
  return response;
}

export async function POST(request: NextRequest) {
  if (!sameOriginMutationAllowed(request)) return NextResponse.json({ error: "Request origin could not be verified. Refresh the page and try again." }, { status: 403 });
  if (!adminAuthConfigurationReady()) return NextResponse.json({ error: "Admin login configuration is incomplete." }, { status: 503 });
  let telegramSettings: Awaited<ReturnType<typeof getTelegramAdminSettings>>;
  try { telegramSettings = await getTelegramAdminSettings(); }
  catch { return NextResponse.json({ error: "Could not load Telegram authentication settings." }, { status: 503 }); }
  if (!telegramSettings.otpEnabled) return clearChallengeCookie(NextResponse.json({ error: "Telegram OTP is disabled. Sign in with your configured admin username and password." }, { status: 409 }));
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  const challengeId = request.cookies.get(ADMIN_OTP_COOKIE_NAME)?.value || "";
  if (!/^[0-9a-f-]{36}$/i.test(challengeId)) {
    return clearChallengeCookie(NextResponse.json({ error: "Your verification request expired. Sign in again to request a new code." }, { status: 401 }));
  }

  let body: { code?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter the 6-digit Telegram code." }, { status: 400 }); }
  const code = typeof body.code === "string" ? body.code.trim() : "";
  if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter all 6 digits from Telegram." }, { status: 400 });

  try {
    const rows = await supabaseRest<ChallengeRecord[]>(`swf_admin_auth_challenges?select=id,otp_hash,attempts,expires_at,consumed_at&id=eq.${challengeId}&limit=1`);
    const record = Array.isArray(rows) ? rows[0] : undefined;
    if (!record || record.consumed_at) return clearChallengeCookie(NextResponse.json({ error: "This code has already been used or is invalid. Sign in again for a new code." }, { status: 401 }));
    if (!Number.isFinite(new Date(record.expires_at).getTime()) || new Date(record.expires_at).getTime() <= Date.now()) {
      await supabaseRest(`swf_admin_auth_challenges?id=eq.${challengeId}&consumed_at=is.null`, { method: "PATCH", headers: { Prefer: "return=minimal" }, body: JSON.stringify({ consumed_at: new Date().toISOString() }) }).catch(() => undefined);
      return clearChallengeCookie(NextResponse.json({ error: "That code has expired. Sign in again to request a new one." }, { status: 401 }));
    }
    if (record.attempts >= MAX_CODE_ATTEMPTS) {
      return clearChallengeCookie(NextResponse.json({ error: "Too many incorrect code attempts. Sign in again after requesting a new code." }, { status: 429 }));
    }

    const providedHash = hashCode(challengeId, code);
    if (!equalHex(providedHash, record.otp_hash)) {
      const nextAttempts = Number(record.attempts || 0) + 1;
      const patch: Record<string, unknown> = { attempts: nextAttempts };
      if (nextAttempts >= MAX_CODE_ATTEMPTS) patch.consumed_at = new Date().toISOString();
      const updated = await supabaseRest<ChallengeRecord[]>(`swf_admin_auth_challenges?id=eq.${challengeId}&attempts=eq.${Number(record.attempts || 0)}&consumed_at=is.null`, {
        method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify(patch),
      });
      if (!Array.isArray(updated) || updated.length === 0) return clearChallengeCookie(NextResponse.json({ error: "This code was already used. Sign in again." }, { status: 401 }));
      const response = NextResponse.json({ error: nextAttempts >= MAX_CODE_ATTEMPTS ? "Too many incorrect attempts. Sign in again to request a new code." : `Incorrect code. ${MAX_CODE_ATTEMPTS - nextAttempts} attempts remaining.` }, { status: 401 });
      if (nextAttempts >= MAX_CODE_ATTEMPTS) return clearChallengeCookie(response);
      return response;
    }

    const consumed = await supabaseRest<ChallengeRecord[]>(`swf_admin_auth_challenges?id=eq.${challengeId}&attempts=eq.${Number(record.attempts || 0)}&consumed_at=is.null`, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ consumed_at: new Date().toISOString() }),
    });
    if (!Array.isArray(consumed) || consumed.length === 0) return clearChallengeCookie(NextResponse.json({ error: "This code was already used. Sign in again." }, { status: 401 }));

    const response = NextResponse.json({ ok: true });
    response.cookies.set(ADMIN_COOKIE_NAME, createAdminSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_TTL_SECONDS,
    });
    return clearChallengeCookie(response);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not verify code.";
    if (message.includes("swf_admin_auth_challenges") || message.includes("PGRST")) {
      return NextResponse.json({ error: "OTP database is not ready. Run supabase/admin-auth-telegram-v4.sql in Supabase SQL Editor." }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not verify this code. Check the Supabase connection and try again." }, { status: 503 });
  }
}
