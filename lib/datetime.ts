export const IST_TIMEZONE = 'Asia/Kolkata'

/**
 * Formats a date into India Standard Time (IST / Asia/Kolkata).
 * e.g. "30 Sep 2026"
 */
export function formatDate(
  value?: string | number | Date | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...options,
  }).format(date)
}

/**
 * Formats a date and time into India Standard Time (IST / Asia/Kolkata).
 * e.g. "30 Sep 2026, 08:30 pm"
 */
export function formatDateTime(
  value?: string | number | Date | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options,
  }).format(date)
}

/**
 * Formats time only into India Standard Time (IST / Asia/Kolkata).
 * e.g. "08:30 pm"
 */
export function formatTime(
  value?: string | number | Date | null,
  options?: Intl.DateTimeFormatOptions
): string {
  if (!value) return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (isNaN(date.getTime())) return '—'

  return new Intl.DateTimeFormat('en-IN', {
    timeZone: IST_TIMEZONE,
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
    ...options,
  }).format(date)
}
