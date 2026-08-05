import { clearTokenStore } from "../../../../lib/google";
import { hasAccess, unauthorized } from "../../../../lib/access";

export const dynamic = "force-dynamic";

export async function POST(request) {
  if (!hasAccess(request)) return unauthorized();
  clearTokenStore();
  return Response.json({ ok: true });
}
