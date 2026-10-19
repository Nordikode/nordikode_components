/**
 * Retur fra en Stripe-redirect (3DS/bank/wallet): Payment Element sender
 * brukeren tilbake til `return_url` med `?checkout=return` (vår markør) og
 * Stripes egne nøkler. Sidene leser utfallet, viser melding, poller backend
 * med økende intervall til webhooken har landet (sannheten kommer alltid
 * fra backend) og stripper Stripe-nøklene fra URL-en. Delt av firmaappen og
 * Sign-innstillingene (SIGN-1790).
 */

export type NkCheckoutReturnStatus = 'succeeded' | 'processing' | 'failed'

/** Markøren vi selv legger i retur-URL-en. */
export const CHECKOUT_RETURN_QUERY = 'checkout=return'

/** Nøklene Stripe (og vi selv) legger i retur-URL-en. */
export const STRIPE_RETURN_QUERY_KEYS = [
  'checkout',
  'payment_intent',
  'payment_intent_client_secret',
  'setup_intent',
  'setup_intent_client_secret',
  'redirect_status',
] as const

/** Retur-URL for et Payment Element: nåværende side (stien beholdes) + vår markør. */
export const buildCheckoutReturnUrl = (location: Pick<Location, 'origin' | 'pathname'> = window.location): string =>
  `${location.origin}${location.pathname}?${CHECKOUT_RETURN_QUERY}`

/**
 * Utfallet av en Stripe-retur fra query-strengen, eller null når dette ikke
 * er en retur (krever både `checkout=return` og `redirect_status`).
 */
export const readStripeReturn = (search: string): NkCheckoutReturnStatus | null => {
  const params = new URLSearchParams(search.startsWith('?') ? search.slice(1) : search)

  if (params.get('checkout') !== 'return') return null

  const status = params.get('redirect_status')

  if (!status) return null
  if (status === 'succeeded') return 'succeeded'
  if (status === 'processing') return 'processing'

  // Alt annet (requires_payment_method, failed, …) betyr at betalingen ikke ble fullført.
  return 'failed'
}

/** URL-en uten Stripe-nøklene — resten av query-strengen beholdes. */
export const stripStripeParams = (href: string): string => {
  const url = new URL(href)

  for (const key of STRIPE_RETURN_QUERY_KEYS) {
    url.searchParams.delete(key)
  }

  return url.pathname + (url.search ? url.search : '') + url.hash
}

/** Verdien av én query-parameter, eller null når den mangler. */
export const readQueryParam = (search: string, key: string): string | null =>
  new URLSearchParams(search.startsWith('?') ? search.slice(1) : search).get(key)

/** URL-en uten gitt query-parameter — resten av query-strengen beholdes. */
export const stripQueryParam = (href: string, key: string): string => {
  const url = new URL(href)

  url.searchParams.delete(key)

  return url.pathname + (url.search ? url.search : '') + url.hash
}

/*
 * Reload-polleren: aktiveringen etter en betaling skjer asynkront via
 * Stripe-webhooken i core, så klienten vet aldri NÅR fasiten er klar.
 * I stedet for ett fast forsinket reload poller vi med økende intervall
 * og stopper så snart fingeravtrykket av sidens serverdata faktisk har
 * endret seg fra utgangspunktet. Etter taket (~15 s totalt) stopper vi
 * uansett — siste reload er da allerede gjort, aldri evig spinning.
 */

/** Økende intervaller mellom reloads — ~15 s totalt. */
export const RELOAD_POLL_DELAYS_MS = [1000, 2000, 3000, 4000, 5000] as const

/** Uten fingeravtrykk kan ingen endring oppdages — da ett reload som før. */
export const RELOAD_FALLBACK_DELAY_MS = 2500

export interface NkReloadPollerOptions {
  /** Gjør ett reload og resolver når sidens data er oppdatert. */
  reload: () => Promise<void>
  /**
   * Serialiserbart utsnitt av serverdataene som endres når webhooken
   * lander (abonnementsstatus, kortliste, tokensaldo, …). Uten denne
   * gjøres kun ett forsinket reload.
   */
  fingerprint?: () => unknown
  delays?: readonly number[]
}

export interface NkReloadPoller {
  /** Starter (eller restarter) pollingen fra dagens utgangspunkt. */
  start: () => void
  cancel: () => void
}

export const createReloadPoller = (options: NkReloadPollerOptions): NkReloadPoller => {
  const delays = options.delays ?? (options.fingerprint ? RELOAD_POLL_DELAYS_MS : [RELOAD_FALLBACK_DELAY_MS])

  let timer: ReturnType<typeof setTimeout> | null = null
  // Generasjonen skiller en restart fra runden som allerede er i gang —
  // et reload som resolver etter restart/cancel skal ikke fortsette.
  let generation = 0

  const snapshot = (): string | null => (options.fingerprint ? JSON.stringify(options.fingerprint()) : null)

  const cancel = (): void => {
    generation += 1

    if (timer) {
      clearTimeout(timer)
      timer = null
    }
  }

  const start = (): void => {
    cancel()

    const round = generation
    const baseline = snapshot()
    let step = 0

    const scheduleNext = (): void => {
      timer = setTimeout(() => {
        timer = null

        void options.reload().then(() => {
          if (generation !== round) return

          // Webhooken har landet — serverdataene er nye. Ferdig.
          if (options.fingerprint && snapshot() !== baseline) return

          step += 1

          if (step < delays.length) scheduleNext()
        })
      }, delays[step])
    }

    scheduleNext()
  }

  return { start, cancel }
}
