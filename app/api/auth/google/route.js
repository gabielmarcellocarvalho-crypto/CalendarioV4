import { NextResponse } from "next/server";
import { getOAuthClient, getScopes, hasCredentials } from "../../../../lib/google";
import { hasAccess } from "../../../../lib/access";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!hasAccess(request)) {
    return NextResponse.redirect(new URL("/?erro=acesso", request.url));
  }
  if (!hasCredentials()) {
    return NextResponse.redirect(new URL("/admin?erro=credenciais", request.url));
  }
  const client = getOAuthClient();
  const url = client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: getScopes(),
  });
  return NextResponse.redirect(url);
}
