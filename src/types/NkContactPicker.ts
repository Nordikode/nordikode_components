/**
 * Kontaktvelgeren (SIGN-1913): det en rad eller et kort viser om en kontakt.
 * Samme form for kunde, leverandør, underleverandør og ansatt — appen
 * oversetter sine egne data hit, og velgeren vet ikke hvilken type det er.
 */
export interface NkContactPickerItem {
  id: string
  name: string
  /** Hva kontakten er, som felt fra appens data: en person får initialer, et firma får firmaikonet. */
  kind: 'person' | 'company'
  /** Bilde eller logo (signert lenke fra appens data). Uten bilde vises initialer eller firmaikonet. */
  imageUrl?: string | null
  /** Korte merker ved navnet: roller («Kunde», «Leverandør») — ferdig oversatt av appen. */
  tags?: string[]
  /** Én linje under navnet: kontaktperson i firmaet, stilling eller avdeling. */
  secondary?: string | null
  phone?: string | null
  email?: string | null
  /** Sted: poststed eller kort adresse. */
  location?: string | null
  /** Overskriften raden står under («Brukes ofte», «Alle kontakter»). Rader med samme gruppe må stå samlet. */
  group?: string | null
}

export type NkContactPickerView = 'list' | 'cards'

/** Et filter over listen: hvilken type kontakt som vises («Alle», «Kollegaer», «Kunder» …). Appen filtrerer dataene. */
export interface NkContactPickerFilter {
  key: string
  label: string
}

/** Tekstene NkContactPickerDialog trenger fra appens i18n (SIGN-1913). */
export interface NkContactPickerLabels {
  /** Plassholderen og navnet på søkefeltet, f.eks. «Søk i kontakter». */
  search: string
  /** Navnet på gruppen med visningsknappene, f.eks. «Visning». */
  view: string
  /** Knappen for listevisning, f.eks. «Liste». */
  viewList: string
  /** Knappen for kortvisning, f.eks. «Kort». */
  viewCards: string
  /** Navnet på lukkeknappen, f.eks. «Lukk». */
  close: string
  /** Merket på kontakten som er valgt fra før, f.eks. «Valgt». */
  selected: string
  /** Knappen som henter neste side, f.eks. «Vis flere». */
  showMore: string
  /** Vises mens første side hentes, f.eks. «Laster …». */
  loading: string
  /** Tittelen når registeret er tomt, f.eks. «Ingen kontakter ennå». */
  empty: string
  /** Tittelen når søket ikke ga treff, f.eks. «Ingen treff på «hansen»» — appen setter inn søketeksten. */
  noMatches: string
  /** Knappen som starter «Ny kontakt», f.eks. «Ny kunde». Brukes bare med `canCreate`. */
  create?: string
  /** Knappen som fjerner valget, f.eks. «Fjern kunde». Brukes bare med `clearable`. */
  clear?: string
  /** Knappen som lukker velgeren når flere kan velges, f.eks. «Ferdig» eller «Legg til 3». Brukes bare med `multiple`. */
  done?: string
  /** Navnet på gruppen med filterknappene, f.eks. «Vis». Brukes bare med `filters`. */
  filters?: string
}
