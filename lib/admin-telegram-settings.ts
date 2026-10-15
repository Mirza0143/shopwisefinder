import { isTelegramOtpEnabled } from "@/lib/admin-auth";
import { isSupabaseConfigured, supabaseRest } from "@/lib/supabase-rest";

export type TelegramAdminSettings = {
  otpEnabled: boolean;
  chatId: string;
  source: "database" | "environment";
  pendingPairExpiresAt: string | null;
};

type SettingsRow = {
  id: number;
  telegram_otp_enabled: boolean | null;
  telegram_chat_id: string | null;
  pending_pair_expires_at: string | null;
};

export function environmentTelegramChatId(): string {
  return process.env.TELEGRAM_CHAT_ID?.trim() || "";
}

/** Database-backed setting wins once the security-settings migration is installed. */
export async function getTelegramAdminSettings(): Promise<TelegramAdminSettings> {
  const fallback: TelegramAdminSettings = {
    otpEnabled: isTelegramOtpEnabled(),
    chatId: environmentTelegramChatId(),
    source: "environment",
    pendingPairExpiresAt: null,
  };
  if (!isSupabaseConfigured()) return fallback;
  try {
    const rows = await supabaseRest<SettingsRow[]>("swf_admin_security_settings?select=id,telegram_otp_enabled,telegram_chat_id,pending_pair_expires_at&id=eq.1&limit=1");
    const row = Array.isArray(rows) ? rows[0] : undefined;
    if (!row) return fallback;
    return {
      otpEnabled: row.telegram_otp_enabled ?? fallback.otpEnabled,
      chatId: row.telegram_chat_id?.trim() || fallback.chatId,
      source: "database",
      pendingPairExpiresAt: row.pending_pair_expires_at || null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    // Backward compatibility before the explicit Admin Security migration is applied.
    if (message.includes("swf_admin_security_settings") || message.includes("PGRST205")) return fallback;
    throw error;
  }
}
