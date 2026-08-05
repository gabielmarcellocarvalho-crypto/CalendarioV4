import fs from "fs";
import path from "path";
import { google } from "googleapis";

const DATA_DIR = path.join(process.cwd(), "data");
const TOKEN_PATH = path.join(DATA_DIR, "google-tokens.json");

export const APP_TAG = "calendario-sdr";

export function getTimezone() {
  return process.env.TIMEZONE || "America/Sao_Paulo";
}

export function getBaseUrl() {
  return (process.env.APP_BASE_URL || "http://localhost:3000").replace(/\/$/, "");
}

export function getRedirectUri() {
  return `${getBaseUrl()}/api/auth/callback`;
}

export function hasCredentials() {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

// A API pública do Google Meet não permite ligar gravação automática por API
// (não existe esse campo no schema real do Meet REST API v2) — gravar é sempre
// uma ação manual de quem estiver como anfitrião/co-anfitrião na call. O que a
// API permite de fato é, depois da call, localizar o link da gravação que foi
// salva no Drive do organizador. É isso que esta flag habilita.
export function meetRecordingLookupEnabled() {
  return String(process.env.MEET_SHOW_RECORDINGS).toLowerCase() === "true";
}

export function getScopes() {
  const scopes = [
    "https://www.googleapis.com/auth/calendar.events",
    "https://www.googleapis.com/auth/userinfo.email",
    "https://www.googleapis.com/auth/userinfo.profile",
  ];
  if (meetRecordingLookupEnabled()) {
    scopes.push("https://www.googleapis.com/auth/meetings.space.readonly");
  }
  return scopes;
}

// ---------- Persistência de tokens (arquivo local em ./data) ----------

export function loadTokenStore() {
  try {
    return JSON.parse(fs.readFileSync(TOKEN_PATH, "utf8"));
  } catch {
    return null;
  }
}

export function saveTokenStore(store) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(store, null, 2), "utf8");
}

export function clearTokenStore() {
  try {
    fs.unlinkSync(TOKEN_PATH);
  } catch {
    /* já removido */
  }
}

export function isConnected() {
  const store = loadTokenStore();
  return Boolean(store && store.tokens && (store.tokens.refresh_token || store.tokens.access_token));
}

// ---------- Clientes OAuth ----------

export function getOAuthClient() {
  return new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    getRedirectUri()
  );
}

export function getAuthorizedClient() {
  const store = loadTokenStore();
  if (!store || !store.tokens) return null;
  const client = getOAuthClient();
  client.setCredentials(store.tokens);
  // Persiste tokens renovados (access_token expira; refresh_token é reaproveitado)
  client.on("tokens", (tokens) => {
    const current = loadTokenStore() || { tokens: {} };
    current.tokens = { ...current.tokens, ...tokens };
    saveTokenStore(current);
  });
  return client;
}

export function getCalendar() {
  const auth = getAuthorizedClient();
  if (!auth) return null;
  return google.calendar({ version: "v3", auth });
}

// ---------- Link da gravação após a call (Meet REST API) ----------
// Extrai o código da sala (ex.: "abc-defg-hij") de um link do Meet.
export function extractMeetingCode(meetLink) {
  if (!meetLink) return null;
  const match = String(meetLink).match(/meet\.google\.com\/([a-z]+-[a-z]+-[a-z]+)/i);
  return match ? match[1] : null;
}

// Busca o link de reprodução (Google Drive) da gravação de uma call que já
// aconteceu, se alguém tiver apertado "Gravar" durante a reunião. Retorna
// null se a call ainda não ocorreu, ninguém gravou, ou o recurso não estiver
// habilitado/permitido.
export async function findRecordingLink(meetingCode) {
  if (!meetRecordingLookupEnabled() || !meetingCode) return null;
  try {
    const auth = getAuthorizedClient();
    if (!auth) return null;
    const meet = google.meet({ version: "v2", auth });

    const { data: recordsData } = await meet.conferenceRecords.list({
      filter: `space.meeting_code = "${meetingCode}"`,
      pageSize: 1,
    });
    const record = recordsData.conferenceRecords?.[0];
    if (!record?.name) return null;

    const { data: recordingsData } = await meet.conferenceRecords.recordings.list({
      parent: record.name,
    });
    const recording = recordingsData.recordings?.[0];
    return recording?.driveDestination?.exportUri || null;
  } catch (err) {
    console.warn("[meet] falha ao buscar gravação:", err?.message || err);
    return null;
  }
}
