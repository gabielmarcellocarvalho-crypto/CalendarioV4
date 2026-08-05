import { NextResponse } from "next/server";
import { google } from "googleapis";
import { getOAuthClient, saveTokenStore, loadTokenStore } from "../../../../lib/google";

export const dynamic = "force-dynamic";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const code = searchParams.get("code");
  const error = searchParams.get("error");

  if (error || !code) {
    return NextResponse.redirect(new URL(`/admin?erro=${error || "sem_codigo"}`, request.url));
  }

  try {
    const client = getOAuthClient();
    const { tokens } = await client.getToken(code);

    // Mantém o refresh_token anterior caso o Google não envie um novo
    const previous = loadTokenStore();
    if (!tokens.refresh_token && previous?.tokens?.refresh_token) {
      tokens.refresh_token = previous.tokens.refresh_token;
    }

    client.setCredentials(tokens);
    let email = null;
    let name = null;
    try {
      const oauth2 = google.oauth2({ version: "v2", auth: client });
      const { data } = await oauth2.userinfo.get();
      email = data.email || null;
      name = data.name || null;
    } catch {
      /* e-mail é informativo; conexão continua válida */
    }

    saveTokenStore({ tokens, email, name, connectedAt: new Date().toISOString() });
    return NextResponse.redirect(new URL("/admin?conectado=1", request.url));
  } catch (err) {
    console.error("[oauth] falha na troca do código:", err?.message || err);
    return NextResponse.redirect(new URL("/admin?erro=troca_token", request.url));
  }
}
