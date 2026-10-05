/**
 * En plassholder i NkTemplateField (SIGN-1465). Hvilke plassholdere et felt
 * har, er appens data (typisk nøklene i standardmalen); navnet og meldingen
 * er appens ferdig oversatte tekst.
 */
export interface NkTemplatePlaceholder {
  /** Nøkkelen i lagringsformatet: `link` lagres som `{link}`. */
  key: string
  /** Navnet brukeren ser på knappen og brikken, f.eks. «Lenke til skjemaet». */
  label: string
  /** Satt = teksten må ha plassholderen; meldingen vises ved feltet når den mangler. */
  missingMessage?: string
}
