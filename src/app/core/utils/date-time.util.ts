/**
 * Utility functions for handling Egypt Time (Africa/Cairo)
 * Egypt uses UTC+3 in summer (Daylight Saving Time) and UTC+2 in winter.
 */

export const EGYPT_TIMEZONE = 'Africa/Cairo';

/**
 * Normalizes an ISO date string from the server (which was created with DateTime.UtcNow)
 * so that it always includes the 'Z' UTC indicator if missing.
 */
export function normalizeUtcString(val: any): string {
  if (!val) return '';
  let str = String(val).trim();
  // If it is an ISO string with time but no timezone indicator (no 'Z' and no '+' or '-' timezone offset)
  // e.g. "2026-09-26T22:47:21" or "2026-09-26T22:47:21.123"
  if (str.includes('T') && !str.endsWith('Z') && !/[+-]\d{2}(:\d{2})?$/.test(str)) {
    str += 'Z';
  }
  return str;
}

/**
 * Parses any date string or Date object into a correct Date object,
 * ensuring UTC timestamps from the server are interpreted as UTC.
 */
export function parseServerDate(val: string | Date | null | undefined): Date {
  if (!val) return new Date();
  if (val instanceof Date) return val;

  const normalized = normalizeUtcString(val);
  const d = new Date(normalized);
  return isNaN(d.getTime()) ? new Date() : d;
}

/**
 * Format time in Egypt timezone (Africa/Cairo) e.g. "1:47 ص"
 */
export function formatEgyptTime(val: string | Date | null | undefined): string {
  if (!val) return '';
  const date = parseServerDate(val);

  return date.toLocaleTimeString('ar-EG', {
    timeZone: EGYPT_TIMEZONE,
    hour: 'numeric',
    minute: '2-digit',
    hour12: true
  });
}

/**
 * Format date key for chat grouping (اليوم, أمس, or full date) in Egypt timezone
 */
export function formatEgyptDateKey(val: string | Date | null | undefined): string {
  if (!val) return 'غير محدد';
  const date = parseServerDate(val);
  const now = new Date();

  // Format YYYY-MM-DD in Egypt timezone to compare days accurately
  const dateInEgypt = date.toLocaleDateString('en-CA', { timeZone: EGYPT_TIMEZONE });
  const nowInEgypt = now.toLocaleDateString('en-CA', { timeZone: EGYPT_TIMEZONE });

  // Yesterday in Egypt
  const yesterday = new Date(now.getTime() - 86400000);
  const yesterdayInEgypt = yesterday.toLocaleDateString('en-CA', { timeZone: EGYPT_TIMEZONE });

  if (dateInEgypt === nowInEgypt) return 'اليوم';
  if (dateInEgypt === yesterdayInEgypt) return 'أمس';

  return date.toLocaleDateString('ar-EG', {
    timeZone: EGYPT_TIMEZONE,
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

/**
 * Format full date and time in Egypt timezone, e.g. "2026/09/27 - 01:47 ص"
 */
export function formatEgyptDateTime(val: string | Date | null | undefined): string {
  if (!val) return '';
  const date = parseServerDate(val);

  const datePart = date.toLocaleDateString('ar-EG', {
    timeZone: EGYPT_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });

  const timePart = date.toLocaleTimeString('ar-EG', {
    timeZone: EGYPT_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });

  return `${datePart} - ${timePart}`;
}
