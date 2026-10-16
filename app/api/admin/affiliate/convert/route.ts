import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, sameOriginMutationAllowed, verifyAdminSessionToken } from "@/lib/admin-auth";
import { getProviderLabel, isProviderProductUrl, normalizeProvider } from "@/lib/marketplaces";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!sameOriginMutationAllowed(request)) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  if (!verifyAdminSessionToken(request.cookies.get(ADMIN_COOKIE_NAME)?.value)) return NextResponse.json({ error: "Your admin session has expired. Sign in again." }, { status: 401 });

  const apiKey = process.env.CUELINKS_API_KEY?.trim();
  if (!apiKey || /^(YOUR_|example|replace-me|placeholder)/i.test(apiKey)) {
    return NextResponse.json({ error: "Cuelinks API is not configured. Add CUELINKS_API_KEY as a server-only secret with the write:links scope, or paste a tracking URL generated in the Cuelinks dashboard." }, { status: 503 });
  }

  try {
    const body = await request.json() as { provider?: unknown; url?: unknown };
    const provider = normalizeProvider(body.provider);
    const urlValue = typeof body.url === "string" ? body.url.trim() : "";
    if (!provider || provider === "other") return NextResponse.json({ error: "Choose a supported marketplace before generating a Cuelinks link." }, { status: 400 });
    if (!urlValue || urlValue.length > 2048 || !isProviderProductUrl(provider, urlValue)) {
      return NextResponse.json({ error: `Enter a valid HTTPS product URL from ${getProviderLabel(provider)}.` }, { status: 400 });
    }

    const url = new URL(urlValue);
    const referralUrl = request.headers.get("origin") || process.env.URL || "";
    const channelId = Number(process.env.CUELINKS_CHANNEL_ID || 0);
    const apiResponse = await fetch("https://developers.cuelinks.com/pub_api/v3/links/convert", {
      method: "POST",
      headers: { Authorization: `Token ${apiKey}`, "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({
        url: url.toString(),
        shorten: true,
        ...(Number.isInteger(channelId) && channelId > 0 ? { channel_id: channelId } : {}),
        ...(referralUrl ? { referral_url: new URL("/products", referralUrl).toString() } : {}),
        subid: `shopwisefinder_${provider}`,
      }),
      cache: "no-store",
      signal: AbortSignal.timeout(10000),
    });
    const payload = await apiResponse.json().catch(() => ({})) as {
      data?: { tracking_url?: string; short_url?: string; affiliated?: boolean; campaign?: { id?: number | string; name?: string } | null };
      error?: string;
      message?: string;
    };
    if (!apiResponse.ok) {
      const details = payload.error || payload.message || `Cuelinks request failed (${apiResponse.status}).`;
      if (apiResponse.status === 401) return NextResponse.json({ error: "Cuelinks rejected the API key. Check CUELINKS_API_KEY in the server environment." }, { status: 502 });
      if (apiResponse.status === 403) return NextResponse.json({ error: "Cuelinks API key needs the write:links scope." }, { status: 502 });
      return NextResponse.json({ error: details.slice(0, 300) }, { status: 502 });
    }
    const data = payload.data;
    const trackingUrl = data?.short_url || data?.tracking_url;
    if (!trackingUrl || typeof trackingUrl !== "string") return NextResponse.json({ error: "Cuelinks did not return a usable tracking URL." }, { status: 502 });
    if (data?.affiliated !== true) {
      return NextResponse.json({
        error: `Cuelinks returned affiliated=false for ${getProviderLabel(provider)}. The campaign may need approval or be inactive; do not publish this product until access is granted.`,
        campaign: data?.campaign?.name || null,
      }, { status: 409 });
    }
    return NextResponse.json({ affiliateUrl: trackingUrl, trackingUrl: data?.tracking_url || trackingUrl, campaignName: data?.campaign?.name || null, provider: getProviderLabel(provider) }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && error.name === "TimeoutError") return NextResponse.json({ error: "Cuelinks timed out. Try again in a moment." }, { status: 504 });
    return NextResponse.json({ error: "Could not generate the Cuelinks link. Verify the product URL and try again." }, { status: 502 });
  }
}
