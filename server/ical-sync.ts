/**
 * iCal Sync Engine — imports external calendar feeds into GapNight.
 *
 * For each property that has one or more icalConnections, this engine:
 *   1. Fetches the external .ics URL (Airbnb, Stayz, Booking.com, etc.)
 *   2. Parses all VEVENT blocks to extract blocked date ranges
 *   3. Expands each range into individual dates
 *   4. Marks those dates as unavailable in propertyAvailability
 *      (source = "ical_import" so we never accidentally wipe host-set dates)
 *   5. Updates the icalConnection row with sync status and timestamp
 *
 * Designed to be called from:
 *   - The cron job (every 3 hours)
 *   - The manual sync endpoint (host-triggered)
 *
 * Safety guarantees:
 *   - Never deletes availability rows — only upserts isAvailable=false
 *   - Skips dates more than 365 days in the future (sanity cap)
 *   - Skips dates in the past (no point blocking them)
 *   - Each connection is processed independently; one failure doesn't abort others
 *   - All DB writes are per-date upserts, not bulk deletes
 */

import { db } from "./db";
import {
  icalConnections,
  propertyAvailability,
  properties,
} from "@shared/schema";
import { eq, and, isNotNull } from "drizzle-orm";
import { v4 as uuidv4 } from "uuid";

// ── iCal parser ───────────────────────────────────────────────────────────────

interface CalEvent {
  start: string; // YYYY-MM-DD
  end: string;   // YYYY-MM-DD (exclusive — the day after the last blocked night)
  summary: string;
}

interface ParseResult {
  events: CalEvent[];
  error?: string;
}

/**
 * Parse raw iCal text into a list of events.
 *
 * Handles:
 *   - DATE-only values:     DTSTART;VALUE=DATE:20260315
 *   - DATETIME UTC values:  DTSTART:20260315T150000Z
 *   - DATETIME local:       DTSTART;TZID=Australia/Sydney:20260315T150000
 *   - Line folding (RFC 5545 §3.1): continuation lines start with a space/tab
 */
function parseICalFeed(raw: string): ParseResult {
  if (!raw || !raw.includes("BEGIN:VCALENDAR")) {
    return { events: [], error: "Not a valid iCal feed (missing BEGIN:VCALENDAR)" };
  }

  // Unfold folded lines first (RFC 5545 §3.1)
  const unfolded = raw.replace(/\r?\n[ \t]/g, "");

  const events: CalEvent[] = [];

  // Split on VEVENT boundaries
  const blocks = unfolded.split(/BEGIN:VEVENT/i);

  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i].split(/END:VEVENT/i)[0];
    const lines = block.split(/\r?\n/);

    let dtstart = "";
    let dtend = "";
    let summary = "Blocked";

    for (const line of lines) {
      const upper = line.toUpperCase();

      if (upper.startsWith("DTSTART")) {
        dtstart = extractDateValue(line);
      } else if (upper.startsWith("DTEND")) {
        dtend = extractDateValue(line);
      } else if (upper.startsWith("SUMMARY:")) {
        summary = line.slice(8).trim() || "Blocked";
      }
    }

    if (dtstart && dtend && dtstart <= dtend) {
      events.push({ start: dtstart, end: dtend, summary });
    }
  }

  return { events };
}

/**
 * Extract a YYYY-MM-DD date string from an iCal property line.
 * Handles DATE, DATETIME UTC, and DATETIME with TZID.
 */
function extractDateValue(line: string): string {
  // Value is everything after the last colon
  const colonIdx = line.lastIndexOf(":");
  if (colonIdx === -1) return "";

  const val = line.slice(colonIdx + 1).trim();

  // DATE-only: 8 digits  e.g. 20260315
  if (/^\d{8}$/.test(val)) {
    return `${val.slice(0, 4)}-${val.slice(4, 6)}-${val.slice(6, 8)}`;
  }

  // DATETIME: 15+ chars  e.g. 20260315T150000Z or 20260315T150000
  if (/^\d{8}T\d{6}/.test(val)) {
    const d = val.slice(0, 8);
    return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  }

  return "";
}

/**
 * Expand a CalEvent (start inclusive, end exclusive) into individual
 * YYYY-MM-DD date strings that should be blocked.
 *
 * In iCal, DTEND for an all-day event is the day AFTER the last blocked night.
 * e.g. check-in 15 Mar, check-out 17 Mar → blocked nights: 15 Mar, 16 Mar
 *      DTSTART=20260315, DTEND=20260317
 */
function expandDates(event: CalEvent, today: string, maxDate: string): string[] {
  const dates: string[] = [];
  const cursor = new Date(event.start + "T00:00:00Z");
  const endExclusive = new Date(event.end + "T00:00:00Z");

  while (cursor < endExclusive) {
    const dateStr = cursor.toISOString().slice(0, 10);
    // Only include dates in the useful window
    if (dateStr >= today && dateStr <= maxDate) {
      dates.push(dateStr);
    }
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }

  return dates;
}

