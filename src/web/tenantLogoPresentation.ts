/**
 * Smart logo-plassering i firmavelgeren (SIGN-676): én regel for hvordan ett
 * firma presenteres, delt mellom trigger og liste i `TenantSwitcherMenu`.
 * Fakta om logoen (form og tekst) kommer fra core, som måler fila ved
 * opplasting og spør vision-modellen om den inneholder tekst.
 */

export type TenantLogoFacts = {
  logoUrl?: string | null
  /**
   * Logoens bredde delt på høyde. Ukjent (null/undefined) behandles som
   * kvadratisk — trygt for gamle logoer som ennå ikke er analysert.
   */
  logoAspectRatio?: number | null
  /**
   * Om logoen inneholder lesbar tekst. `null` = ikke analysert ennå; da vises
   * navnet ved siden av logoen inntil svaret kommer via realtime.
   */
  logoContainsText?: boolean | null
}

/**
 * - `initials`: ingen (eller ødelagt) logo → sirkel med initialer + navn.
 * - `square`: kvadratisk/høy logo → kvadratisk logo uten sirkel + navn.
 * - `wide`: bred logo uten tekst → høydebegrenset, smal logo + navn.
 * - `wordmark`: bred logo med tekst → logoen alene, navnet kun for skjermleser.
 */
export type TenantLogoPresentation = 'initials' | 'square' | 'wide' | 'wordmark'

/** Logoer bredere enn 4:3 regnes som brede. */
export const WIDE_LOGO_ASPECT_RATIO = 4 / 3

export function tenantLogoPresentation(tenant: TenantLogoFacts, logoFailed = false): TenantLogoPresentation {
  if (!tenant.logoUrl || logoFailed) return 'initials'

  const ratio = tenant.logoAspectRatio ?? null

  if (ratio === null || !Number.isFinite(ratio) || ratio < WIDE_LOGO_ASPECT_RATIO) return 'square'

  return tenant.logoContainsText === true ? 'wordmark' : 'wide'
}
