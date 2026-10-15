"use client";

export type ClientAnalyticsEvent = "page_view" | "review_click" | "affiliate_click" | "banner_view" | "banner_click" | "compare_select";

type EventDetails = {
  pagePath?: string;
  productSlug?: string;
  linkUrl?: string;
  metadata?: Record<string, string | number | boolean | null>;
};

function getSessionId(): string | null {
  if (typeof window === "undefined") return null;
  try {
    let id = window.sessionStorage.getItem("swf_analytics_session_id");
    if (!id) {
      id = typeof crypto !== "undefined" && "randomUUID" in crypto
        ? crypto.randomUUID()
        : `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random().toString(36).slice(2)}`;
      window.sessionStorage.setItem("swf_analytics_session_id", id);
    }
    return id;
  } catch {
    // Analytics is optional and must never interrupt browsing if storage is unavailable.
    return null;
  }
}

export function trackAnalyticsEvent(eventType: ClientAnalyticsEvent, details: EventDetails = {}) {
  if (typeof window === "undefined") return;
  const sessionId = getSessionId();
  if (!sessionId) return;
  const payload = {
    eventType,
    sessionId,
    pagePath: details.pagePath || window.location.pathname,
    productSlug: details.productSlug || null,
    linkUrl: details.linkUrl || null,
    metadata: details.metadata || {},
  };
  try {
    void fetch("/api/analytics/events", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
      keepalive: true,
      credentials: "same-origin",
    }).catch(() => undefined);
  } catch {
    // Never block a link click or page navigation for optional metrics.
  }
}