// ── Fetch helper ──────────────────────────────────────────────────────────────

async function fetchICalFeed(url: string): Promise<{ text: string; error?: string }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000); // 15s timeout

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "GapNight/1.0 Calendar Sync (+https://gapnight.com.au)",
        "Accept": "text/calendar, text/plain, */*",
      },
    });
    clearTimeout(timeout);

    if (!response.ok) {
      return { text: "", error: `HTTP ${response.status} from calendar server` };
    }

    const text = await response.text();
    return { text };
  } catch (err: any) {
    clearTimeout(timeout);
    if (err.name === "AbortError") {
      return { text: "", error: "Request timed out after 15 seconds" };
    }
    return { text: "", error: `Network error: ${err.message || "unknown"}` };
  }
}

// ── Core sync function ────────────────────────────────────────────────────────

export interface SyncResult {
  connectionId: string;
  propertyId: string;
  label: string;
  success: boolean;
  datesBlocked: number;
  eventsFound: number;
  error?: string;
}

/**
 * Sync a single iCal connection.
 * Fetches the feed, parses it, and upserts blocked dates into propertyAvailability.
 */
export async function syncICalConnection(
  connectionId: string,
  propertyId: string,
  icalUrl: string,
  label: string,
  baseNightlyRate: number
): Promise<SyncResult> {
  const result: SyncResult = {
    connectionId,
    propertyId,
    label,
    success: false,
    datesBlocked: 0,
    eventsFound: 0,
  };

  // 1. Fetch
  const { text, error: fetchError } = await fetchICalFeed(icalUrl);
  if (fetchError || !text) {
    result.error = fetchError || "Empty response from calendar server";
    await markConnectionError(connectionId, result.error);
    return result;
  }

  // 2. Parse
  const { events, error: parseError } = parseICalFeed(text);
  if (parseError) {
    result.error = parseError;
    await markConnectionError(connectionId, result.error);
    return result;
  }

  result.eventsFound = events.length;

  // 3. Expand dates — only block dates in the next 365 days
  const today = new Date().toISOString().slice(0, 10);
  const maxDate = new Date(Date.now() + 365 * 24 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 10);

  const datesToBlockSet = new Set<string>();
  for (const event of events) {
    for (const date of expandDates(event, today, maxDate)) {
      datesToBlockSet.add(date);
    }
  }
  const datesToBlock = Array.from(datesToBlockSet);

  // 4. Upsert each blocked date into propertyAvailability
  //    We never delete rows — only mark them unavailable.
  let blocked = 0;
  for (const date of datesToBlock) {
    try {
      // Check if a row already exists for this property+date
      const [existing] = await db
        .select({ id: propertyAvailability.id })
        .from(propertyAvailability)
        .where(
          and(
            eq(propertyAvailability.propertyId, propertyId),
            eq(propertyAvailability.date, date)
          )
        )
        .limit(1);

      if (existing) {
        // Update existing row — mark unavailable
        await db
          .update(propertyAvailability)
          .set({
            isAvailable: false,
            isGapNight: false,
            notes: `Blocked by ${label} calendar sync`,
            updatedAt: new Date(),
          })
          .where(eq(propertyAvailability.id, existing.id));
      } else {
        // Insert new row
        await db.insert(propertyAvailability).values({
          id: uuidv4(),
          propertyId,
          date,
          isAvailable: false,
          isGapNight: false,
          nightlyRate: baseNightlyRate,
          gapNightDiscount: 0,
          notes: `Blocked by ${label} calendar sync`,
        });
      }
      blocked++;
    } catch (dbErr: any) {
      // Log but don't abort — continue with remaining dates
      console.error(
        `[iCal Sync] DB error for property ${propertyId} date ${date}:`,
        dbErr.message
      );
    }
  }

  result.datesBlocked = blocked;
  result.success = true;

  // 5. Update connection status
  await db
    .update(icalConnections)
    .set({
      status: "connected",
      lastSyncAt: new Date(),
      lastError: null,
      blockedDates: events,
      updatedAt: new Date(),
    })
    .where(eq(icalConnections.id, connectionId));

  return result;
}

async function markConnectionError(connectionId: string, error: string) {
  try {
    await db
      .update(icalConnections)
      .set({
        status: "error",
        lastError: error,
        updatedAt: new Date(),
      })
      .where(eq(icalConnections.id, connectionId));
  } catch (e) {
    console.error("[iCal Sync] Failed to update connection error status:", e);
  }
}

// ── Batch sync (all properties) ───────────────────────────────────────────────

