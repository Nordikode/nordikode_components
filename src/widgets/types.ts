/**
 * Widgetrammeverket (SIGN-1850, delt i SIGN-1873): en flate (dashbordet,
 * saksoversikten, høyrekolonnen på tilbudssiden) er satt sammen av widgeter
 * brukeren selv plasserer, gir størrelse og skjuler. Oppsettet er personlig
 * og lagres som én nøkkel per flate i lagringen appen gir rammeverket
 * (`WidgetLayoutStorage`; Sign: UI-preferansene i core).
 *
 * Tre størrelser, og innholdet er ulikt per størrelse — ikke bare skalert:
 * - `small`:  ett nøkkeltall eller én linje. Én kolonne, én rad.
 * - `medium`: et panel. Halve bredden, to rader.
 * - `large`:  alt. Hele bredden, tre rader.
 */
export type WidgetSize = 'small' | 'medium' | 'large'

export const WIDGET_SIZES: readonly WidgetSize[] = ['small', 'medium', 'large']

/** En sone på flaten: et rutenett (`grid`) eller en kolonne (`column`). */
export type WidgetZoneKind = 'grid' | 'column'

export interface WidgetDefinition {
  /** Stabil nøkkel som lagres i brukerens oppsett — endres aldri. */
  key: string
  /** Navnet (skjulte widgeter, dra-etiketten), ferdig oversatt av appen — eller en getter som følger språket. */
  title: string | (() => string)
  icon: string
  /** Størrelsene widgeten kan ha; den første er standard. */
  sizes: readonly WidgetSize[]
  /** Sonen widgeten står i som standard (flatens første sone når den mangler). */
  zone?: string
  /** Skjult som standard — brukeren henter den fram fra redigeringslinjen. */
  hidden?: boolean
  /** Antall rader per størrelse i et rutenett med faste rader, der standarden ikke passer. */
  rows?: Partial<Record<WidgetSize, number>>
}

export interface WidgetLayoutItem {
  key: string
  size: WidgetSize
  visible: boolean
  zone: string
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

export interface WidgetLayout {
  /** Alle widgeter i leserekkefølge (synlige først i sin sone, så skjulte). */
  widgets: WidgetLayoutItem[]
  /** Én oppføring per sone og kolonneantall brukeren har ordnet for hånd. */
  positions?: WidgetPositions[]
}

/** Tekstene rammeverket trenger fra appens i18n: redigeringslinjen og verktøyene på hver flis. */
export interface WidgetLabels {
  /** Overskriften i redigeringslinjen («Tilpass siden»). */
  editTitle: string
  /** Det korte hintet under overskriften. */
  hint: string
  /** Etiketten foran de skjulte widgetene («Skjulte widgeter»). */
  hidden: string
  /** Når ingen widgeter er skjult («Ingen»). */
  none: string
  /** «Tilbakestill»-knappen og bekreftelsens bekreft-knapp. */
  reset: string
  resetTitle: string
  resetBody: string
  /** «Ferdig»-knappen. */
  done: string
  /** Bekreftelsens avbryt-knapp. */
  cancel: string
  /** Dra-håndtakets navn for skjermlesere («Flytt {widget}»). */
  move: (widget: string) => string
  /** Dra-håndtakets tittel («Dra for å flytte»). */
  dragToMove: string
  /** Størrelsesknappen («Bytt til {size}»). */
  nextSize: (size: string) => string
  /** Skjul-knappen («Skjul {widget}»). */
  hide: (widget: string) => string
  /** Navnet på hver størrelse. */
  sizes: Record<WidgetSize, string>
}

/**
 * Lagringen oppsettet bor i. Appen eier den: Sign lagrer i brukerens
 * UI-preferanser i core, så oppsettet følger personen mellom nettlesere og
 * deles aldri med kolleger.
 */
export interface WidgetLayoutStorage {
  /** Det som er lagret under nøkkelen (hvilken form som helst — kontrolleren renser det), eller null/undefined når ingenting er lagret. */
  load(key: string): Promise<unknown>
  save(key: string, layout: WidgetLayout): Promise<void>
  /** Valgfri reaktiv getter: det lagrede nå, så en endring fra en annen fane tas i bruk. Kalles inni en Vue-watch. */
  current?(key: string): unknown
}
