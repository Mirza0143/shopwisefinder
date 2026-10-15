import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TelegramUpdate = {
  message?: {
    text?: string;
    chat?: { id?: number; type?: string };
    from?: { id?: number; is_bot?: boolean };
  };
};
type PendingRow = { id: number; pending_pair_code_hash: string; pending_pair_expires_at: string | null };

function webhookSecret(): string {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim() || "";
  return createHmac("sha256", token).update("ShopWiseFinder Telegram webhook v1").digest("base64url");
}
function secureEqual(aText: string, bText: string): boolean {
  const a = Buffer.from(aText);
  const b = Buffer.from(bText);
  return a.length === b.length && a.length > 0 && timingSafeEqual(a, b);
}
function pairHash(code: string): string {
  return createHmac("sha256", process.env.ADMIN_SESSION_SECRET || "").update(`pair:${code.toLowerCase()}`).digest("hex");
}
async function reply(chatId: number, text: string) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token) return;
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: chatId, text, disable_web_page_preview: true }), cache: "no-store", signal: AbortSignal.timeout(8_000) }).catch(() => undefined);
}

export async function POST(request: NextRequest) {
  const token = process.env.TELEGRAM_BOT_TOKEN?.trim();
  if (!token || !process.env.ADMIN_SESSION_SECRET?.trim()) return NextResponse.json({ ok: false }, { status: 503 });
  const supplied = request.headers.get("x-telegram-bot-api-secret-token") || "";
  if (!secureEqual(supplied, webhookSecret())) return NextResponse.json({ error: "Unauthorized webhook" }, { status: 401 });
  if (!isSupabaseConfigured()) return NextResponse.json({ ok: false }, { status: 503 });
  let update: TelegramUpdate;
  try { update = await request.json() as TelegramUpdate; } catch { return NextResponse.json({ ok: true }); }
  const message = update.message;
  const chatId = message?.chat?.id;
  const fromId = message?.from?.id;
  const text = typeof message?.text === "string" ? message.text.trim() : "";
  if (!chatId || !fromId || message?.chat?.type !== "private" || chatId !== fromId || message?.from?.is_bot) return NextResponse.json({ ok: true });
  const match = text.match(/^\/start(?:@[a-z0-9_]+)?\s+([a-z0-9]{8,16})\s*$/i);
  if (!match) {
    if (/^\/start(?:@[a-z0-9_]+)?\s*$/i.test(text)) await reply(chatId, "To connect this Telegram account to ShopWiseFinder Admin, generate a pairing code in Admin → Admin Security, then send /start followed by that code. The code is one-time and expires in 10 minutes.");
    return NextResponse.json({ ok: true });
  }
  const hash = pairHash(match[1]);
  const now = new Date().toISOString();
  try {
    const rows = await supabaseRest<PendingRow[]>(`swf_admin_security_settings?select=id,pending_pair_code_hash,pending_pair_expires_at&id=eq.1&pending_pair_code_hash=eq.${hash}&pending_pair_expires_at=gt.${encodeURIComponent(now)}&limit=1`);
    if (!Array.isArray(rows) || rows.length === 0) {
      await reply(chatId, "That ShopWiseFinder pairing code is invalid or expired. Generate a new code in Admin Security and try again.");
      return NextResponse.json({ ok: true });
    }
    const updated = await supabaseRest<PendingRow[]>(`swf_admin_security_settings?id=eq.1&pending_pair_code_hash=eq.${hash}&pending_pair_expires_at=gt.${encodeURIComponent(now)}`, {
      method: "PATCH", headers: { Prefer: "return=representation" }, body: JSON.stringify({ telegram_chat_id: String(chatId), telegram_otp_enabled: true, pending_pair_code_hash: null, pending_pair_expires_at: null, updated_at: now }),
    });
    if (!Array.isArray(updated) || updated.length === 0) {
      await reply(chatId, "This pairing code was already used or expired. Generate a fresh code in ShopWiseFinder Admin.");
      return NextResponse.json({ ok: true });
    }
    await reply(chatId, "✅ This Telegram account is now connected to ShopWiseFinder Admin. Telegram OTP sign-in is ON. Keep this account private and secure.");
    return NextResponse.json({ ok: true, linked: true });
  } catch {
    await reply(chatId, "ShopWiseFinder could not finish pairing because its database was unavailable. Generate a new code later and try again.");
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
