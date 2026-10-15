import { createHmac, randomInt, randomUUID } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, ADMIN_SESSION_TTL_SECONDS, adminAuthConfigurationReady, checkAdminCredentials, createAdminSessionToken, getClientAddress, sameOriginMutationAllowed } from "@/lib/admin-auth";
import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";
import { getTelegramAdminSettings } from "@/lib/admin-telegram-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const attempts = new Map<string, { count: number; firstAt: number }>();
const WINDOW_MS = 15 * 60 * 1000;
const OTP_WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 8;
const MAX_OTP_SENDS = 3;
const OTP_TTL_SECONDS = 10 * 60;
const ADMIN_OTP_COOKIE_NAME = "swf_admin_otp_challenge";

type ChallengeRow = { id: string; created_at: string };

function otpHash(challengeId: string, code: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET || "";
  return createHmac("sha256", secret).update(`${challengeId}:${code}`).digest("hex");
}

async function sendTelegramCode(code: string, chatId: string): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token || !chatId) return false;
  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text: `ShopWiseFinder admin sign-in code: ${code}\n\nThis code expires in 10 minutes and can be used once. If you did not try to sign in, ignore this message.`,
        disable_web_page_preview: true,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(8_000),
    });
    const result = await response.json().catch(() => ({})) as { ok?: boolean };
    return response.ok && result.ok === true;
  } catch {
    return false;
  }
}

export async function POST(request: NextRequest) {
  if (!sameOriginMutationAllowed(request)) return NextResponse.json({ error: "Request origin could not be verified. Refresh the page and try again." }, { status: 403 });
  if (!adminAuthConfigurationReady()) {
    return NextResponse.json({ error: "Admin login is not configured. Check ADMIN_USERNAME, ADMIN_PASSWORD and ADMIN_SESSION_SECRET in .env.local." }, { status: 503 });
  }
  let telegramSettings: Awaited<ReturnType<typeof getTelegramAdminSettings>>;
  try { telegramSettings = await getTelegramAdminSettings(); }
  catch { return NextResponse.json({ error: "Could not load Telegram authentication settings. Check Supabase and try again." }, { status: 503 }); }
  const otpEnabled = telegramSettings.otpEnabled;
  if (otpEnabled && !isSupabaseConfigured()) return NextResponse.json({ error: "Supabase must be configured to store one-time login challenges." }, { status: 503 });
  if (otpEnabled && (!process.env.TELEGRAM_BOT_TOKEN?.trim() || !telegramSettings.chatId)) {
    return NextResponse.json({ error: "Telegram verification is not configured yet. Connect a Telegram account in Admin Security or configure TELEGRAM_BOT_TOKEN and TELEGRAM_CHAT_ID, then restart the server." }, { status: 503 });
  }

  const address = getClientAddress(request);
  const now = Date.now();
  const state = attempts.get(address);
  if (state && now - state.firstAt < WINDOW_MS && state.count >= MAX_ATTEMPTS) {
    return NextResponse.json({ error: "Too many login attempts. Wait 15 minutes before trying again." }, { status: 429 });
  }
  if (!state || now - state.firstAt >= WINDOW_MS) attempts.set(address, { count: 0, firstAt: now });

  let body: { username?: unknown; password?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Enter your username and password." }, { status: 400 }); }
  const username = typeof body.username === "string" ? body.username.slice(0, 150) : "";
  const password = typeof body.password === "string" ? body.password.slice(0, 500) : "";
  if (!checkAdminCredentials(username, password)) {
    const current = attempts.get(address) || { count: 0, firstAt: now };
    attempts.set(address, { count: current.count + 1, firstAt: current.firstAt });
    return NextResponse.json({ error: "Username or password is incorrect." }, { status: 401 });
  }

  if (!otpEnabled) {
    // Explicit emergency/maintenance fallback only. By default Telegram OTP stays enabled.
    attempts.delete(address);
    const response = NextResponse.json({ ok: true, otpRequired: false, message: "Password-only admin sign-in is enabled by configuration." });
    response.cookies.set(ADMIN_COOKIE_NAME, createAdminSessionToken(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/",
      maxAge: ADMIN_SESSION_TTL_SECONDS,
    });
    return response;
  }

  const secret = process.env.ADMIN_SESSION_SECRET || "";
  const requestHash = createHmac("sha256", secret).update(address).digest("hex");
  try {
    // Durable per-address OTP issue limit: at most 3 challenges within 10 minutes, even across serverless instances.
    const since = new Date(now - OTP_WINDOW_MS).toISOString();
    const recent = await supabaseRest<ChallengeRow[]>(`swf_admin_auth_challenges?select=id,created_at&request_hash=eq.${requestHash}&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=${MAX_OTP_SENDS}`);
    if (Array.isArray(recent) && recent.length >= MAX_OTP_SENDS) {
      return NextResponse.json({ error: "Too many verification codes requested. Wait 10 minutes before trying again." }, { status: 429 });
    }

    const challengeId = randomUUID();
    const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
    const createdAt = new Date(now).toISOString();
    const expiresAt = new Date(now + OTP_TTL_SECONDS * 1000).toISOString();
    await supabaseRest("swf_admin_auth_challenges", {
      method: "POST",
      headers: { Prefer: "return=minimal" },
      body: JSON.stringify([{ id: challengeId, otp_hash: otpHash(challengeId, code), request_hash: requestHash, created_at: createdAt, expires_at: expiresAt, attempts: 0, consumed_at: null }]),
    });

    const sent = await sendTelegramCode(code, telegramSettings.chatId);
    if (!sent) {
      await supabaseRest(`swf_admin_auth_challenges?id=eq.${challengeId}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }).catch(() => undefined);
      return NextResponse.json({ error: "Telegram could not deliver the code. Check the bot token, chat ID and that you have started the bot, then try again." }, { status: 502 });
    }
    attempts.delete(address);
    const response = NextResponse.json({ ok: true, otpRequired: true, message: "A 6-digit code has been sent to your Telegram chat. It expires in 10 minutes." });
    response.cookies.set(ADMIN_OTP_COOKIE_NAME, challengeId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      path: "/api/admin/auth",
      maxAge: OTP_TTL_SECONDS,
    });
    return response;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not start Telegram verification.";
    if (message.includes("swf_admin_auth_challenges") || message.includes("PGRST")) {
      return NextResponse.json({ error: "Telegram OTP database is not ready. Run supabase/admin-auth-telegram-v4.sql in Supabase SQL Editor." }, { status: 503 });
    }
    return NextResponse.json({ error: "Could not prepare Telegram verification. Check the Supabase connection and v4 authentication migration." }, { status: 503 });
  }
}
