import crypto from "crypto";
import { getCalendar, getTimezone, APP_TAG } from "../../../lib/google";
import { hasAccess, unauthorized } from "../../../lib/access";

export const dynamic = "force-dynamic";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function pad(n) {
  return String(n).padStart(2, "0");
}

function toLocalDateTime(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:00`;
}

function notConnected() {
  return Response.json(
    {
      error: "not_connected",
      message:
        "Nenhuma conta Google conectada. Peça ao administrador para conectar em Configurações.",
    },
    { status: 409 }
  );
}

function mapEvent(ev) {
  return {
    id: ev.id,
    title: ev.summary || "(sem título)",
    description: ev.description || "",
    start: ev.start?.dateTime || ev.start?.date,
    end: ev.end?.dateTime || ev.end?.date,
    meetLink: ev.hangoutLink || null,
    htmlLink: ev.htmlLink || null,
    status: ev.status,
    attendees: (ev.attendees || [])
      .filter((a) => !a.organizer)
      .map((a) => ({ email: a.email, response: a.responseStatus })),
    leadName: ev.extendedProperties?.private?.leadName || null,
  };
}

export async function GET(request) {
  if (!hasAccess(request)) return unauthorized();
  const calendar = getCalendar();
  if (!calendar) return notConnected();

  try {
    const timeMin = new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString();
    const { data } = await calendar.events.list({
      calendarId: "primary",
      privateExtendedProperty: `app=${APP_TAG}`,
      singleEvents: true,
      orderBy: "startTime",
      timeMin,
      maxResults: 100,
      timeZone: getTimezone(),
    });
    const items = (data.items || [])
      .filter((ev) => ev.status !== "cancelled")
      .map(mapEvent);
    return Response.json({ meetings: items });
  } catch (err) {
    console.error("[meetings:list]", err?.message || err);
    return Response.json(
      { error: "google_error", message: err?.message || "Falha ao consultar a agenda." },
      { status: 502 }
    );
  }
}

export async function POST(request) {
  if (!hasAccess(request)) return unauthorized();
  const calendar = getCalendar();
  if (!calendar) return notConnected();

  const body = await request.json().catch(() => null);
  if (!body) {
    return Response.json({ error: "bad_request", message: "Corpo inválido." }, { status: 400 });
  }

  const {
    leadName,
    leadEmail,
    extraEmails = "",
    date,
    time,
    durationMin = 30,
    notes = "",
    notify = true,
  } = body;

  // Validações
  const errors = [];
  if (!leadName || !String(leadName).trim()) errors.push("Informe o nome do lead.");
  if (!leadEmail || !EMAIL_RE.test(String(leadEmail).trim()))
    errors.push("E-mail do lead inválido.");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || ""))) errors.push("Data inválida.");
  if (!/^\d{2}:\d{2}$/.test(String(time || ""))) errors.push("Horário inválido.");
  const duration = Number(durationMin);
  if (!Number.isFinite(duration) || duration < 10 || duration > 480)
    errors.push("Duração inválida.");

  const extras = String(extraEmails)
    .split(/[,;\s]+/)
    .map((e) => e.trim())
    .filter(Boolean);
  for (const e of extras) {
    if (!EMAIL_RE.test(e)) errors.push(`E-mail adicional inválido: ${e}`);
  }

  if (errors.length) {
    return Response.json({ error: "validation", message: errors.join(" ") }, { status: 400 });
  }

  const start = new Date(`${date}T${time}:00`);
  if (isNaN(start.getTime())) {
    return Response.json({ error: "validation", message: "Data/hora inválida." }, { status: 400 });
  }
  const end = new Date(start.getTime() + duration * 60000);
  const timeZone = getTimezone();

  const attendeeSet = new Map();
  attendeeSet.set(String(leadEmail).trim().toLowerCase(), { email: String(leadEmail).trim() });
  for (const e of extras) attendeeSet.set(e.toLowerCase(), { email: e });
  if (process.env.SDR_EMAIL && EMAIL_RE.test(process.env.SDR_EMAIL)) {
    attendeeSet.set(process.env.SDR_EMAIL.toLowerCase(), { email: process.env.SDR_EMAIL });
  }

  const descriptionParts = [];
  if (notes && String(notes).trim()) descriptionParts.push(String(notes).trim());
  descriptionParts.push(`Lead: ${String(leadName).trim()}`);
  descriptionParts.push("— Agendado via Calendário SDR · V4 Company");

  try {
    const { data: event } = await calendar.events.insert({
      calendarId: "primary",
      conferenceDataVersion: 1,
      sendUpdates: notify ? "all" : "none",
      requestBody: {
        summary: `Reunião V4 — ${String(leadName).trim()}`,
        description: descriptionParts.join("\n\n"),
        start: { dateTime: toLocalDateTime(start), timeZone },
        end: { dateTime: toLocalDateTime(end), timeZone },
        attendees: Array.from(attendeeSet.values()),
        conferenceData: {
          createRequest: {
            requestId: crypto.randomUUID(),
            conferenceSolutionKey: { type: "hangoutsMeet" },
          },
        },
        guestsCanModify: false,
        guestsCanInviteOthers: false,
        reminders: { useDefault: true },
        extendedProperties: {
          private: { app: APP_TAG, leadName: String(leadName).trim() },
        },
      },
    });

    return Response.json({ meeting: mapEvent(event) }, { status: 201 });
  } catch (err) {
    console.error("[meetings:create]", err?.message || err);
    return Response.json(
      { error: "google_error", message: err?.message || "Falha ao criar o evento." },
      { status: 502 }
    );
  }
}
