/**
 * Auto-reload ved utdaterte chunks etter deploy (SIGN-344).
 *
 * Etter en deploy peker en åpen fanes index.html på hash-navngitte chunks som
 * ikke lenger finnes; SPA-fallbacken svarer med index.html (text/html) og
 * lazy-lasting av ruter feiler med «Failed to fetch dynamically imported
 * module». Denne hjelperen fanger det opp og laster siden på nytt slik at
 * fanen sømløst får ny versjon — med vakt mot reload-loop hvis feilen skyldes
 * noe annet enn en deploy.
 *
 * Bruk: kall `installStaleChunkReload(router)` i appens oppstart (SPA-er med
 * vue-router), eller `installStaleChunkReload()` i apper uten router (Inertia).
 * SSR-trygg: gjør ingenting utenfor nettleseren.
 */

interface StaleChunkRouterTarget {
  fullPath: string
}

/**
 * Strukturelt subsett av vue-router sin Router — pakka skal ikke avhenge av
 * vue-router for dette.
 */
export interface StaleChunkRouter {
  onError(handler: (error: unknown, to: StaleChunkRouterTarget) => unknown): unknown
}

const STORAGE_KEY = 'nk:stale-chunk-reloaded-at'
const RELOAD_WINDOW_MS = 30_000

const STALE_CHUNK_PATTERNS = [
  /failed to fetch dynamically imported module/i,
  /error loading dynamically imported module/i,
  /importing a module script failed/i,
  /unable to preload css/i,
  /expected a javascript(-or-wasm)? module script/i,
]

export function isStaleChunkError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? '')
  return STALE_CHUNK_PATTERNS.some((pattern) => pattern.test(message))
}

function recentlyReloaded(): boolean {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY)
    return raw !== null && Date.now() - Number(raw) < RELOAD_WINDOW_MS
  } catch {
    // sessionStorage utilgjengelig (f.eks. blokkert lagring) — heller én
    // potensiell ekstra reload enn en loop-vakt som kaster.
    return false
  }
}

function markReloaded(): void {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, String(Date.now()))
  } catch {
    // Se over.
  }
}

export function installStaleChunkReload(router?: StaleChunkRouter): void {
  if (typeof window === 'undefined') {
    return
  }

  let pendingReload: number | undefined

  // Vite varsler med vite:preloadError når en preload av chunk/CSS feiler
  // (statisk import inne i en dynamisk chunk). preventDefault() hindrer at
  // Vite kaster feilen videre når vi uansett laster på nytt. Reloaden utsettes
  // et øyeblikk: kommer feilen fra en navigasjon, fyrer routerens onError rett
  // etterpå og fullfører heller navigasjonen med målruten i behold.
  window.addEventListener('vite:preloadError', (event) => {
    if (recentlyReloaded()) {
      return
    }
    event.preventDefault()
    if (pendingReload === undefined) {
      pendingReload = window.setTimeout(() => {
        markReloaded()
        window.location.reload()
      }, 100)
    }
  })

  // Fullfør navigasjonen med full sidelast, så brukeren lander på ruta de
  // klikket på. NB: når preload-varselet over har fyrt (pendingReload satt),
  // har preventDefault() svelget den opprinnelige feilen, og routeren melder
  // «Couldn't resolve component» — da vet vi likevel at årsaken er en
  // utdatert chunk. Uten preload-varsel (f.eks. chunk uten deps) kommer den
  // rå fetch-feilen hit og matches på melding.
  router?.onError((error, to) => {
    if ((pendingReload === undefined && !isStaleChunkError(error)) || recentlyReloaded()) {
      return
    }
    if (pendingReload !== undefined) {
      window.clearTimeout(pendingReload)
    }
    markReloaded()
    window.location.assign(to?.fullPath ?? window.location.href)
  })
}
