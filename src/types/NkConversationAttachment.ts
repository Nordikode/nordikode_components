/**
 * En fil i et innslag i NkConversation (SIGN-1317). Appen eier lenken og
 * teksten: `url` er den signerte, kortlevde lenken fra svaret (null når
 * den ikke kunne signeres), `sizeLabel` er størrelsen ferdig formatert på
 * brukerens språk (`formatFileSize`).
 */
export interface NkConversationAttachment {
  id: string
  /** Navnet avsenderen ga filen. */
  name: string
  /** Signert lenke rett mot lagringen, eller null. Vises aldri på nytt fra lagring. */
  url: string | null
  /** Bilder vises i boblen; andre filer som lenke med navn og størrelse. */
  isImage: boolean
  /** Størrelsen på brukerens språk, f.eks. «1,2 MB». */
  sizeLabel: string
}
