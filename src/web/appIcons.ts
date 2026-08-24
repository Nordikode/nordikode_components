/**
 * Kanonisk ikonregister for Nordikode-appene på webflatene (nettsiden og
 * konto-appen). Én tegning per app — før dette registeret fantes tre ulike
 * portal-/sign-tegninger fordelt på fire filer i to repoer.
 *
 * Håndtegnede 24px-strektikoner, samme strek (1.5–1.6) som resten av
 * web-designspråket. Nye apper får sin oppføring her, ikke lokale kopier.
 */

export type WebAppIconName =
  | 'portal'
  | 'sign'
  | 'time'
  | 'website'
  | 'account'
  | 'backoffice'
  | 'helpcenter'
  | 'developer'
  | 'admin'

export const webAppIcons: Record<WebAppIconName, string[]> = {
  portal: [
    'M3.75 10.5 12 3.75l8.25 6.75',
    'M5.25 9.5V19a1 1 0 0 0 1 1h3.5v-5.25h4.5V20h3.5a1 1 0 0 0 1-1V9.5',
  ],
  sign: ['m14.5 5 4.5 4.5L8.5 20H4v-4.5L14.5 5Z', 'm12.5 7 4.5 4.5'],
  time: ['M12 3.25a8.75 8.75 0 1 1 0 17.5 8.75 8.75 0 0 1 0-17.5Z', 'M12 7.5V12l3 2'],
  website: [
    'M12 3.25a8.75 8.75 0 1 1 0 17.5 8.75 8.75 0 0 1 0-17.5Z',
    'M12 3.25c2.4 2.35 3.6 5.25 3.6 8.75s-1.2 6.4-3.6 8.75c-2.4-2.35-3.6-5.25-3.6-8.75s1.2-6.4 3.6-8.75Z',
    'M3.6 9.5h16.8M3.6 14.5h16.8',
  ],
  account: ['M5 7.5h8M17 7.5h2', 'M15 5.5v4', 'M5 16.5h2M11 16.5h8', 'M9 14.5v4'],
  backoffice: [
    'M5.75 20V5.5A1.5 1.5 0 0 1 7.25 4h6a1.5 1.5 0 0 1 1.5 1.5V20',
    'M14.75 9.5H18a1.5 1.5 0 0 1 1.5 1.5v9',
    'M4 20h17',
    'M8.75 7.75h2.5M8.75 11.25h2.5M8.75 14.75h2.5',
  ],
  helpcenter: ['M12 3.25a8.75 8.75 0 1 1 0 17.5 8.75 8.75 0 0 1 0-17.5Z', 'M12 11v5M12 7.8v.35'],
  developer: ['m9.25 8.5-4 3.5 4 3.5', 'm14.75 8.5 4 3.5-4 3.5', 'm13.4 5.5-2.8 13'],
  admin: [
    'M12 3.5 5.25 6v5.5c0 4.2 2.85 7.35 6.75 8.5 3.9-1.15 6.75-4.3 6.75-8.5V6L12 3.5Z',
    'm9.25 11.75 2 2 3.5-3.75',
  ],
}

/** Ukjent app-nøkkel (nye apper før registeret er oppdatert). */
export const webAppFallbackIcon = [
  'm12 3.5 8.5 4.5L12 12.5 3.5 8 12 3.5Z',
  'm4.25 12.25 7.75 4.1 7.75-4.1',
  'm4.25 16.25 7.75 4.1 7.75-4.1',
]

export function webAppIconFor(key: string): string[] {
  return webAppIcons[key as WebAppIconName] ?? webAppFallbackIcon
}
