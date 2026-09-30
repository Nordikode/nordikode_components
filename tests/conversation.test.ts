import { describe, expect, it } from 'vitest'

import {
  formatConversationDay,
  formatConversationListTime,
  formatConversationTime,
  formatFileSize,
  groupConversationEntries,
} from '../src/conversation'
import type { NkConversationEntry } from '../src/types/NkConversationEntry'

const now = new Date('2026-09-30T10:00:00Z')
const zone = 'Europe/Oslo'

const entry = (id: string, at: string): NkConversationEntry => ({ id, kind: 'message', text: id, at })

describe('dagen i samtalen', () => {
  it('sier i dag og i går slik språket selv gjør', () => {
    expect(formatConversationDay('2026-09-30T06:00:00Z', 'no', now, zone)).toBe('i dag')
    expect(formatConversationDay('2026-09-29T06:00:00Z', 'no', now, zone)).toBe('i går')
    expect(formatConversationDay('2026-09-30T06:00:00Z', 'en', now, zone)).toBe('today')
    expect(formatConversationDay('2026-09-29T06:00:00Z', 'sv', now, zone)).toBe('i går')
    expect(formatConversationDay('2026-09-29T06:00:00Z', 'fr', now, zone)).toBe('hier')
    expect(formatConversationDay('2026-09-29T06:00:00Z', 'pl', now, zone)).toBe('wczoraj')
  })

  it('skriver ukedag og dato for eldre dager, med år bare når det ikke er i år', () => {
    expect(formatConversationDay('2026-09-25T06:00:00Z', 'no', now, zone)).toBe('fredag 25. september')
    expect(formatConversationDay('2025-12-24T06:00:00Z', 'no', now, zone)).toBe('onsdag 24. desember 2025')
    expect(formatConversationDay('2026-09-25T06:00:00Z', 'en', now, zone)).toBe('Friday 25 September')
  })

  it('regner dagen i tidssonen som oppgis, ikke i UTC', () => {
    // 22:30 UTC den 29. er 00:30 den 30. i Oslo.
    expect(formatConversationDay('2026-09-29T22:30:00Z', 'no', now, zone)).toBe('i dag')
    expect(formatConversationDay('2026-09-29T22:30:00Z', 'no', now, 'UTC')).toBe('i går')
  })
})

describe('klokkeslett', () => {
  it('følger språket', () => {
    expect(formatConversationTime('2026-09-30T12:03:00Z', 'no', zone)).toBe('14:03')
    expect(formatConversationTime('2026-09-30T12:03:00Z', 'en', zone)).toBe('14:03')
  })

  it('i en liste: klokkeslett i dag, ellers kort dato', () => {
    expect(formatConversationListTime('2026-09-30T06:15:00Z', 'no', now, zone)).toBe('08:15')
    // Forkortelsen av måneden følger ICU-versjonen: sjekk delene, ikke tegnsettingen.
    expect(formatConversationListTime('2026-09-25T06:15:00Z', 'no', now, zone)).toMatch(/^25\. sep\.?$/)
    expect(formatConversationListTime('2025-12-24T06:15:00Z', 'no', now, zone)).toMatch(/^24\. des\.? 2025$/)
  })
})

describe('gruppering per dag', () => {
  it('beholder rekkefølgen og lager én gruppe per dag', () => {
    const days = groupConversationEntries(
      [
        entry('a', '2026-09-28T08:00:00Z'),
        entry('b', '2026-09-28T09:00:00Z'),
        entry('c', '2026-09-29T22:30:00Z'),
        entry('d', '2026-09-30T07:00:00Z'),
      ],
      'no',
      now,
      zone,
    )

    expect(days.map((day) => day.key)).toEqual(['2026-09-28', '2026-09-30'])
    expect(days.map((day) => day.entries.map((item) => item.id))).toEqual([['a', 'b'], ['c', 'd']])
    expect(days[1].label).toBe('i dag')
  })

  it('gir ingen dager for en tom samtale', () => {
    expect(groupConversationEntries([], 'no', now, zone)).toEqual([])
  })
})

describe('filstørrelse (SIGN-1317)', () => {
  it('velger enhet etter størrelsen og skriver tallet på språket', () => {
    expect(formatFileSize(912, 'en')).toMatch(/^912 /)
    expect(formatFileSize(48 * 1024, 'en')).toBe('48 kB')
    expect(formatFileSize(1.25 * 1024 * 1024, 'en')).toBe('1.3 MB')
    expect(formatFileSize(1.25 * 1024 * 1024, 'no')).toBe('1,3 MB')
    expect(formatFileSize(48 * 1024, 'pl')).toBe('48 kB')
  })

  it('tåler tull', () => {
    expect(formatFileSize(-5, 'en')).toMatch(/^0 /)
    expect(formatFileSize(Number.NaN, 'sv')).toMatch(/^0 /)
  })
})
