export type Calendar = { id: string; name: string };
export type CalendarEvent = { id: string; calendarId: string; title: string; startsAt: string; endsAt: string; allDay: boolean };

type CalendarResponse = { calendars: Calendar[] };
type EventsResponse = { events: CalendarEvent[] };

async function readJSON<T>(url: string, signal?: AbortSignal): Promise<T> {
  const response = await fetch(url, { signal });
  if (!response.ok) throw new Error(`calendar_${response.status}`);
  return response.json() as Promise<T>;
}

export async function getCalendars(accountId: string, signal?: AbortSignal): Promise<Calendar[]> {
  const result = await readJSON<CalendarResponse>(`/v1/calendars/apple/${encodeURIComponent(accountId)}`, signal);
  return result.calendars;
}

export async function getCalendarEvents(accountId: string, calendarId: string, from: Date, to: Date, signal?: AbortSignal): Promise<CalendarEvent[]> {
  const params = new URLSearchParams({ calendar: calendarId, from: from.toISOString(), to: to.toISOString() });
  const result = await readJSON<EventsResponse>(`/v1/calendars/apple/${encodeURIComponent(accountId)}/events?${params}`, signal);
  return result.events;
}
