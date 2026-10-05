import type { DefineComponent } from 'vue'

export * from './tokens'

/** Plattformens språkkode. Hvilke språk som finnes, er data fra språkregisteret (SIGN-1157). */
export type SharedLocale = string

export type NkStatusChipTone = 'success' | 'inflight' | 'warning' | 'error' | 'info' | 'ai' | 'neutral'
export type NkStatusChipSize = 'sm' | 'md'
/** NkEmptyState (SIGN-447): `default` for hele flater, `compact` for lister etter søk/filter. */
export type NkEmptyStateSize = 'default' | 'compact'
/** NkConfirmDialog (SIGN-846): `danger` er handlinger som ikke kan angres — bekreft-knappen får feilfargen. */
export type NkConfirmDialogTone = 'default' | 'danger'

/**
 * Ett innslag i NkConversation (SIGN-1313): en melding (boble) eller en hendelse
 * (sentrert linje). `text`, `author` og `receipt` er ferdig oversatt av appen.
 */
export interface NkConversationEntry {
  id: string
  kind: 'message' | 'event'
  /** Om den som ser på, har skrevet meldingen (boble til høyre). */
  own?: boolean
  author?: string
  text: string
  /** ISO 8601. */
  at: string
  /** Liten linje under boblen, f.eks. «Lest 14:03». */
  receipt?: string
  /** Filene i meldingen (SIGN-1317): bilder i boblen, andre filer som lenker. */
  attachments?: NkConversationAttachment[]
}
/**
 * En fil i et innslag (SIGN-1317). `url` er den signerte, kortlevde lenken fra
 * svaret (null når den ikke kunne signeres); `sizeLabel` er størrelsen ferdig
 * formatert på brukerens språk (`formatFileSize`).
 */
export interface NkConversationAttachment {
  id: string
  name: string
  url: string | null
  isImage: boolean
  sizeLabel: string
}
export interface NkConversationLabels {
  /** Navnet på meldingslisten for skjermlesere. */
  list: string
  /** Knappen som vises når noe nytt har kommet mens leseren har rullet opp. */
  newMessages: string
}
export interface NkMessageComposerLabels {
  /** Feltets etikett og plassholder. */
  field: string
  /** Send-knappens navn. */
  send: string
  /** Legg ved-knappens navn (SIGN-1317). Uten teksten vises ingen knapp. */
  attach?: string
  /** Fjern-knappen på et valgt vedlegg; filnavnet legges til av komponenten. */
  removeAttachment?: string
}
/**
 * Vedlegg i NkMessageComposer (SIGN-1317). `validate` får hver valgt fil og hvor
 * mange som alt er valgt, og svarer med appens ferdig oversatte feilmelding — eller
 * null når filen kan legges ved.
 */
export interface NkMessageComposerAttachments {
  accept?: string
  multiple?: boolean
  validate: (file: File, selectedCount: number) => string | null
}
/** Tekstene NkTemplateField trenger fra appens i18n (SIGN-1465). */
export interface NkTemplateFieldLabels {
  /** Feltets etikett. */
  field: string
  /** Navnet på knapperaden for skjermlesere, f.eks. «Sett inn i teksten». */
  insert: string
}
/**
 * En plassholder i NkTemplateField (SIGN-1465): `key` er nøkkelen i lagringsformatet
 * (`link` = `{link}`), `label` navnet på knappen og brikken, og `missingMessage` gjør den
 * obligatorisk med appens ferdig oversatte melding.
 */
export interface NkTemplatePlaceholder {
  key: string
  label: string
  missingMessage?: string
}
export type NkTemplateSegment = { kind: 'text'; text: string } | { kind: 'placeholder'; key: string }
export interface NkConversationDay {
  /** `YYYY-MM-DD` i tidssonen som brukes. */
  key: string
  label: string
  entries: NkConversationEntry[]
}

export const IdentityAvatar: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
/**
 * NkConversation (SIGN-1313): samtalevisning med bobler, dagskiller og hendelser.
 * Props: `entries`, `locale`, `timeZone`, `labels`; slots `empty` og `footer`
 * (skrivefeltet, fast nederst); emits `seen(lastEntryId)` når nyeste innslag er
 * synlig og fanen er framme; eksponerer `scrollToEnd(smooth)`.
 */
export const NkConversation: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
/**
 * NkConversationListItem (SIGN-1313): rad i en samtaleliste på `v-list-item`.
 * Props: `title`, `preview`, `meta`, `at`, `locale`, `timeZone`, `unreadCount`,
 * `unreadLabel`; slot `status`; `to`/`href`/`active` sendes videre til raden.
 */
export const NkConversationListItem: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const NkEmptyState: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
/**
 * NkMessageComposer (SIGN-1313): skrivefelt som vokser, med send-knapp. Props:
 * `send(text, files) => Promise<boolean>` (true tømmer feltet og filene), `labels`,
 * `modelValue`, `disabled`, `maxLength`, `error`, `attachments`
 * (`NkMessageComposerAttachments`, SIGN-1317) og `locale` for størrelsen på valgte
 * filer; slots `attachments` og `prepend`; eksponerer `focus()`.
 */
export const NkMessageComposer: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
/**
 * NkDialog (SIGN-846): `v-dialog` med tilgjengelig navn. Dialogen kobles til den
 * synlige tittelen med `aria-labelledby` (elementet merket `data-nk-dialog-title`,
 * ellers første overskrift / `v-card-title` i innholdet), til ingressen merket
 * `data-nk-dialog-description` med `aria-describedby`, og fokus går tilbake til
 * elementet som åpnet den. Dialoger uten synlig tittel får `aria-label`. Alle
 * `v-dialog`-props, -hendelser og -slots sendes videre; standard-slotten får også
 * `close`. Exposes `close()` og `syncNames()`.
 */
