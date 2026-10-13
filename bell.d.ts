import type { DefineComponent } from 'vue'

/**
 * `@nordikode/components/bell` (SIGN-1295): varslingsbjellen alene, for flater
 * som bare laster den for innloggede. Samme komponent og samme typer som
 * `@nordikode/components/web` eksporterer.
 */
export type NotificationBellItem = {
  id: string
  title: string
  body?: string | null
  timeLabel: string
  read: boolean
  /** Firmaet varselet gjelder; navnet slås opp i bjellens `companies` (SIGN-1579). */
  tenantId?: string | null
}

/** Et firma brukeren er medlem av; bjellen viser navnet når de er flere enn ett. */
export type NotificationBellCompany = {
  id: string
  name: string
}

export type NotificationBellLabels = {
  menu: string
  menuWithUnread: string
  title: string
  empty: string
  markAllRead: string
  unread: string
  loading?: string
}

export const NotificationBellMenu: DefineComponent<Record<string, unknown>, Record<string, unknown>, unknown>