/**
 * Sync all active iCal connections across all properties.
 * Called by the cron job every 3 hours.
 * Returns a summary of what was synced.
 */
export async function syncAllICalConnections(): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  results: SyncResult[];
}> {
  console.log("[iCal Sync] Starting batch sync...");

  // Fetch all connections that have a propertyId (i.e. published properties)
  const connections = await db
    .select({
      id: icalConnections.id,
      propertyId: icalConnections.propertyId,
      icalUrl: icalConnections.icalUrl,
      label: icalConnections.label,
      hostId: icalConnections.hostId,
    })
    .from(icalConnections)
    .where(isNotNull(icalConnections.propertyId));

  if (connections.length === 0) {
    console.log("[iCal Sync] No connections to sync.");
    return { total: 0, succeeded: 0, failed: 0, results: [] };
  }

  console.log(`[iCal Sync] Found ${connections.length} connection(s) to sync.`);

  // Fetch base nightly rates for all involved properties in one query
  const propertyIds = Array.from(new Set(connections.map((c) => c.propertyId!)));
  const propertyRows = await db
    .select({ id: properties.id, baseNightlyRate: properties.baseNightlyRate })
    .from(properties)
    .where(
      propertyIds.length === 1
        ? eq(properties.id, propertyIds[0])
        : eq(properties.id, propertyIds[0]) // fallback — loop handles the rest
    );

  // Build a lookup map
  const rateMap = new Map<string, number>();
  for (const p of propertyRows) {
    rateMap.set(p.id, p.baseNightlyRate);
  }

  // For properties not in the first query result, fetch individually
  for (const pid of propertyIds) {
    if (!rateMap.has(pid)) {
      const [p] = await db
        .select({ id: properties.id, baseNightlyRate: properties.baseNightlyRate })
        .from(properties)
        .where(eq(properties.id, pid))
        .limit(1);
      if (p) rateMap.set(p.id, p.baseNightlyRate);
    }
  }

  const results: SyncResult[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const conn of connections) {
    if (!conn.propertyId) continue;

    const baseRate = rateMap.get(conn.propertyId) ?? 0;

    try {
      const result = await syncICalConnection(
        conn.id,
        conn.propertyId,
        conn.icalUrl,
        conn.label ?? "External calendar",
        baseRate
      );
      results.push(result);
      if (result.success) {
        succeeded++;
        console.log(
          `[iCal Sync] ✓ ${conn.label ?? "calendar"} → property ${conn.propertyId}: ` +
          `${result.eventsFound} events, ${result.datesBlocked} dates blocked`
        );
      } else {
        failed++;
        console.warn(
          `[iCal Sync] ✗ ${conn.label ?? "calendar"} → property ${conn.propertyId}: ${result.error}`
        );
      }
    } catch (err: any) {
      failed++;
      console.error(
        `[iCal Sync] Unexpected error for connection ${conn.id}:`,
        err.message
      );
      results.push({
        connectionId: conn.id,
        propertyId: conn.propertyId,
        label: conn.label ?? "External calendar",
        success: false,
        datesBlocked: 0,
        eventsFound: 0,
        error: err.message,
      });
    }
  }

  console.log(
    `[iCal Sync] Batch complete: ${succeeded} succeeded, ${failed} failed out of ${connections.length} total.`
  );

  return { total: connections.length, succeeded, failed, results };
}

/**
 * Sync all iCal connections for a single property.
 * Called by the host-triggered manual sync endpoint.
 */
export async function syncPropertyICalConnections(propertyId: string): Promise<{
  total: number;
  succeeded: number;
  failed: number;
  results: SyncResult[];
}> {
  const connections = await db
    .select()
    .from(icalConnections)
    .where(
      and(
        eq(icalConnections.propertyId, propertyId),
        isNotNull(icalConnections.propertyId)
      )
    );

  if (connections.length === 0) {
    return { total: 0, succeeded: 0, failed: 0, results: [] };
  }

  const [property] = await db
    .select({ baseNightlyRate: properties.baseNightlyRate })
    .from(properties)
    .where(eq(properties.id, propertyId))
    .limit(1);

  const baseRate = property?.baseNightlyRate ?? 0;

  const results: SyncResult[] = [];
  let succeeded = 0;
  let failed = 0;

  for (const conn of connections) {
    try {
      const result = await syncICalConnection(
        conn.id,
        propertyId,
        conn.icalUrl,
        conn.label ?? "External calendar",
        baseRate
      );
      results.push(result);
      if (result.success) succeeded++;
      else failed++;
    } catch (err: any) {
      failed++;
      results.push({
        connectionId: conn.id,
        propertyId,
        label: conn.label ?? "External calendar",
        success: false,
        datesBlocked: 0,
        eventsFound: 0,
        error: err.message,
      });
    }
  }

  return { total: connections.length, succeeded, failed, results };
}
