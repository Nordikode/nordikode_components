import { toBcp47 } from './money'
import type { NkConversationEntry } from './types/NkConversationEntry'

/**
 * Dato og tid i samtalevisningen (SIGN-1313). Alt formateres av Intl med
 * brukerens UI-språk som full BCP 47-tag og tidssonen appen oppgir (ellers
 * nettleserens). Ingen tekster: «i dag» og «i går» kommer fra
 * `Intl.RelativeTimeFormat`, og de skrives slik språket selv skriver dem.
 */

/** En dag i samtalen med innslagene som hører til den. */
export interface NkConversationDay {
  /** Dagen som `YYYY-MM-DD` i tidssonen som brukes. */
  key: string
  label: string
  entries: NkConversationEntry[]
}

function dayKey(date: Date, timeZone?: string): string {
  // en-CA gir YYYY-MM-DD; her er den et format, ikke et språkvalg.
  return new Intl.DateTimeFormat('en-CA', { timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).format(date)
}

function dayNumber(key: string): number {
  const [year, month, day] = key.split('-').map(Number)

  return Math.round(Date.UTC(year, month - 1, day) / 86_400_000)
}

/** «i dag», «i går», ellers ukedag og dato — med år når det ikke er i år. */
export function formatConversationDay(at: string | Date, locale: string, now: Date = new Date(), timeZone?: string): string {
  const date = typeof at === 'string' ? new Date(at) : at
  const tag = toBcp47(locale)
  const key = dayKey(date, timeZone)
  const todayKey = dayKey(now, timeZone)
  const daysAgo = dayNumber(todayKey) - dayNumber(key)

  if (daysAgo === 0 || daysAgo === 1) {
    return new Intl.RelativeTimeFormat(tag, { numeric: 'auto' }).format(-daysAgo, 'day')
  }

  return new Intl.DateTimeFormat(tag, {
    timeZone,
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: key.slice(0, 4) === todayKey.slice(0, 4) ? undefined : 'numeric',
  }).format(date)
}

/** Klokkeslettet, slik språket skriver det. */
export function formatConversationTime(at: string | Date, locale: string, timeZone?: string): string {
  const date = typeof at === 'string' ? new Date(at) : at

  return new Intl.DateTimeFormat(toBcp47(locale), { timeZone, timeStyle: 'short' }).format(date)
}

/** Tiden i en samtaleliste: klokkeslett i dag, ellers kort dato — med år når det ikke er i år. */
export function formatConversationListTime(at: string | Date, locale: string, now: Date = new Date(), timeZone?: string): string {
  const date = typeof at === 'string' ? new Date(at) : at
  const key = dayKey(date, timeZone)
  const todayKey = dayKey(now, timeZone)

  if (key === todayKey) {
    return formatConversationTime(date, locale, timeZone)
  }

  return new Intl.DateTimeFormat(toBcp47(locale), {
    timeZone,
    day: 'numeric',
    month: 'short',
    year: key.slice(0, 4) === todayKey.slice(0, 4) ? undefined : 'numeric',
  }).format(date)
}

/** Innslagene i rekkefølgen de kom, delt per dag. */
export function groupConversationEntries(
  entries: ReadonlyArray<NkConversationEntry>,
  locale: string,
  now: Date = new Date(),
  timeZone?: string,
): NkConversationDay[] {
  const days: NkConversationDay[] = []

  for (const entry of entries) {
    const key = dayKey(new Date(entry.at), timeZone)
    const last = days[days.length - 1]

    if (last && last.key === key) {
      last.entries.push(entry)
    } else {
      days.push({ key, label: formatConversationDay(entry.at, locale, now, timeZone), entries: [entry] })
    }
  }

  return days
}
