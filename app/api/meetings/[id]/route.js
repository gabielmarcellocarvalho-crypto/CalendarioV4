import { getCalendar, getTimezone } from "../../../../lib/google";
import { hasAccess, unauthorized } from "../../../../lib/access";

export const dynamic = "force-dynamic";

function pad(n) {
  return String(n).padStart(2, "0");
}

function toLocalDateTime(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:00`;
}

export async function DELETE(request, { params }) {
  if (!hasAccess(request)) return unauthorized();
  const calendar = await getCalendar();
  if (!calendar) {
    return Response.json({ error: "not_connected" }, { status: 409 });
  }
  const { id } = await params;
  try {
    await calendar.events.delete({
      calendarId: "primary",
      eventId: id,
      sendUpdates: "all",
    });
    return Response.json({ ok: true });
  } catch (err) {
    console.error("[meetings:delete]", err?.message || err);
    return Response.json(
      { error: "google_error", message: err?.message || "Falha ao cancelar." },
      { status: 502 }
    );
  }
}

export async function PATCH(request, { params }) {
  if (!hasAccess(request)) return unauthorized();
  const calendar = await getCalendar();
  if (!calendar) {
    return Response.json({ error: "not_connected" }, { status: 409 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null);
  const { date, time, durationMin, title, description } = body || {};

  const hasReschedule = date !== undefined || time !== undefined;
  const requestBody = {};

  if (hasReschedule) {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(String(date || "")) || !/^\d{2}:\d{2}$/.test(String(time || ""))) {
      return Response.json(
        { error: "validation", message: "Data/hora inválida." },
        { status: 400 }
      );
    }
    const duration = Number(durationMin) || 30;
    const start = new Date(`${date}T${time}:00`);
    const end = new Date(start.getTime() + duration * 60000);
    const timeZone = getTimezone();
    requestBody.start = { dateTime: toLocalDateTime(start), timeZone };
    requestBody.end = { dateTime: toLocalDateTime(end), timeZone };
  }

  if (typeof title === "string" && title.trim()) {
    requestBody.summary = title.trim();
  }
  if (typeof description === "string") {
    requestBody.description = description;
  }

  if (Object.keys(requestBody).length === 0) {
    return Response.json(
      { error: "validation", message: "Nada para atualizar." },
      { status: 400 }
    );
  }

  try {
    const { data } = await calendar.events.patch({
      calendarId: "primary",
      eventId: id,
      sendUpdates: "all",
      requestBody,
    });
    return Response.json({ ok: true, id: data.id });
  } catch (err) {
    console.error("[meetings:patch]", err?.message || err);
    return Response.json(
      { error: "google_error", message: err?.message || "Falha ao atualizar." },
      { status: 502 }
    );
  }
}
