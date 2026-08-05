import {
  getCalendar,
  extractMeetingCode,
  findRecordingLink,
  meetRecordingLookupEnabled,
} from "../../../../../lib/google";
import { hasAccess, unauthorized } from "../../../../../lib/access";

export const dynamic = "force-dynamic";

export async function GET(request, { params }) {
  if (!hasAccess(request)) return unauthorized();

  if (!meetRecordingLookupEnabled()) {
    return Response.json({ enabled: false, url: null });
  }

  const calendar = await getCalendar();
  if (!calendar) {
    return Response.json({ error: "not_connected" }, { status: 409 });
  }

  const { id } = await params;

  try {
    const { data: event } = await calendar.events.get({
      calendarId: "primary",
      eventId: id,
    });
    const meetingCode = extractMeetingCode(event.hangoutLink);
    const url = await findRecordingLink(meetingCode);
    return Response.json({ enabled: true, url });
  } catch (err) {
    console.error("[meetings:recording]", err?.message || err);
    return Response.json(
      { error: "google_error", message: err?.message || "Falha ao buscar a gravação." },
      { status: 502 }
    );
  }
}
