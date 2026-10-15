import { createHmac, randomBytes, randomInt, randomUUID, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, sameOriginMutationAllowed, verifyAdminSessionToken } from "@/lib/admin-auth";
import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";
import { getTelegramAdminSettings } from "@/lib/admin-telegram-settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DISABLE_COOKIE = "swf_admin_security_challenge";
const OTP_TTL_SECONDS = 10 * 60;
const MAX_ATTEMPTS = 5;
const MAX_SENDS = 3;
const WINDOW_MS = 10 * 60 * 1000;

type SettingsRow = {
  id: number;
  telegram_otp_enabled: boolean;
  telegram_chat_id: string | null;
  pending_pair_code_hash: string | null;
  pending_pair_expires_at: string | null;
  telegram_update_offset: number | string | null;
  updated_at: string | null;
};
type DisableChallenge = {
  id: string; purpose: string; code_hash: string; target_chat_id: string;
  created_at: string; expires_at: string; attempts: number; consumed_at: string | null;
};
type TelegramMessageUpdate = {
  update_id: number;
  message?: { text?: string; chat?: { id?: number; type?: string }; from?: { id?: number; is_bot?: boolean } };
};
type TelegramApiResponse = { ok?: boolean; description?: string; result?: unknown };

function authorized(request: NextRequest) { return verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value); }
function authSecret() { return process.env.ADMIN_SESSION_SECRET || ""; }
function hashDisableCode(id: string, code: string) { return createHmac("sha256", authSecret()).update(`disable:${id}:${code}`).digest("hex"); }
function hashPairCode(code: string) { return createHmac("sha256", authSecret()).update(`pair:${code.toLowerCase()}`).digest("hex"); }
function equalHex(left: string, right: string) {
  try { const a = Buffer.from(left, "hex"); const b = Buffer.from(right, "hex"); return a.length === 32 && b.length === 32 && timingSafeEqual(a, b); }
  catch { return false; }
}
function effectiveChatId(row?: SettingsRow | null) { return row?.telegram_chat_id?.trim() || process.env.TELEGRAM_CHAT_ID?.trim() || ""; }
async function getSettingsRow(): Promise<SettingsRow | undefined> {
  const rows = await supabaseRest<SettingsRow[]>("swf_admin_security_settings?select=id,telegram_otp_enabled,telegram_chat_id,pending_pair_code_hash,pending_pair_expires_at,telegram_update_offset,updated_at&id=eq.1&limit=1");
  return Array.isArray(rows) ? rows[0] : undefined;
}
async function upsertSettings(fields: Partial<SettingsRow>) {
  await supabaseRest("swf_admin_security_settings?on_conflict=id", {
    method: "POST", headers: { Prefer: "resolution=merge-duplicates,return=minimal" },
    body: JSON.stringify([{ id: 1, ...fields, updated_at: new Date().toISOString() }]),
  });
}
async function telegramCall(method: string, body: Record<string, unknown> = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is missing in the server environment.");
  const response = await fetch(`https://api.telegram.org/bot${token}/${method}`, {
    method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body), cache: "no-store", signal: AbortSignal.timeout(10_000),
  });
  const result = await response.json().catch(() => ({})) as TelegramApiResponse;
  if (!response.ok || !result.ok) throw new Error(typeof result.description === "string" ? result.description : `Telegram ${method} request failed.`);
  return result.result;
}
async function sendCode(chatId: string, code: string) {
  await telegramCall("sendMessage", { chat_id: chatId, text: `ShopWiseFinder admin security confirmation: ${code}\n\nThis code can disable Telegram OTP only after you confirm it in the Admin panel. It expires in 10 minutes and can be used once. If you did not request this, ignore it.`, disable_web_page_preview: true });
}
function setChallengeCookie(response: NextResponse, challengeId: string) {
  response.cookies.set(DISABLE_COOKIE, challengeId, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/admin/security", maxAge: OTP_TTL_SECONDS });
  return response;
}
function clearChallengeCookie(response: NextResponse) {
  response.cookies.set(DISABLE_COOKIE, "", { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "strict", path: "/api/admin/security", maxAge: 0 });
  return response;
}
function maskedChat(chatId: string) { return chatId.length <= 4 ? "••••" : `${"•".repeat(Math.max(4, chatId.length - 4))}${chatId.slice(-4)}`; }
function telegramWebhookSecret(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) throw new Error("TELEGRAM_BOT_TOKEN is missing in the server environment.");
  return createHmac("sha256", token).update("ShopWiseFinder Telegram webhook v1").digest("base64url");
}
function resolvePublicWebhookUrl(request: NextRequest): string | null {
  const explicitlyConfigured = process.env.TELEGRAM_WEBHOOK_URL?.trim();
  const publicBase = explicitlyConfigured || (process.env.NODE_ENV === "production" ? process.env.URL?.trim() : "") || request.nextUrl.origin;
  let url: URL;
  try { url = new URL(publicBase); } catch { return null; }
  const isLocal = /^(localhost|127\.0\.0\.1|0\.0\.0\.0|\[::1\])$/i.test(url.hostname);
  if (url.protocol !== "https:" || isLocal) return null;
  if (explicitlyConfigured && url.pathname !== "/" && !url.pathname.endsWith("/api/telegram/webhook")) return null;
  if (!url.pathname.endsWith("/api/telegram/webhook")) url.pathname = `${url.pathname.replace(/\/$/, "")}/api/telegram/webhook`.replace(/^\/\//, "/");
  url.search = ""; url.hash = "";
  return url.toString();
}
async function sendWebhookCommandReply(chatId: number, text: string) {
  await telegramCall("sendMessage", { chat_id: chatId, text, disable_web_page_preview: true }).catch(() => undefined);
}
async function applyPairingCode(code: string, chatId: number): Promise<boolean> {
  const hash = hashPairCode(code);
  const now = new Date().toISOString();
  const rows = await supabaseRest<SettingsRow[]>(`swf_admin_security_settings?select=id,telegram_otp_enabled,telegram_chat_id,pending_pair_code_hash,pending_pair_expires_at,telegram_update_offset,updated_at&id=eq.1&pending_pair_code_hash=eq.${hash}&pending_pair_expires_at=gt.${encodeURIComponent(now)}&limit=1`);
  if (!Array.isArray(rows) || rows.length === 0) return false;
  const updated = await supabaseRest<SettingsRow[]>(`swf_admin_security_settings?id=eq.1&pending_pair_code_hash=eq.${hash}&pending_pair_expires_at=gt.${encodeURIComponent(now)}`, {
    method: "PATCH", headers: { Prefer: "return=representation" },
    body: JSON.stringify({ telegram_chat_id: String(chatId), telegram_otp_enabled: true, pending_pair_code_hash: null, pending_pair_expires_at: null, updated_at: now }),
  });
  return Array.isArray(updated) && updated.length > 0;
}
function startCommand(text: string): string | null {
  const match = text.match(/^\/start(?:@[a-z0-9_]+)?\s+([a-z0-9]{8,16})\s*$/i);
  return match?.[1]?.toLowerCase() || null;
}

export async function GET(request: NextRequest) {
  if (!authorized(request)) return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
  try {
    const [row, telegram] = await Promise.all([getSettingsRow(), getTelegramAdminSettings()]);
    const chatId = effectiveChatId(row);
    return NextResponse.json({
      otpEnabled: row?.telegram_otp_enabled ?? telegram.otpEnabled,
      chatConfigured: Boolean(chatId),
      maskedChatId: chatId ? maskedChat(chatId) : null,
      pendingPairExpiresAt: row?.pending_pair_expires_at || null,
      botConfigured: Boolean(process.env.TELEGRAM_BOT_TOKEN?.trim()),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Could not read Admin Security settings. Run supabase/admin-telegram-controls-v5.sql." }, { status: 503 });
  }
}

export async function POST(request: NextRequest) {
  if (!sameOriginMutationAllowed(request)) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  if (!authorized(request)) return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });

  let body: { action?: unknown; code?: unknown };
  try { body = await request.json(); } catch { return NextResponse.json({ error: "Invalid request." }, { status: 400 }); }
  const action = typeof body.action === "string" ? body.action : "";

  try {
    const settings = await getSettingsRow();
    if (!settings) return NextResponse.json({ error: "Admin Security database is not initialized. Run supabase/admin-telegram-controls-v5.sql first." }, { status: 503 });

    if (action === "begin-disable") {
      if (!settings.telegram_otp_enabled) return NextResponse.json({ error: "Telegram OTP is already OFF." }, { status: 409 });
      const chatId = effectiveChatId(settings);
      if (!chatId) return NextResponse.json({ error: "No connected Telegram chat exists. Connect Telegram before disabling OTP." }, { status: 409 });
      const since = new Date(Date.now() - WINDOW_MS).toISOString();
      const recent = await supabaseRest<DisableChallenge[]>(`swf_admin_security_challenges?select=id,created_at&purpose=eq.disable_telegram_otp&created_at=gte.${encodeURIComponent(since)}&order=created_at.desc&limit=${MAX_SENDS}`);
      if (Array.isArray(recent) && recent.length >= MAX_SENDS) return NextResponse.json({ error: "Too many security codes requested. Wait 10 minutes before trying again." }, { status: 429 });
      const id = randomUUID();
      const code = randomInt(0, 1_000_000).toString().padStart(6, "0");
      const now = Date.now();
      await supabaseRest("swf_admin_security_challenges", { method: "POST", headers: { Prefer: "return=minimal" }, body: JSON.stringify([{ id, purpose: "disable_telegram_otp", code_hash: hashDisableCode(id, code), target_chat_id: chatId, created_at: new Date(now).toISOString(), expires_at: new Date(now + OTP_TTL_SECONDS * 1000).toISOString(), attempts: 0, consumed_at: null }]) });
      try { await sendCode(chatId, code); }
      catch { await supabaseRest(`swf_admin_security_challenges?id=eq.${id}`, { method: "DELETE", headers: { Prefer: "return=minimal" } }).catch(() => undefined); return NextResponse.json({ error: "Telegram could not deliver the confirmation code. Check your bot and connected chat, then retry." }, { status: 502 }); }
      return setChallengeCookie(NextResponse.json({ ok: true, needsCode: true, message: "A confirmation code was sent to the connected Telegram account. Enter it below to turn OTP off." }), id);
    }

    if (action === "verify-disable") {
      const id = request.cookies.get(DISABLE_COOKIE)?.value || "";
      if (!/^[0-9a-f-]{36}$/i.test(id)) return clearChallengeCookie(NextResponse.json({ error: "Security confirmation expired. Start the OFF flow again." }, { status: 401 }));
      const code = typeof body.code === "string" ? body.code.trim() : "";
      if (!/^\d{6}$/.test(code)) return NextResponse.json({ error: "Enter all six digits from Telegram." }, { status: 400 });
      const rows = await supabaseRest<DisableChallenge[]>(`swf_admin_security_challenges?select=id,purpose,code_hash,target_chat_id,created_at,expires_at,attempts,consumed_at&id=eq.${id}&purpose=eq.disable_telegram_otp&limit=1`);
      const challenge = Array.isArray(rows) ? rows[0] : undefined;
      if (!challenge || challenge.consumed_at) return clearChallengeCookie(NextResponse.json({ error: "This code is invalid or already used. Start again." }, { status: 401 }));
      if (new Date(challenge.expires_at).getTime() <= Date.now()) return clearChallengeCookie(NextResponse.json({ error: "The code expired. Start again to receive a new one." }, { status: 401 }));
      if (challenge.attempts >= MAX_ATTEMPTS) return clearChallengeCookie(NextResponse.json({ error: "Too many incorrect attempts. Request a new code later." }, { status: 429 }));
      if (!equalHex(hashDisableCode(id, code), challenge.code_hash)) {
        const nextAttempts = Number(challenge.attempts || 0) + 1;
        const updated = await supabaseRest<DisableChallenge[]>(`swf_admin_security_challenges?id=eq.${id}&attempts=eq.${challenge.attempts}&consumed_at=is.null`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ attempts: nextAttempts, ...(nextAttempts >= MAX_ATTEMPTS ? { consumed_at: new Date().toISOString() } : {}) }) });
        if (!Array.isArray(updated) || !updated.length) return clearChallengeCookie(NextResponse.json({ error: "This code was already used." }, { status: 401 }));
        const response = NextResponse.json({ error: nextAttempts >= MAX_ATTEMPTS ? "Too many incorrect attempts. Start again later." : `Incorrect code. ${MAX_ATTEMPTS - nextAttempts} attempts left.` }, { status: 401 });
        return nextAttempts >= MAX_ATTEMPTS ? clearChallengeCookie(response) : response;
      }
      const consumed = await supabaseRest<DisableChallenge[]>(`swf_admin_security_challenges?id=eq.${id}&attempts=eq.${challenge.attempts}&consumed_at=is.null`, { method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ consumed_at: new Date().toISOString() }) });
      if (!Array.isArray(consumed) || !consumed.length) return clearChallengeCookie(NextResponse.json({ error: "This code was already used." }, { status: 401 }));
      await upsertSettings({ telegram_otp_enabled: false, pending_pair_code_hash: null, pending_pair_expires_at: null });
      return clearChallengeCookie(NextResponse.json({ ok: true, otpEnabled: false, message: "Telegram OTP is now OFF. Password-only sign-in is less secure." }));
    }

    if (action === "begin-enable") {
      if (settings.telegram_otp_enabled) return NextResponse.json({ error: "Telegram OTP is already ON. To change accounts, first turn it OFF and verify the code sent to the currently connected Telegram account." }, { status: 409 });
      if (!process.env.TELEGRAM_BOT_TOKEN?.trim()) return NextResponse.json({ error: "TELEGRAM_BOT_TOKEN is missing in the server environment." }, { status: 503 });
      const alphabet = "abcdefghjkmnpqrstuvwxyz23456789";
      const raw = randomBytes(12);
      let pairingCode = "";
      for (const byte of raw) { pairingCode += alphabet[byte % alphabet.length]; if (pairingCode.length >= 10) break; }
      const expiresAt = new Date(Date.now() + OTP_TTL_SECONDS * 1000).toISOString();
      let botUsername = "";
      let pairingMode: "webhook" | "polling";
      let webhookUrl: string | null = null;
      try {
        const me = await telegramCall("getMe", {}) as { username?: string } | undefined;
        botUsername = me?.username || "";
        webhookUrl = resolvePublicWebhookUrl(request);
        if (webhookUrl) {
          await telegramCall("setWebhook", { url: webhookUrl, secret_token: telegramWebhookSecret(), allowed_updates: ["message"], drop_pending_updates: false });
          pairingMode = "webhook";
        } else {
          const info = await telegramCall("getWebhookInfo", {}) as { url?: string } | undefined;
          if (info?.url) return NextResponse.json({ error: "This bot already has a webhook configured. To pair from localhost, pair from the deployed Admin page instead; the existing webhook was not changed." }, { status: 409 });
          pairingMode = "polling";
        }
      } catch (error) {
        return NextResponse.json({ error: error instanceof Error ? `Telegram setup failed: ${error.message}` : "Telegram bot setup failed." }, { status: 502 });
      }
      await upsertSettings({ pending_pair_code_hash: hashPairCode(pairingCode), pending_pair_expires_at: expiresAt });
      return NextResponse.json({ ok: true, pairingCode, command: `/start ${pairingCode}`, botUrl: botUsername ? `https://t.me/${botUsername}` : null, expiresAt, pairingMode, webhookUrl, message: "Open your bot and send the exact /start command below. The code expires in 10 minutes and can be used once." });
    }

    if (action === "poll-pairing-updates") {
      if (!settings.pending_pair_code_hash || !settings.pending_pair_expires_at || new Date(settings.pending_pair_expires_at).getTime() <= Date.now()) {
        return NextResponse.json({ ok: true, paired: Boolean(settings.telegram_otp_enabled), expired: true });
      }
      const info = await telegramCall("getWebhookInfo", {}) as { url?: string } | undefined;
      if (info?.url) return NextResponse.json({ error: "Telegram bot is using a webhook. Pair from the public Admin page instead." }, { status: 409 });
      const offset = Number(settings.telegram_update_offset || 0);
      const result = await telegramCall("getUpdates", { offset, timeout: 0, allowed_updates: ["message"] }) as TelegramMessageUpdate[] | undefined;
      let nextOffset = offset;
      let paired = false;
      if (Array.isArray(result)) {
        for (const update of result) {
          nextOffset = Math.max(nextOffset, Number(update.update_id || 0) + 1);
          const message = update.message;
          const chatId = message?.chat?.id;
          const fromId = message?.from?.id;
          const code = typeof message?.text === "string" ? startCommand(message.text.trim()) : null;
          if (!code || !chatId || !fromId || message?.chat?.type !== "private" || chatId !== fromId || message?.from?.is_bot) continue;
          if (await applyPairingCode(code, chatId)) {
            paired = true;
            await sendWebhookCommandReply(chatId, "✅ This Telegram account is now connected to ShopWiseFinder Admin. Telegram OTP sign-in is ON. Keep this account private and secure.");
          } else {
            await sendWebhookCommandReply(chatId, "That ShopWiseFinder pairing code is invalid or expired. Generate a new code in Admin Security and try again.");
          }
        }
      }
      if (nextOffset > offset) await upsertSettings({ telegram_update_offset: nextOffset });
      return NextResponse.json({ ok: true, paired, otpEnabled: paired, message: paired ? "Telegram account connected." : undefined });
    }

    return NextResponse.json({ error: "Unknown security action." }, { status: 400 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Admin Security request failed.";
    if (message.includes("swf_admin_security_settings") || message.includes("swf_admin_security_challenges") || message.includes("PGRST205")) return NextResponse.json({ error: "Admin Security migration is missing. Run supabase/admin-telegram-controls-v5.sql in this Supabase project." }, { status: 503 });
    return NextResponse.json({ error: message }, { status: 503 });
  }
}
