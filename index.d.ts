import type { ComputedRef, DefineComponent, MaybeRefOrGetter, Ref } from 'vue'

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
/**
 * Kontaktvelgeren (SIGN-1913): det en rad eller et kort viser om en kontakt. Samme
 * form for kunde, leverandør, underleverandør og ansatt.
 */
export interface NkContactPickerItem {
  id: string
  name: string
  /** Hva kontakten er, som felt fra appens data: en person får initialer, et firma får firmaikonet. */
  kind: 'person' | 'company'
  /** Bilde eller logo (signert lenke fra appens data). */
  imageUrl?: string | null
  /** Korte merker ved navnet (roller), ferdig oversatt av appen. */
  tags?: string[]
  /** Én linje under navnet: kontaktperson, stilling eller avdeling. */
  secondary?: string | null
  phone?: string | null
  email?: string | null
  /** Sted: poststed eller kort adresse. */
  location?: string | null
  /** Overskriften raden står under. Rader med samme gruppe må stå samlet. */
  group?: string | null
}
export type NkContactPickerView = 'list' | 'cards'
/** Et filter over listen i kontaktvelgeren: hvilken type kontakt som vises. Appen filtrerer dataene. */
export interface NkContactPickerFilter {
  key: string
  label: string
}
/** Tekstene NkContactPickerDialog trenger fra appens i18n (SIGN-1913). */
export interface NkContactPickerLabels {
  /** Plassholderen og navnet på søkefeltet. */
  search: string
  /** Navnet på gruppen med visningsknappene. */
  view: string
  viewList: string
  viewCards: string
  /** Navnet på lukkeknappen. */
  close: string
  /** Merket på kontakten som er valgt fra før. */
  selected: string
  showMore: string
  loading: string
  /** Tittelen når registeret er tomt. */
  empty: string
  /** Tittelen når søket ikke ga treff — appen setter inn søketeksten. */
  noMatches: string
  /** Knappen som starter «Ny kontakt». Brukes bare med `canCreate`. */
  create?: string
  /** Knappen som fjerner valget. Brukes bare med `clearable`. */
  clear?: string
  /** Knappen som lukker velgeren når flere kan velges. Brukes bare med `multiple`. */
  done?: string
  /** Navnet på gruppen med filterknappene. Brukes bare med `filters`. */
  filters?: string
}
/** Tekstene NkListPane trenger fra appens i18n (SIGN-1845). */
export interface NkListPaneLabels {
  /** Filterknappen og filtermenyens navn («Filtre»). Uten `#filters`-slot vises ingen knapp. */
  filters?: string
  /** «Nullstill»-knappen i filtermenyen; vises bare når `filterCount` > 0. */
  resetFilters?: string
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
/** Levering av et fag (SIGN-1481): firmaet leverer det selv, eller setter det bort. */
export type NkTradeDelivery = 'own' | 'subcontracted'

/**
 * Et fag i firmaets fagliste (core `tenantTrades`). `key` er verdien som
 * lagres overalt (`trade_key`); `name` er firmaets eget navn og oversettes
 * ikke. `platformTradeKey` kobler faget til Nordikodes fagliste, så søket
 * også treffer plattformfagets synonymer.
 */
export interface NkTradeOption {
  key: string
  name: string
  delivery: NkTradeDelivery
  platformTradeKey?: string | null
  archived?: boolean
}

/** Et fag i Nordikodes fagliste (core `platformTrades`), med navn på brukerens språk. */
export interface NkPlatformTradeOption {
  key: string
  name: string
  synonyms?: string[]
}

/**
 * Det fagvelgeren ber appen opprette (core `createTenantTrade`). Fra
 * Nordikodes fagliste når `platformTradeKey` er satt, ellers et eget fag med
 * `name`. Nøkkelen lager core; velgeren lager aldri en selv.
 */
export interface NkTradeCreateInput {
  name: string
  platformTradeKey: string | null
  delivery: NkTradeDelivery
}
/** Tekstene NkTradeSelect trenger fra appens i18n (SIGN-1481). Fagnavnene er data, ikke tekster. */
export interface NkTradeSelectLabels {
  /** Feltets etikett, f.eks. «Fag». */
  field: string
  /** Plassholder i tomt felt, f.eks. «Søk etter fag». */
  placeholder: string
  /** Merket på fag som settes bort, f.eks. «Settes bort». */
  subcontracted: string
  /** Merket på et arkivert fag som alt er valgt, f.eks. «Arkivert». */
  archived: string
  /** Tomt treff, f.eks. «Ingen fag passer.» */
  noMatch: string
  /** Tomt treff uten rettighet, f.eks. «Ingen fag passer. En administrator kan legge til fag i Sign-innstillingene.» */
  noMatchNoAccess: string
  /** «Legg til «Stillas» som nytt fag» — et eget fag. */
  addOwn: (name: string) => string
  /** «Legg til «Rørlegger» fra Nordikodes fagliste». */
  addFromPlatform: (name: string) => string
  /** «Leverer dere «Stillas» selv, eller settes det bort?» */
  deliveryQuestion: (name: string) => string
  /** Knappen «Leverer selv». */
  deliveryOwn: string
  /** Knappen «Setter bort». */
  deliverySubcontracted: string
  /** Knappen «Avbryt». */
  cancel: string
  /** Feilen når faget ikke kunne legges til, f.eks. «Kunne ikke legge til faget.» */
  createFailed: string
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
 * NkListPane (SIGN-1845): det delte listepanelet i liste/detalj-flater. Hodet er
 * tittelraden (`title`, `#badge`, `#actions`), søkeraden (`v-model:search`,
 * `searchPlaceholder`, `searchFieldAttrs`, `#search-append`, filterknapp med
 * `filterCount` som åpner `#filters` i en nedtrekksmeny) og verktøyraden (`#toolbar`).
 * Komponenten eier rullingen i listen (`#default`) og krymper hodet til søkeraden når
 * listen rulles (`condense`); `#footer` står fast under listen. Props ellers:
 * `headingTag` (`h1`/`h2`/`h3`), `labels` (`NkListPaneLabels`), `width`. Med `listFirst`
 * (SIGN-1888) er listen en egen side i full bredde, og `detailOpen` skjuler den mens det
 * valgte vises alene — rulleposisjon, søk og filtre står når listen vises igjen. Emits
 * `update:search` og `reset-filters`; eksponerer `body`, `scrollToTop()` og `condensed`.
 */
export const NkListPane: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
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
 * NkContactPickerDialog (SIGN-1913): standarden for å velge en kontakt — kunde,
 * leverandør, underleverandør eller ansatt. Modal på NkSheet med søk, kontaktlisten
 * framme med en gang og en kort forhåndsvisning per kontakt, som liste eller kort.
 * Props: `modelValue`, `title`, `subtitle`, `items` (`NkContactPickerItem[]`),
 * `selectedId`, `search` (v-model:search), `view` (v-model:view), `loading`, `hasMore`,
 * `canCreate`, `creating`, `clearable`, `labels` (`NkContactPickerLabels`), `maxWidth`;
 * flervalg med `multiple` + `selectedIds` (emits `toggle(id)` og `confirm`), og
 * typefilter med `filters` (`NkContactPickerFilter[]`) + `filter` (v-model:filter);
 * slot `create` (appens «Ny kontakt»-skjema, vist i stedet for listen når `creating`);
 * emits `select(id)`, `load-more`, `create`, `clear`, `update:search`, `update:view`
 * og `update:modelValue`. Appen eier data, søk mot serveren, tekster og lagring av visningen.
 */
export const NkContactPickerDialog: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
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
/**
 * NkTradeSelect (SIGN-1481): fagvelgeren overalt et fag velges. Firmaets fag med søk
 * (navn og plattformfagets synonymer), merket «settes bort», og «Legg til …» nederst for
 * den med `core.trades.manage` — fra Nordikodes fagliste når teksten treffer et
 * plattformfag, ellers som eget fag, alltid med levering (spør, eller `delivery`).
 * `v-model` er nøkkelen (nøklene med `multiple`). Props: `modelValue`, `trades`,
 * `labels`, `platformTrades`, `multiple`, `canManage`, `createTrade(input) =>
 * Promise<key>`, `delivery`, `hint`, `loading`, `disabled`, `errorMessages`.
 */
export const NkTradeSelect: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
/**
 * Telefonfeltet med landvelger (Vuetify). `autocomplete` (SIGN-1907) er `off` som
 * standard — nummeret gjelder som regel en kunde eller kontakt; sett `tel` bare
 * der brukeren skriver sitt eget nummer.
 */
export const PhoneNumberInput: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>

// --- Widgetrammeverket (SIGN-1850, delt i SIGN-1873) -------------------------
// En flate satt sammen av widgeter brukeren plasserer, gir størrelse og skjuler.
// Lagringen og tekstene er appens (Sign: UI-preferansene i core + i18n).

/** Tre størrelser; innholdet er ulikt per størrelse, ikke bare skalert. */
export type WidgetSize = 'small' | 'medium' | 'large'
export const WIDGET_SIZES: readonly WidgetSize[]
/** Høydene en widget kan ha i et rutenett med rader (SIGN-1903): 1, 2 eller 3 rader. */
export const WIDGET_ROWS: readonly number[]
/** En sone på flaten: et rutenett (`grid`, celler) eller en kolonne (`column`, listerekkefølge). */
export type WidgetZoneKind = 'grid' | 'column'
export interface WidgetDefinition {
  /** Stabil nøkkel som lagres i brukerens oppsett — endres aldri. */
  key: string
  /** Navnet, ferdig oversatt av appen — eller en getter som følger språket. */
  title: string | (() => string)
  icon: string
  /** Størrelsene widgeten kan ha; den første er standard. */
  sizes: readonly WidgetSize[]
  /** Sonen widgeten står i som standard (flatens første sone når den mangler). */
  zone?: string
  /** Skjult som standard — brukeren henter den fram fra redigeringslinjen. */
  hidden?: boolean
  /** Antall rader per størrelse i et rutenett med faste rader, der standarden (1/2/3) ikke passer. */
  /** Widgeten denne ble skilt ut av: i et lagret oppsett fra før den fantes settes den rett etter den, i samme sone og like synlig. */
  after?: string
  rows?: Partial<Record<WidgetSize, number>>
}
export interface WidgetLayoutItem {
  key: string
  size: WidgetSize
  visible: boolean
  zone: string
  /** Høyden brukeren har valgt (1–3 rader); uten den gjelder størrelsens standard. */
  rows?: number
}
export interface GridPosition {
  x: number
  y: number
}
/** Brukerens plassering i ett rutenett ved ett kolonneantall. */
export interface WidgetPositions {
  zone: string
  columns: number
  tiles: Record<string, GridPosition>
}
/** Det som lagres per flate: widgetene i leserekkefølge, og cellene brukeren har ordnet for hånd. */
export interface WidgetLayout {
  widgets: WidgetLayoutItem[]
  positions?: WidgetPositions[]
}
/** Tekstene rammeverket trenger fra appens i18n: redigeringslinjen og verktøyene på hver flis. */
export interface WidgetLabels {
  /** Overskriften i redigeringslinjen («Tilpass siden»). */
  editTitle: string
  hint: string
  /** «Skjulte widgeter». */
  hidden: string
  /** «Ingen». */
  none: string
  reset: string
  resetTitle: string
  resetBody: string
  done: string
  cancel: string
  /** Dra-håndtakets navn («Flytt {widget}»). */
  move: (widget: string) => string
  dragToMove: string
  /** Størrelsesknappen («Bytt til {size}»). */
  nextSize: (size: string) => string
  /** Høydeknappen («Bytt høyde til {rows} rader»); appen bøyer etter antallet. */
  nextRows: (rows: number) => string
  /** Skjul-knappen («Skjul {widget}»). */
  hide: (widget: string) => string
  sizes: Record<WidgetSize, string>
}
/** Lagringen oppsettet bor i — appens (Sign: brukerens UI-preferanser i core). */
export interface WidgetLayoutStorage {
  /** Det lagrede under nøkkelen (hvilken form som helst — kontrolleren renser det), eller null/undefined. */
  load(key: string): Promise<unknown>
  save(key: string, layout: WidgetLayout): Promise<void>
  /** Valgfri reaktiv getter: det lagrede nå, så en endring fra en annen fane tas i bruk. Kalles inni en Vue-watch. */
  current?(key: string): unknown
}
export interface WidgetZoneDefinition {
  key: string
  kind: WidgetZoneKind
}
export interface UseWidgetLayoutOptions {
  /** Nøkkelen oppsettet lagres under (Sign: `sign.<flate>.layout`). */
  preferenceKey: string
  /** Widgetene flaten har — en getter når tilgang avgjør hvilke som finnes. */
  definitions: MaybeRefOrGetter<readonly WidgetDefinition[]>
  /** Sonene på flaten; den første er standard. Uten: ett rutenett `main`. */
  zones?: readonly WidgetZoneDefinition[]
  storage: WidgetLayoutStorage
  /** Tekstene fra appens i18n; en getter følger språkbyttet. */
  labels: MaybeRefOrGetter<WidgetLabels>
  /** Kalles når lagringen feiler; appen viser feilen slik den pleier. Oppsettet står som brukeren lot det. */
  onSaveError?: (error: unknown) => void
  /** Et eldre lagret oppsett å ta med over når nøkkelen mangler. */
  migrate?: () => Partial<WidgetLayout> | null
}
/** En flis i et rutenett: cellen (`x`, `y`) og spennet (`w`, `h`). */
export interface GridTile {
  key: string
  x: number
  y: number
  w: number
  h: number
}
/** En synlig widget med cellene den opptar i sonens rutenett. */
export interface PlacedWidget extends GridTile {
  size: WidgetSize
  zone: string
}
/** Det et rutenett melder om seg selv (`setGrid`), så kontrolleren kan plassere og snappe. */
export interface GridGeometry {
  columns: number
  fixedRows: boolean
  element: HTMLElement | null
  columnGap: number
  rowGap: number
  rowHeight: number
}
/** Ett trinn i rutenettets bredde: fra `minWidth` piksler har det `columns` kolonner. */
export interface WidgetGridBreakpoint {
  minWidth: number
  columns: number
  /** Faste rader (fliser på celler) eller naturlig høyde (fliser i listerekkefølge). */
  fixedRows?: boolean
}
/**
 * Kontrolleren for én flates widgetoppsett — det `useWidgetLayout` gir.
 * Tilstand: `layout`, `editing`, `isSaving`, `loaded`, `isDefault`, `labels`,
 * `widgets`, `hiddenWidgets`. Oppslag: `definition(key)`, `title(key)`,
 * `visibleIn(zone)`, `placedIn(zone)`, `columnsOf`, `hasFixedRows`, `zoneKind`,
 * `defaultZoneOf`. Endringer (gjøres med en gang, lagres kort etter): `hide`,
 * `show`, `setSize`, `nextSize`, `cycleSize`, `moveToCell`, `moveTo`,
 * `moveToZone`, `moveBy`, `reset`, `startEditing`, `stopEditing`, `scheduleSave`,
 * `flush`. Rutenett og drag: `setGrid`, `draggingKey`, `ghostX`, `ghostY`, `press`.
 */
export interface WidgetLayoutController {
  preferenceKey: string
  zones: readonly WidgetZoneDefinition[]
  labels: ComputedRef<WidgetLabels>
  layout: Ref<WidgetLayout>
  editing: Ref<boolean>
  isSaving: Ref<boolean>
  loaded: Ref<boolean>
  isDefault: ComputedRef<boolean>
  definitions: ComputedRef<readonly WidgetDefinition[]>
  definition(key: string): WidgetDefinition | undefined
  title(key: string): string
  widgets: ComputedRef<WidgetLayoutItem[]>
  hiddenWidgets: ComputedRef<WidgetLayoutItem[]>
  visibleIn(zone: string): WidgetLayoutItem[]
  placedIn(zone: string): PlacedWidget[]
  columnsOf(zone: string): number
  hasFixedRows(zone: string): boolean
  zoneKind(zone: string): WidgetZoneKind
  defaultZoneOf(key: string): string
  hide(key: string): void
  show(key: string): void
  setSize(key: string, size: WidgetSize): void
  nextSize(key: string): WidgetSize | null
  /** Høyden widgeten har nå i et rutenett med rader: den valgte, ellers størrelsens standard. */
  rowsOf(key: string): number
  /** Setter høyden i rader (1–3); naboene dyttes ned om widgeten vokser inn i dem. */
  setRows(key: string, rows: number): void
  /** Neste høyde (1 → 2 → 3 → 1), eller null der sonen ikke har rader. */
  nextRows(key: string): number | null
  cycleRows(key: string): void
  cycleSize(key: string): void
  moveToCell(key: string, zone: string, x: number, y: number): boolean
  moveTo(key: string, targetKey: string): boolean
  moveToZone(key: string, zone: string): boolean
  moveBy(key: string, dx: number, dy: number): void
  reset(): void
  startEditing(): void
  stopEditing(): void
  scheduleSave(): void
  flush(): void
  setGrid(zone: string, grid: GridGeometry): void
  draggingKey: Ref<string | null>
  ghostX: Ref<number>
  ghostY: Ref<number>
  press(event: PointerEvent, key: string, tile: HTMLElement | null): void
}
/**
 * useWidgetLayout (SIGN-1850, delt i SIGN-1873): kontrolleren for én flates
 * widgetoppsett. Leser `storage.load(preferenceKey)` én gang (ellers
 * `migrate()`), renser det mot `definitions`, gjør hver endring med en gang og
 * skriver med `storage.save` 500 ms etter siste; en avvist lagring går til
 * `onSaveError`. Følger `storage.current()` når den finnes, og renser på nytt
 * når `definitions` endrer seg.
 */
export declare function useWidgetLayout(options: UseWidgetLayoutOptions): WidgetLayoutController
/** Standardoppsettet: hver widget i registerets rekkefølge, i sin sone, i sin første størrelse. */
export declare function defaultLayout(definitions: readonly WidgetDefinition[], zones: readonly string[]): WidgetLayout
/** Gjør et lagret oppsett (av hvilken som helst form) om til et komplett, gyldig oppsett mot registeret. */
export declare function resolveLayout(stored: unknown, definitions: readonly WidgetDefinition[], zones: readonly string[]): WidgetLayout
/** Typevakt for det som leses fra lagringen: alt annet renses av `resolveLayout`. */
export declare function isStoredLayout(value: unknown): value is Partial<WidgetLayout>
/** Hvor mange kolonner og rader en widget spenner over i et rutenett med `columns` kolonner. */
export declare function widgetSpan(size: WidgetSize, columns: number, definition?: WidgetDefinition): { w: number; h: number }
/**
 * NkWidgetGrid: rutenettet på en widgetflate. Props `controller`, `zone`
 * (standard `main`), `breakpoints` (`WidgetGridBreakpoint[]`; standard 2 kolonner
 * uten faste rader, 4 fra 760 px og 6 fra 1360 px med faste rader), `rowHeight`
 * (px, standard 136). Slot `#widget` med `widgetKey`, `size`, `definition` —
 * verten tegner selve widgeten. Melder kolonneantall og radmodus til kontrolleren.
 */
export const NkWidgetGrid: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
/**
 * NkWidgetColumn: en kolonne av widgeter i listerekkefølge med naturlig høyde.
 * Props `controller`, `zone` (standard `side`). Slots `#widget` (som rutenettet)
 * og `#empty` (slippsonen i en tom kolonne i redigeringsmodus).
 */
export const NkWidgetColumn: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
/**
 * NkWidgetEditBar: linjen over flaten mens den tilpasses — hint, skjulte
 * widgeter som brikker (trykk for å hente fram), «Tilbakestill» (med
 * NkConfirmDialog) og «Ferdig»; spøkelsesetiketten under drag bor også her.
 * Props `controller`, `title` (uten brukes `labels.editTitle`).
 */
export const NkWidgetEditBar: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
/**
 * NkWidgetTools: verktøylinjen en flis får i redigeringsmodus — dra-håndtak
 * (piltaster flytter), neste størrelse og skjul. Rutenettet og kolonnen
 * tegner den selv; props `controller`, `widgetKey`.
 */
export const NkWidgetTools: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>

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

/**
 * Attributter for søkefelt (SIGN-838/1907): `type="search"`, et nøytralt navn og
 * autofyll av — de tre signalene som til sammen hindrer nettleseren i å fylle
 * inn brukerens e-post. `<v-text-field v-bind="NK_SEARCH_FIELD_ATTRS" />`;
 * `NkListPane` setter dem selv.
 */
export declare const NK_SEARCH_FIELD_ATTRS: Readonly<{ type: 'search'; name: 'search'; autocomplete: 'off' }>

/**
 * Reserve-initialer for avatarer uten bilde (SIGN-1668): første bokstav i hvert av
 * de to første ordene («Kari Lund» → «KL», «Kari» → «K»); tomt navn gir `fallback`
 * («?»). Samme regel i IdentityAvatar, AccountIdentityMenu og TenantSwitcherMenu.
 */
export declare function initialsOf(name: string | null | undefined, fallback?: string): string

/*
 * Abonnementsflatene (SIGN-1790): abonnementskortet, utsjekkens skjema,
 * tilbudsvelgeren, brukertelleren, prissammendraget, betalingsdialogen,
 * kortlisten og fakturatabellen — delt av firmaappen, app-core og
 * Sign-innstillingene. Pakka eier ingen tekster: alt kommer som props.
 */
export type NkPricingModel = 'flat' | 'per_seat' | 'included_seats'
export type NkPaymentTerms = 'card' | 'invoice'
export interface NkPlanCatalogApp { appId: string; appKey: string; name: string }
export interface NkPlanOfferQuote { currency: string; effectiveMonthlyMinor: number; totalMinor: number; subtotalMinor?: number }
export interface NkPlanOffer {
  offerId: string
  billingMonths: number
  cadenceAdjustmentPercent: number
  commitmentMonths: number
  commitmentAdjustmentPercent: number
  commitmentEndPolicy: string
  isDefault: boolean
  quote: NkPlanOfferQuote
}
export interface NkCatalogPlan {
  id: string
  key: string
  name: string
  description?: string | null
  pricingModel: NkPricingModel
  includedSeats: number | null
  currency: string
  baseAmountMinor: number
  seatAmountMinor: number | null
  seats: number
  monthlyListMinor: number
  defaultOfferId: string
  trialAvailable?: boolean
  trialDays?: number | null
  apps: NkPlanCatalogApp[]
  offers: NkPlanOffer[]
}
export interface NkQuoteCadence { months: number; adjustmentPercent: number; periodListMinor: number; adjustmentMinor: number; amountMinor: number }
export interface NkQuoteCommitment { months: number; adjustmentPercent: number; endPolicy: string; adjustmentMinor: number; amountMinor: number }
export interface NkQuote {
  pricingModel: NkPricingModel
  includedSeats: number | null
  seats: number
  billableSeats: number
  offerId: string
  currency: string
  market: { currency: string; baseAmountMinor: number; seatAmountMinor: number | null; monthlyListMinor: number }
  basePeriodMinor: number
  seatsPeriodMinor: number
  cadence: NkQuoteCadence
  commitment: NkQuoteCommitment
  subtotalMinor: number
  discounts: { tenantPercent: number; tenantMinor: number; couponMinor: number; totalMinor: number }
  discountedSubtotalMinor: number
  vat: { mode: string; rate: number; amountMinor: number }
  totalMinor: number
  effectiveMonthlyMinor: number
}
export interface NkPlanCheckoutQuote {
  plan: { id: string; key: string; name: string; pricingModel: NkPricingModel; includedSeats: number | null }
  offer: { offerId: string; billingMonths: number; cadenceAdjustmentPercent: number; commitmentMonths: number; commitmentAdjustmentPercent: number; commitmentEndPolicy: string }
  quote: NkQuote
  seats: number
  currency: string
  subtotalMinor: number
  discountMinor: number
  vatRate: number
  vatMinor: number
  totalMinor: number
  giftCardMinor: number
  amountDueMinor: number
  paymentTerms: NkPaymentTerms
  invoiceDueDays: number | null
  commitmentEndsAt: string | null
  nextBillingAt: string | null
  paymentId: string | null
  subscriptionId: string | null
  clientSecret: string | null
  mode?: 'payment' | 'setup' | null
  publishableKey: string | null
  completed: boolean | null
  invoiceId: string | null
}
export interface NkPlanChangePreview {
  requiresPayment: boolean
  scheduled: boolean
  effectiveAt: string | null
  amountMinor: number
  vatMinor: number
  totalMinor: number
  currency: string
  quote: NkQuote
  seats: number | null
  planId: string | null
  offerId: string | null
  upgrade: boolean | null
  commitmentEndsAt: string | null
  nextBillingAt: string | null
}
export interface NkOfferChoice { months: number; adjustmentPercent: number; available: boolean; effectiveMonthlyMinor: number | null }
export declare const cadenceChoices: (offers: NkPlanOffer[], commitmentMonths: number) => NkOfferChoice[]
export declare const commitmentChoices: (offers: NkPlanOffer[], billingMonths: number) => NkOfferChoice[]
export declare const findOffer: (offers: NkPlanOffer[], billingMonths: number, commitmentMonths: number) => NkPlanOffer | null
export declare const defaultOffer: (plan: Pick<NkCatalogPlan, 'offers' | 'defaultOfferId'>) => NkPlanOffer | null
export declare const initialSeats: (plan: Pick<NkCatalogPlan, 'pricingModel' | 'includedSeats'>) => number
export declare const matchingOffer: (plan: Pick<NkCatalogPlan, 'offers' | 'defaultOfferId'>, billingMonths: number | null, commitmentMonths: number | null) => NkPlanOffer | null
export declare const plansForApp: <T extends { apps: Array<{ appKey: string }>; offers: unknown[] }>(plans: T[], appKey: string) => T[]
export declare const offerForCadence: (offers: NkPlanOffer[], months: number, commitmentMonths: number | null) => NkPlanOffer | null
export declare const offerForCommitment: (offers: NkPlanOffer[], months: number, billingMonths: number | null) => NkPlanOffer | null

export interface NkQuoteLine { key: string; label: string; amount: string; emphasis?: boolean; divider?: boolean }
export interface NkQuoteLineTexts {
  money: (amountMinor: number) => string
  percent: (value: number) => string
  lineBase: string
  linePerSeat: (seats: number) => string
  lineExtraSeats: (seats: number) => string
  linePeriod: (months: number) => string
  lineCadence: (percent: string) => string
  lineCommitment: (percent: string) => string
  discount: string
  vat: (rate: string) => string
  giftCard: string
  total: string
  amountDue: string
}
export interface NkChangePreviewTexts {
  money: (amountMinor: number) => string
  percent: (value: number) => string
  lineProrated: string
  vat: (rate: string) => string
  amountDue: string
  lineNextPeriod: (months: number) => string
}
export interface NkChangePreviewTermTexts {
  date: (iso: string | null) => string | null
  nothingDue: string
  effectiveNow: string
  effectiveFrom: (date: string) => string
  commitmentEnd: (date: string) => string
  nextBilling: (date: string) => string
}
export interface NkCheckoutTermTexts {
  date: (iso: string | null) => string | null
  invoiceTerms: (dueDays: number) => string
  cardTerms: string
  commitmentEnd: (date: string) => string
  nextBilling: (date: string) => string
}
export declare const quoteLines: (checkout: NkPlanCheckoutQuote, texts: NkQuoteLineTexts) => NkQuoteLine[]
export declare const changePreviewLines: (preview: NkPlanChangePreview, texts: NkChangePreviewTexts) => NkQuoteLine[]
export declare const changePreviewTerms: (preview: NkPlanChangePreview, texts: NkChangePreviewTermTexts) => string[]
export declare const checkoutTerms: (checkout: NkPlanCheckoutQuote, texts: NkCheckoutTermTexts) => string[]

export interface NkSubscriptionSeat { id: string; userId: string; userName: string | null; userEmail: string | null }
export interface NkSubscriptionPendingChange {
  type: string
  planId: string | null
  offerId: string
  billingMonths: number | null
  commitmentMonths: number | null
  effectiveAt: string | null
}
export interface NkSubscriptionSummary {
  id: string
  appName: string
  status: string
  currency: string
  paidSeatCount: number
  cancelAtPeriodEnd: boolean
  isComplimentary: boolean
  currentPeriodEnd: string | null
  trialEndsAt: string | null
  planId: string | null
  planName: string | null
  pricingModel: NkPricingModel | null
  planIncludedSeats: number | null
  apps: { appKey: string; appName: string }[]
  seatsCount: number | null
  baseAmountMinor: number | null
  seatAmountMinor: number | null
  monthlyListMinor: number | null
  billingMonths: number | null
  commitmentMonths: number | null
  commitmentEndsAt: string | null
  commitmentEndPolicy: string | null
  nextBillingAt: string | null
  paymentTerms: NkPaymentTerms | null
  cancelAt: string | null
  cancelableFrom: string | null
  pendingChange: NkSubscriptionPendingChange | null
  seats: NkSubscriptionSeat[]
}
export declare const subscriptionStatusTone: Record<string, NkStatusChipTone>
export declare const LIVE_SUBSCRIPTION_STATUSES: readonly ['incomplete', 'trialing', 'active', 'past_due', 'suspended']
export declare const trialDaysLeft: (endsAt: string | null | undefined, now?: Date) => number | null
export declare const hasUnlimitedSeats: (subscription: Pick<NkSubscriptionSummary, 'status' | 'isComplimentary'>) => boolean
export declare const canCancelSubscription: (subscription: Pick<NkSubscriptionSummary, 'isComplimentary' | 'cancelAtPeriodEnd' | 'cancelAt' | 'status'>) => boolean
export declare const cancelBlocked: (subscription: Pick<NkSubscriptionSummary, 'cancelableFrom' | 'status' | 'currentPeriodEnd'>) => boolean
export declare const canChangeTerms: (subscription: Pick<NkSubscriptionSummary, 'planId' | 'isComplimentary' | 'status'>) => boolean

export interface NkStripePaymentActionResult { outcome: 'succeeded' | 'processing' | 'requiresElement' | 'failed'; message?: string }
export declare const rememberPublishableKey: (key: string | null | undefined) => void
export declare const knownPublishableKey: () => string | null
export declare const getStripe: (publishableKey?: string | null) => Promise<import('@stripe/stripe-js').Stripe>
export declare const completePaymentIntentAction: (clientSecret: string, publishableKey?: string | null) => Promise<NkStripePaymentActionResult>

export type NkCheckoutReturnStatus = 'succeeded' | 'processing' | 'failed'
export declare const CHECKOUT_RETURN_QUERY: string
export declare const STRIPE_RETURN_QUERY_KEYS: readonly string[]
export declare const RELOAD_POLL_DELAYS_MS: readonly number[]
export declare const RELOAD_FALLBACK_DELAY_MS: number
export declare const buildCheckoutReturnUrl: (location?: Pick<Location, 'origin' | 'pathname'>) => string
export declare const readStripeReturn: (search: string) => NkCheckoutReturnStatus | null
export declare const stripStripeParams: (href: string) => string
export declare const readQueryParam: (search: string, key: string) => string | null
export declare const stripQueryParam: (href: string, key: string) => string
export interface NkReloadPollerOptions { reload: () => Promise<void>; fingerprint?: () => unknown; delays?: readonly number[] }
export interface NkReloadPoller { start: () => void; cancel: () => void }
export declare const createReloadPoller: (options: NkReloadPollerOptions) => NkReloadPoller

export type NkFormatMoney = (amountMinor: number, currency: string) => string
export type NkFormatDate = (iso: string | null | undefined) => string | null
export type NkFormatPercentLabel = (value: number) => string
export interface NkOfferPickerLabels {
  billing: string
  commitment: string
  billingEvery: (months: number) => string
  commitmentFor: (months: number) => string
  perMonth: (amount: string) => string
}
export interface NkSeatStepperLabels { fewer: string; more: string }
export interface NkPlanCheckoutFormLabels {
  plan: string
  seats: string
  fewerSeats: string
  moreSeats: string
  promoToggle: string
  promoCode: string
  promoApply: string
  promoRemove: string
  calculating: string
}
export interface NkPlanCheckoutPromo { input: string; applied: string | null; appliedLabel: string; error: string; applying: boolean }
export interface NkPaymentElementDialogLabels { loading: string; payNow: string; saveCard: string; securedByStripe: string; cancel: string; failed: string }
export interface NkSubscriptionCardTexts {
  status: (status: string) => string
  complimentary: string
  notAvailable: string
  seatsLabel: string
  billingLabel: string
  commitmentLabel: string
  nextInvoiceLabel: string
  paymentTermsLabel: string
  priceLabel: string
  seatsUnlimited: (used: number) => string
  seatsUsage: (used: number, total: number) => string
  seatsFromNextBilling: (total: number) => string
  billingEvery: (months: number) => string
  commitmentFor: (months: number) => string
  commitmentTrial: string
  commitmentUntil: (date: string) => string
  endPolicy: (policy: string) => string
  trialUntil: (date: string) => string
  endsOn: (date: string) => string
  nextInvoiceOn: (date: string) => string
  paymentTermsCard: string
  paymentTermsInvoice: string
  paymentTermsTrial: string
  monthlyList: (amount: string) => string
  modelFlat: string
  modelPerUser: (amount: string) => string
  modelCompany: (amount: string, includedSeats: number) => string
  modelExtraUser: (amount: string) => string
  pendingPlan: (plan: string, date: string) => string
  pendingOffer: (billing: string, commitment: string, date: string) => string
  trialEndsToday: string
  trialCountdown: (days: number) => string
  incompleteAlert: string
  pastDueAlert: string
  suspendedAlert: string
  cancelScheduled: (date: string) => string
  cancelCommitted: (date: string) => string
  actions: {
    chooseOffer: string
    completeCheckout: string
    abandonCheckout: string
    retryPayment: string
    resume: string
    manageSeats: string
    changeSeats: string
    changeOffer: string
    changePlan: string
    cancel: string
  }
}
export interface NkPaymentMethod {
  id: string
  brand: string | null
  last4: string | null
  expMonth: number | null
  expYear: number | null
  walletType: string | null
  isDefault: boolean
}
export interface NkPaymentMethodListLabels { empty: string; card: string; default: string; setDefault: string; remove: string; expires: (month: string, year: string) => string }
export interface NkInvoiceRow {
  id: string
  number: string
  dateLabel: string
  statusTone: NkStatusChipTone
  statusLabel: string
  dueLabel: string | null
  totalLabel: string
  pdfHref: string | null
  /** Uten lenke: eieren henter PDF-en selv på `download` (én fil ved klikk). */
  downloadable?: boolean
}
export interface NkInvoiceTableLabels { empty: string; number: string; date: string; status: string; total: string; pdf: string }

/**
 * NkSubscriptionCard (SIGN-1790): abonnementskortet. Props `subscription`
 * (`NkSubscriptionSummary`), `plans`, `canManage`, `canManageSeats`, `busy`,
 * `texts` (`NkSubscriptionCardTexts`), `formatMoney`, `formatDate`. Hendelser:
 * `choose-offer`, `complete-checkout`, `abandon-checkout`, `retry-payment`,
 * `resume`, `cancel`, `manage-seats`, `change-seats`, `change-offer`, `change-plan`.
 */
export const NkSubscriptionCard: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
/**
 * NkPlanCheckoutForm (SIGN-1790): utsjekkens skjema — planvalg, tilbudsvelger,
 * brukerteller, kampanjekode og prissammendrag, helt styrt av eieren. Hendelser:
 * `select-plan`, `update:offer`, `update:seats`, `update:promo-input`, `apply-promo`, `remove-promo`.
 */
export const NkPlanCheckoutForm: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const NkOfferPicker: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const NkSeatStepper: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const NkQuoteSummary: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
/**
 * NkPaymentElementDialog (SIGN-1790): Stripe Payment Element på NkSheet.
 * Props `open`, `mode` (`payment`/`setup`), `clientSecret`, `publishableKey`,
 * `title`, `description`, `labels`, `dark`, `returnUrl`. Hendelser `close`,
 * `succeeded`, `processing`, `failed`.
 */
export const NkPaymentElementDialog: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const NkPaymentMethodList: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
export const NkInvoiceTable: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>

/**
 * NkLineChart (SIGN-1873): det delte linjediagrammet — én eller noen få
 * tidsserier som SVG med designsystemets tokens; også i `./web`. Props:
 * `categories`, `series` (`NkLineChartSeries[]`), `labels`
 * (`NkLineChartLabels`), `ariaLabel`, `formatValue`, `formatCategory`,
 * `formatCategoryLong`, `plotHeight`, `loading`, `gridlines`. Slot `toolbar`.
 * Hover og piltaster viser alle seriene ved nærmeste kategori; «Vis som
 * tabell» er den tilgjengelige tvillingen. Første serie får
 * `--nk-action-primary`; øvrige må ha `color`.
 */
export interface NkLineChartSeries {
  key: string
  label: string
  values: readonly (number | null)[]
  color?: string
}
export interface NkLineChartLabels {
  table: string
  chart: string
  category: string
  empty: string
}
export const NkLineChart: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
/** Nærmeste «pene» akse-trinn (1, 2, 2,5, 5 × 10^n) over `rawStep`. */
export declare function niceStep(rawStep: number): number
/** Trinnene på y-aksen fra 0 til første pene verdi over `max`. */
export declare function niceTicks(max: number, count?: number): number[]
