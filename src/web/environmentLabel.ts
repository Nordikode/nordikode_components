import { readonly, ref } from 'vue'

/**
 * Miljømerket (SIGN-773): en kort tekst («BETA») som tegnes inntil
 * merkevarelogoen i `BrandWordmark` — og dermed i `AppHeader` og på alle
 * innloggings- og vilkårssider som bruker logoen — så en tester aldri er i
 * tvil om hvilket miljø hen står i.
 *
 * Teksten er miljødata, aldri kode: hver app setter den én gang ved oppstart
 * fra sitt env (`VITE_ENVIRONMENT_LABEL` i SPA-ene,
 * `NORDIKODE_ENVIRONMENT_LABEL` i Inertia-appene). Tom tekst = ingen merke,
 * som er tilfellet i prod.
 */
const environmentLabel = ref('')

export function setEnvironmentLabel(label: string | null | undefined): void {
  environmentLabel.value = (label ?? '').trim()
}

export function useEnvironmentLabel() {
  return readonly(environmentLabel)
}