export const NkDialog: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
/**
 * NkConfirmDialog (SIGN-846): bekreftelsesdialog på NkSheet (`role="alertdialog"`).
 * Props: `modelValue`, `title` (spørsmålet), `message`, `confirmLabel` (handlingen i
 * klartekst), `cancelLabel`, `tone` (`NkConfirmDialogTone`), `loading`,
 * `confirmDisabled`, `error` («Kunne ikke X.»), `maxWidth`; slot `default`; emits
 * `confirm` (lukker ikke — eieren lukker når handlingen er ferdig), `cancel` og
 * `update:modelValue`.
 */
export const NkConfirmDialog: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
/**
 * NkSheet (SIGN-733): det delte dialogskallet — hode, rullende kropp og festet
 * handlingsrad, fullskjerm under `smAndDown`. Bygger på NkDialog (SIGN-846):
 * tittelen er dialogens navn, undertittelen beskrivelsen. Props: `modelValue`/`open`,
 * `title`, `subtitle`, `maxWidth`, `fullscreenOnMobile`, `eager`, `closeLabel`
 * (lukkeknapp med det navnet); slots `default`, `actions`, `head`, `badge`; emits
 * `update:modelValue` og `close`.
 */
export const NkSheet: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const NkStatusChip: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
/**
 * NkTemplateField (SIGN-1465): felt for tekster med plassholdere. Plassholderne settes
 * inn med knapper og vises som brikker; `v-model` er teksten med `{key}`. Props:
 * `modelValue`, `placeholders` (`NkTemplatePlaceholder[]`), `labels`, `hint`, `emptyText`,
 * `maxLength`, `rows`, `disabled`, `errorMessages`; eksponerer `focus()`.
 */
export const NkTemplateField: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const PhoneNumberInput: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>

export interface StaleChunkRouter {
  onError(handler: (error: unknown, to: { fullPath: string }) => unknown): unknown
}
export declare function installStaleChunkReload(router?: StaleChunkRouter): void
export declare function isStaleChunkError(error: unknown): boolean

/**
 * Delt beløpsformatering (SIGN-499): valuta er alltid data (tenant/dokument),
 * locale er brukerens UI-locale som full BCP-47-tag. Se src/money.ts.
 */
export interface FormatMoneyOptions {
  maximumFractionDigits?: number
  minimumFractionDigits?: number
  compact?: boolean
  currencyDisplay?: 'symbol' | 'narrowSymbol' | 'code' | 'name'
  signDisplay?: 'auto' | 'never' | 'always' | 'exceptZero'
}
/** Det `configureLocales` trenger fra en rad i språkregisteret (SIGN-1164). */
export interface LocaleRegistryEntry {
  code: string
  bcp47: string
  aliases?: ReadonlyArray<string> | null
}
/**
 * Erstatter tabellen bak `toBcp47` med språkregisteret (core `platformLocales`).
 * En tom liste setter tabellen tilbake til startverdien.
 */
export declare function configureLocales(locales: ReadonlyArray<LocaleRegistryEntry>): void
export declare function toBcp47(locale: string | null | undefined): string
/**
 * Dato og tid i samtaler (SIGN-1313), formatert av Intl med brukerens UI-språk.
 * «i dag»/«i går» kommer fra `Intl.RelativeTimeFormat`. Se src/conversation.ts.
 */
export declare function formatConversationDay(at: string | Date, locale: string, now?: Date, timeZone?: string): string
export declare function formatConversationTime(at: string | Date, locale: string, timeZone?: string): string
export declare function formatConversationListTime(at: string | Date, locale: string, now?: Date, timeZone?: string): string
export declare function groupConversationEntries(
  entries: ReadonlyArray<NkConversationEntry>,
  locale: string,
  now?: Date,
  timeZone?: string,
): NkConversationDay[]
/** Filstørrelse fra Intl på brukerens språk («48 kB», «1,3 MB») — SIGN-1317. */
export declare function formatFileSize(bytes: number, locale: string): string
/** Nøklene som står som `{key}` i en malt tekst, i rekkefølge og uten duplikater (SIGN-1465). */
export declare function templatePlaceholderKeys(text: string | null | undefined): string[]
/** Deler teksten i tekst og plassholdere; bare `knownKeys` blir plassholdere. */
export declare function parseTemplate(text: string, knownKeys: readonly string[]): NkTemplateSegment[]
/** Lagringsformatet for en plassholder: `{key}`. */
export declare function templateToken(key: string): string
/** De obligatoriske plassholderne som mangler; et tomt felt mangler ingenting. */
export declare function missingTemplatePlaceholders(
  text: string | null | undefined,
  placeholders: readonly NkTemplatePlaceholder[],
): NkTemplatePlaceholder[]
export declare function formatMoney(
  amount: number,
  currency: string | null | undefined,
  locale: string | null | undefined,
  options?: FormatMoneyOptions,
): string
export declare function formatMinorAmount(
  amountMinor: number,
  currency: string | null | undefined,
  locale: string | null | undefined,
  options?: FormatMoneyOptions,
): string
export declare function formatMoneyRange(
  from: number,
  to: number,
  currency: string | null | undefined,
  locale: string | null | undefined,
  options?: FormatMoneyOptions,
): string
export declare function supportedCurrencyCodes(): string[]

import type { IconSet } from 'vuetify'
export type MdiRegistry = Readonly<Record<string, string>>
/** Vuetify-ikonsett som slår opp `mdi-*`-navn i et generert @mdi/js-register (SIGN-521). */
export declare function mdiRegistryIconSet(registry: MdiRegistry): IconSet
