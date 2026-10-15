import { createHmac, createHash, randomBytes, timingSafeEqual } from "node:crypto";

export const ADMIN_COOKIE_NAME = "swf_admin_session";
export const ADMIN_SESSION_TTL_SECONDS = 8 * 60 * 60;

/** Telegram OTP is on by default. Set ADMIN_TELEGRAM_OTP_ENABLED=false only for an intentional password-only fallback. */
export function isTelegramOtpEnabled(): boolean {
  const value = process.env.ADMIN_TELEGRAM_OTP_ENABLED?.trim().toLowerCase();
  return value !== "false" && value !== "0" && value !== "off" && value !== "disabled";
}

export function adminAuthConfigurationReady(): boolean {
  const username = process.env.ADMIN_USERNAME?.trim() || "";
  const password = process.env.ADMIN_PASSWORD || "";
  const secret = process.env.ADMIN_SESSION_SECRET || "";
  // Do not accidentally activate the example credentials if someone copies .env.example unchanged.
  const knownPlaceholders = new Set([
    "choose-a-private-username",
    "choose-a-unique-password-at-least-12-characters",
    "generate-a-random-48-byte-secret",
    "change-me",
    "changeme",
  ]);
  return Boolean(
    username && password.length >= 12 && secret.length >= 32 &&
    !knownPlaceholders.has(username.toLowerCase()) &&
    !knownPlaceholders.has(password.toLowerCase()) &&
    !knownPlaceholders.has(secret.toLowerCase()) &&
    !/^(your_|YOUR_|example|replace-me)/i.test(username) &&
    !/^(your_|YOUR_|example|replace-me)/i.test(password) &&
    !/^(your_|YOUR_|example|replace-me)/i.test(secret),
  );
}

function safeEqualText(a: string, b: string): boolean {
  const left = createHash("sha256").update(a).digest();
  const right = createHash("sha256").update(b).digest();
  return timingSafeEqual(left, right);
}

export function checkAdminCredentials(username: string, password: string): boolean {
  const expectedUser = process.env.ADMIN_USERNAME?.trim();
  const expectedPassword = process.env.ADMIN_PASSWORD;
  if (!expectedUser || !expectedPassword || !adminAuthConfigurationReady()) return false;
  return safeEqualText(username.trim(), expectedUser) && safeEqualText(password, expectedPassword);
}

function sign(payload: string): string {
  const secret = process.env.ADMIN_SESSION_SECRET;
  if (!secret || secret.length < 32) throw new Error("ADMIN_SESSION_SECRET must contain at least 32 characters.");
  return createHmac("sha256", secret).update(payload).digest("base64url");
}

export function createAdminSessionToken(): string {
  const payload = Buffer.from(JSON.stringify({ v: 1, exp: Math.floor(Date.now() / 1000) + ADMIN_SESSION_TTL_SECONDS, nonce: randomBytes(16).toString("base64url") })).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

export function verifyAdminSessionToken(token: string | undefined | null): boolean {
  if (!token || !adminAuthConfigurationReady()) return false;
  const [payload, signature, extra] = token.split(".");
  if (!payload || !signature || extra) return false;
  let expected: string;
  try { expected = sign(payload); } catch { return false; }
  if (!safeEqualText(signature, expected)) return false;
  try {
    const decoded = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as { v?: number; exp?: number; nonce?: string };
    return decoded.v === 1 && Number.isFinite(decoded.exp) && Number(decoded.exp) > Math.floor(Date.now() / 1000) && typeof decoded.nonce === "string";
  } catch { return false; }
}

export function sameOriginMutationAllowed(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    const originHost = new URL(origin).host.toLowerCase();
    const acceptedHosts = [request.headers.get("host"), request.headers.get("x-forwarded-host"), new URL(request.url).host]
      .filter((host): host is string => Boolean(host))
      .map((host) => host.toLowerCase());
    if (!acceptedHosts.includes(originHost)) return false;
    const fetchSite = request.headers.get("sec-fetch-site");
    return !fetchSite || fetchSite === "same-origin" || fetchSite === "none";
  } catch { return false; }
}

export function getClientAddress(request: Request): string {
  // Use only a single address for basic per-instance login throttling; never trust arbitrary forwarded lists.
  return (request.headers.get("x-nf-client-connection-ip") || request.headers.get("x-real-ip") || "unknown").slice(0, 80);
}
