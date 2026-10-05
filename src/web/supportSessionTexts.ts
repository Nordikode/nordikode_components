/// <reference types="vite/client" />
/**
 * Supportøktens tekster (SIGN-1547) — ÉN kilde for alle apper. Banneret i
 * `AppHeader` og meldingene appene viser når en handling avvises i en
 * supportøkt, hentes herfra, så ingen app har sin egen kopi.
 *
 * Ett språk = én fil i `supportSessionTexts/`, oppkalt etter språkkoden.
 * Filene er fasiten for hvilke språk som finnes: koden under har ingen
 * språkliste. Nytt språk = ny fil. Et språk uten fil får kildespråket.
 */
export type SupportSessionBannerTexts = {
  region: string
  viewingAs: string
  viewingAsWithoutTenant: string
  timeLeft: string
  expired: string
  readMode: string
  writeMode: string
  makeChanges: string
  confirmWrite: string
  confirm: string
  cancel: string
  end: string
}

export type SupportSessionMessageTexts = {
  /** Avvist fordi økten er i lesemodus (`support_session.read_only`). */
  readOnly: string
  /** Aldri lov i en supportøkt (`support_session.forbidden`). */
  forbidden: string
  /** Økten gjelder ett firma (`support_session.wrong_tenant`). */
  wrongTenant: string
  modeFailed: string
  endFailed: string
}

export type SupportSessionTexts = {
  banner: SupportSessionBannerTexts
  messages: SupportSessionMessageTexts
}

const SOURCE_LOCALE = 'en'

const files = import.meta.glob('./supportSessionTexts/*.json', { eager: true, import: 'default' }) as Record<string, SupportSessionTexts>

const textsByLocale = new Map<string, SupportSessionTexts>(
  Object.entries(files).map(([path, texts]) => [path.replace(/^.*\/([^/]+)\.json$/, '$1').toLowerCase(), texts]),
)

/**
 * Tekstene på brukerens språk (`no`, `sv`, `pt-BR`): språkets egen fil,
 * ellers filen for hovedspråket (`pt` for `pt-BR`), ellers kildespråket.
 */
export const supportSessionTexts = (locale?: string | null): SupportSessionTexts => {
  const code = (locale ?? '').trim().toLowerCase()

  return (
    textsByLocale.get(code) ??
    textsByLocale.get(code.split('-')[0] ?? '') ??
    (textsByLocale.get(SOURCE_LOCALE) as SupportSessionTexts)
  )
}
