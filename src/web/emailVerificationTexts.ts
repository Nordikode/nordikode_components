/// <reference types="vite/client" />
/**
 * Tekstene til båndet «Bekreft e-posten din» (SIGN-1676) — ÉN kilde for alle
 * apper, på samme måte som supportøktens tekster. Ett språk = én fil i
 * `emailVerificationTexts/`, oppkalt etter språkkoden; koden har ingen
 * språkliste. Nytt språk = ny fil. Et språk uten fil får kildespråket.
 */
export type EmailVerificationBannerTexts = {
  /** aria-label på båndet. */
  region: string
  /** «Bekreft e-postadressen din innen {date}. Vi har sendt en lenke til {email}.» */
  message: string
  /** Knappen: «Send ny lenke». */
  resend: string
  /** Knappen under nedtellingen: «Send på nytt om {seconds} s». */
  resendIn: string
  /** Kvitteringen appen viser etter sending: «Ny lenke er sendt til {email}.» */
  sent: string
}

const SOURCE_LOCALE = 'en'

const files = import.meta.glob('./emailVerificationTexts/*.json', { eager: true, import: 'default' }) as Record<string, EmailVerificationBannerTexts>

const textsByLocale = new Map<string, EmailVerificationBannerTexts>(
  Object.entries(files).map(([path, texts]) => [path.replace(/^.*\/([^/]+)\.json$/, '$1').toLowerCase(), texts]),
)

/**
 * Tekstene på brukerens språk (`no`, `sv`, `pt-BR`): språkets egen fil,
 * ellers filen for hovedspråket (`pt` for `pt-BR`), ellers kildespråket.
 */
export const emailVerificationTexts = (locale?: string | null): EmailVerificationBannerTexts => {
  const code = (locale ?? '').trim().toLowerCase()

  return (
    textsByLocale.get(code) ??
    textsByLocale.get(code.split('-')[0] ?? '') ??
    (textsByLocale.get(SOURCE_LOCALE) as EmailVerificationBannerTexts)
  )
}
