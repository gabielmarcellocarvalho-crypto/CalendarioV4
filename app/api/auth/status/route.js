import {
  hasCredentials,
  isConnected,
  loadTokenStore,
  getRedirectUri,
  getBaseUrl,
  meetRecordingLookupEnabled,
  getTimezone,
} from "../../../../lib/google";
import { hasAccess, unauthorized } from "../../../../lib/access";

export const dynamic = "force-dynamic";

export async function GET(request) {
  if (!hasAccess(request)) return unauthorized();
  const store = loadTokenStore();
  return Response.json({
    credentialsConfigured: hasCredentials(),
    connected: isConnected(),
    email: store?.email || null,
    name: store?.name || null,
    connectedAt: store?.connectedAt || null,
    redirectUri: getRedirectUri(),
    baseUrl: getBaseUrl(),
    showRecordings: meetRecordingLookupEnabled(),
    timezone: getTimezone(),
    sdrEmail: process.env.SDR_EMAIL || null,
  });
}
