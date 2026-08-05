export const ACCESS_COOKIE = "sdr_access";

export function accessRequired() {
  return Boolean(process.env.APP_ACCESS_CODE);
}

export function hasAccess(request) {
  if (!accessRequired()) return true;
  const code = process.env.APP_ACCESS_CODE;
  const cookie = request.cookies?.get?.(ACCESS_COOKIE)?.value;
  if (cookie && cookie === code) return true;
  const header = request.headers?.get?.("x-access-code");
  return Boolean(header && header === code);
}

export function unauthorized() {
  return Response.json(
    { error: "access_denied", message: "Código de acesso inválido ou ausente." },
    { status: 401 }
  );
}
