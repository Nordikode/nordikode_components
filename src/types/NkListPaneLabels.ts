/** Tekstene NkListPane trenger fra appens i18n (SIGN-1845). */
export interface NkListPaneLabels {
  /** Navnet på filterknappen og filtermenyen, f.eks. «Filtre». Uten `#filters`-slot vises ingen knapp. */
  filters?: string
  /** Knappen i filtermenyen som nullstiller filtrene, f.eks. «Nullstill». Vises bare når `filterCount` > 0. */
  resetFilters?: string
}
