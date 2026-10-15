import { NextRequest, NextResponse } from "next/server";
import { ADMIN_COOKIE_NAME, sameOriginMutationAllowed } from "@/lib/admin-auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  if (!sameOriginMutationAllowed(request)) return NextResponse.json({ error: "Request origin could not be verified." }, { status: 403 });
  const response = NextResponse.json({ ok: true });
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    maxAge: 0,
  });
  return response;
}
