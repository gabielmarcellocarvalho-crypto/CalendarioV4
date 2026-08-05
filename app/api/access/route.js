import { cookies } from "next/headers";
import { ACCESS_COOKIE, accessRequired } from "../../../lib/access";

export const dynamic = "force-dynamic";

export async function GET() {
  const jar = await cookies();
  const value = jar.get(ACCESS_COOKIE)?.value;
  const required = accessRequired();
  const ok = !required || value === process.env.APP_ACCESS_CODE;
  return Response.json({ required, ok });
}

export async function POST(request) {
  const { code } = await request.json().catch(() => ({}));
  if (!accessRequired()) return Response.json({ ok: true });
  if (!code || code !== process.env.APP_ACCESS_CODE) {
    return Response.json({ ok: false, message: "Código incorreto." }, { status: 401 });
  }
  const jar = await cookies();
  jar.set(ACCESS_COOKIE, code, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  return Response.json({ ok: true });
}
