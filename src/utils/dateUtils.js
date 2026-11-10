export function parseDateOnly(value) {
  if (!value) return null
  // YYYY-MM-DD -> construct as local date to avoid timezone shifts
  const isoDateMatch = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoDateMatch) {
    const y = Number(isoDateMatch[1])
    const m = Number(isoDateMatch[2])
    const d = Number(isoDateMatch[3])
    return new Date(y, m - 1, d)
  }

  // fallback to Date constructor
  const parsed = new Date(value)
  return isNaN(parsed.getTime()) ? null : parsed
}

export function formatDateShort(value, locale = 'es-MX') {
  const d = parseDateOnly(value)
  if (!d) return 'N/A'
  return d.toLocaleDateString(locale, { day: 'numeric', month: 'short' })
}

export function formatDateLong(value, locale = 'es-MX') {
  const d = parseDateOnly(value)
  if (!d) return 'N/A'
  return d.toLocaleDateString(locale)
}
