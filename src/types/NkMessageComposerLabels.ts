/** Tekstene NkMessageComposer trenger fra appens i18n (SIGN-1313). */
export interface NkMessageComposerLabels {
  /** Feltets etikett for skjermlesere og plassholder, f.eks. «Skriv en melding». */
  field: string
  /** Send-knappens navn, f.eks. «Send». */
  send: string
  /** Legg ved-knappens navn, f.eks. «Legg ved fil» (SIGN-1317). Uten teksten vises ingen knapp. */
  attach?: string
  /** Fjern-knappen på et valgt vedlegg, f.eks. «Fjern». Filnavnet legges til av komponenten. */
  removeAttachment?: string
}
