/**
 * Reserve-initialer for avatarer uten bilde (SIGN-1668): én regel for hele
 * plattformen, brukt av `IdentityAvatar` (Vuetify-inngangen) og av
 * `AccountIdentityMenu`/`TenantSwitcherMenu` (web-inngangen). Samme person
 * og samme firma skal se likt ut i sakshodet, kontaktlisten og profilmenyen.
 *
 * Regelen: første bokstav i hvert av de to første ordene, som store
 * bokstaver («Kari Lund» → «KL», «Kari» → «K»). Et tomt navn gir `fallback`
 * («?» som standard) — aldri en tom brikke.
 */
export function initialsOf(name: string | null | undefined, fallback = '?'): string {
  const parts = (name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return fallback
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toLocaleUpperCase() ?? '')
    .join('')
}
