import { google } from "googleapis";
import { getDb } from "./db";

// Google Calendar OAuth scopes
export const GOOGLE_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
];

// Outlook scopes (for future use)
export const OUTLOOK_SCOPES = [
  "Calendars.Read",
];

/**
 * Sync Google Calendar events for a user
 * @param {string} userId - User ID
 * @param {string} accessToken - Google OAuth access token
 * @param {number} year - Year to sync
 * @param {number} month - Month to sync (0-11)
 */
export async function syncGoogleCalendar(userId, accessToken, year, month) {
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: "v3", auth });

    // Define time range for month
    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    const response = await calendar.events.list({
      calendarId: "primary",
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
      orderBy: "startTime",
    });

    const events = response.data.items || [];
    const db = getDb();

    for (const event of events) {
      const startDate = new Date(event.start.dateTime || event.start.date);
      const endDate = event.end ? new Date(event.end.dateTime || event.end.date) : null;
      const isAllDay = !event.start.dateTime;

      // Insert or update event
      const stmt = db.prepare(
        `INSERT INTO calendar_events
         (user_id, event_id, source, title, description, start_date, end_date, all_day, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, source, event_id) DO UPDATE SET
         title = excluded.title,
         description = excluded.description,
         start_date = excluded.start_date,
         end_date = excluded.end_date,
         all_day = excluded.all_day,
         synced_at = CURRENT_TIMESTAMP`
      );

      stmt.run(
        userId,
        event.id,
        "google",
        event.summary || "Untitled",
        event.description || null,
        startDate.toISOString(),
        endDate ? endDate.toISOString() : null,
        isAllDay ? 1 : 0
      );
    }

    return {
      success: true,
      eventsImported: events.length,
      period: `${year}-${String(month + 1).padStart(2, "0")}`,
    };
  } catch (error) {
    console.error("Google Calendar sync error:", error);
    throw new Error(`Failed to sync Google Calendar: ${error.message}`);
  }
}

/**
 * Get holidays for a month (using Google Calendar as source)
 * Note: Assumes a shared "Holidays in Russia" calendar in Google Calendar
 */
export async function getHolidaysForMonth(userId, accessToken, year, month) {
  try {
    const auth = new google.auth.OAuth2();
    auth.setCredentials({ access_token: accessToken });

    const calendar = google.calendar({ version: "v3", auth });

    // Try to find holidays calendar
    const calendarList = await calendar.calendarList.list();
    const holidaysCalendar = calendarList.data.items.find(
      (cal) =>
        cal.summary &&
        (cal.summary.includes("Holiday") || cal.summary.includes("выходной"))
    );

    if (!holidaysCalendar) {
      console.warn("No holidays calendar found");
      return [];
    }

    const startDate = new Date(year, month, 1);
    const endDate = new Date(year, month + 1, 0, 23, 59, 59);

    const response = await calendar.events.list({
      calendarId: holidaysCalendar.id,
      timeMin: startDate.toISOString(),
      timeMax: endDate.toISOString(),
      singleEvents: true,
    });

    const holidays = response.data.items || [];
    return holidays.map((h) => ({
      date: new Date(h.start.date || h.start.dateTime).toISOString().split("T")[0],
      title: h.summary,
    }));
  } catch (error) {
    console.error("Get holidays error:", error);
    return [];
  }
}

/**
 * Sync Outlook Calendar (Microsoft Graph)
 * @param {string} userId - User ID
 * @param {string} accessToken - Microsoft Graph access token
 * @param {number} year - Year to sync
 * @param {number} month - Month to sync (0-11)
 */
export async function syncOutlookCalendar(userId, accessToken, year, month) {
  try {
    const startDate = new Date(year, month, 1).toISOString();
    const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

    const response = await fetch(
      `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${startDate}&endDateTime=${endDate}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Microsoft Graph error: ${response.statusText}`);
    }

    const data = await response.json();
    const events = data.value || [];

    const db = getDb();

    for (const event of events) {
      const startDate = new Date(event.start.dateTime || event.start.date);
      const endDate = event.end ? new Date(event.end.dateTime || event.end.date) : null;
      const isAllDay = event.isAllDay;

      const stmt = db.prepare(
        `INSERT INTO calendar_events
         (user_id, event_id, source, title, description, start_date, end_date, all_day, synced_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
         ON CONFLICT(user_id, source, event_id) DO UPDATE SET
         title = excluded.title,
         description = excluded.description,
         start_date = excluded.start_date,
         end_date = excluded.end_date,
         all_day = excluded.all_day,
         synced_at = CURRENT_TIMESTAMP`
      );

      stmt.run(
        userId,
        event.id,
        "outlook",
        event.subject || "Untitled",
        event.bodyPreview || null,
        startDate.toISOString(),
        endDate ? endDate.toISOString() : null,
        isAllDay ? 1 : 0
      );
    }

    return {
      success: true,
      eventsImported: events.length,
      period: `${year}-${String(month + 1).padStart(2, "0")}`,
    };
  } catch (error) {
    console.error("Outlook Calendar sync error:", error);
    throw new Error(`Failed to sync Outlook Calendar: ${error.message}`);
  }
}

/**
 * Get synced calendar events for a month
 */
export function getSyncedEvents(userId, year, month) {
  const db = getDb();
  const startDate = new Date(year, month, 1).toISOString();
  const endDate = new Date(year, month + 1, 0, 23, 59, 59).toISOString();

  const events = db
    .prepare(
      `SELECT * FROM calendar_events
       WHERE user_id = ? AND start_date >= ? AND start_date <= ?
       ORDER BY start_date`
    )
    .all(userId, startDate, endDate);

  return events;
}
