/**
 * Vedlegg i NkMessageComposer (SIGN-1317). Appen eier grensene og teksten:
 * `validate` får hver valgt fil og hvor mange som alt er valgt, og svarer
 * med en ferdig oversatt feilmelding — eller null når filen kan legges ved.
 */
export interface NkMessageComposerAttachments {
  /** `accept` på filvelgeren, f.eks. `image/*,.pdf`. Uten verdi tas alle filer imot av velgeren; `validate` er porten. */
  accept?: string
  /** Én fil av gangen når false. Standard er flere. */
  multiple?: boolean
  /** Filen kan ikke legges ved: teksten som vises. Null = tatt imot. */
  validate: (file: File, selectedCount: number) => string | null
}
