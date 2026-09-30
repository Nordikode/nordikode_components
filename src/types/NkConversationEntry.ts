import type { NkConversationAttachment } from './NkConversationAttachment'

/**
 * Ett innslag i NkConversation (SIGN-1313): en melding (boble) eller en
 * hendelse i samtalen (sentrert linje, f.eks. «Samtalen ble løst»).
 * Appen eier all tekst: `text`, `author` og `receipt` er ferdig oversatt.
 */
export interface NkConversationEntry {
  id: string
  kind: 'message' | 'event'
  /** Om den som ser på, har skrevet meldingen (boble til høyre). Hendelser bruker den ikke. */
  own?: boolean
  /** Navn over boblen, f.eks. «Nordikode» eller navnet på brukeren. */
  author?: string
  /** Meldingsteksten slik den ble skrevet (linjeskift beholdes), eller hendelsens tekst. */
  text: string
  /** Tidspunktet som ISO 8601. */
  at: string
  /** Liten linje under boblen, f.eks. «Lest 14:03» eller «Sendt». */
  receipt?: string
  /** Filene i meldingen (SIGN-1317): bilder i boblen, andre filer som lenker. */
  attachments?: NkConversationAttachment[]
}
