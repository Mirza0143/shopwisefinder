
export type SupabaseRestOptions = {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
};

export function isSupabaseConfigured(): boolean {
  const url = process.env.SUPABASE_URL?.trim() || "";
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SECRET_KEY?.trim() || "";
  return Boolean(
    /^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(url.replace(/\/$/, "")) &&
    key && !/^(YOUR_|example|replace-me|sb_secret_your_)/i.test(key),
  );
}

function getConfig() {
  const base = process.env.SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || process.env.SUPABASE_SECRET_KEY?.trim();
  if (!base || !key || /^(YOUR_|example|replace-me|sb_secret_your_)/i.test(key) || base.includes("YOUR_PROJECT_REF")) {
    throw new Error("Supabase is not configured. Follow README_ADMIN_SETUP_HI.md and add the server-only environment variables.");
  }
  if (!/^https:\/\/[a-z0-9-]+\.supabase\.co$/i.test(base)) throw new Error("SUPABASE_URL must be your HTTPS Supabase project URL.");
  return { base, key, isNewSecretKey: key.startsWith("sb_secret_") };
}

export async function supabaseRest<T>(path: string, options: SupabaseRestOptions = {}): Promise<T> {
  const { base, key, isNewSecretKey } = getConfig();
  const responseHeaders: Record<string, string> = {
    apikey: key,
    Accept: "application/json",
    ...(options.body ? { "Content-Type": "application/json" } : {}),
    ...(options.headers || {}),
  };
  // New `sb_secret_...` keys are opaque API keys, not JWTs. Never send them as a Bearer token.
  // Legacy `service_role` values are JWTs and still need Authorization for server REST calls.
  if (!isNewSecretKey) responseHeaders.Authorization = `Bearer ${key}`;
  const response = await fetch(`${base}/rest/v1/${path.replace(/^\/+/, "")}`, {
    method: options.method || "GET",
    headers: responseHeaders,
    body: options.body,
    cache: "no-store",
    signal: AbortSignal.timeout(5000),
  });

  const responseText = await response.text();
  if (!response.ok) {
    // Supabase error bodies do not contain our API keys; cap messages before returning to callers.
    let detail = responseText.slice(0, 700);
    try {
      const parsed = JSON.parse(responseText) as { message?: string; hint?: string; code?: string };
      detail = [parsed.message, parsed.hint, parsed.code].filter(Boolean).join(" | ").slice(0, 500) || detail;
    } catch { /* leave capped plain text */ }
    throw new Error(`Supabase request failed (${response.status}): ${detail}`);
  }
  if (response.status === 204 || !responseText) return null as T;
  return JSON.parse(responseText) as T;
}
