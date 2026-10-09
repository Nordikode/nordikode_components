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
