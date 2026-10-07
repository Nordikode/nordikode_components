import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { Ref } from 'vue'

/**
 * Autolagring (SIGN-486/SIGN-971, delt i SIGN-1382): én skrivemotor og én
 * innstillingskjerne for alle innloggede flater, så Sign-innstillingene og
 * firmaappen lagrer likt — endringer skrives etter en kort pause, aldri to
 * skriv om gangen, ett nytt forsøk ved feil, og eget skriv overskriver aldri
 * det brukeren fortsetter å skrive.
 *
 * Det som er ulikt per app (rutevakt i vue-router, Inertias `before`-hendelse,
 * tekstene) ligger utenfor: appen pakker kjernen inn og eier skjemaet.
 */

export type DraftAutosaveStatus = 'idle' | 'pending' | 'saving' | 'saved' | 'error'

export interface DraftAutosave {
  status: Ref<DraftAutosaveStatus>
  savedAt: Ref<Date | null>
  /** Merker utkastet som endret; skrives etter pausen. */
  schedule: () => void
  /** Skriver et ventende utkast med én gang og venter på pågående skriv. */
  flush: () => Promise<void>
  /** Forkaster et ventende skriv (utkastet er sendt inn eller forkastet). */
  cancel: () => void
}

/**
 * 2 s: kort nok til å føles automatisk, langt nok til at gatewayens kvote for
 * de åpne lenkene (40 kall/min per IP) ikke nås av jevn tasting.
 */
export const DRAFT_AUTOSAVE_DELAY_MS = 2000

/** Innstillingssidene bak innlogging skriver litt raskere. */
export const SETTINGS_AUTOSAVE_DELAY_MS = 1500

const RETRY_DELAY_MS = 10_000

export const createDraftAutosave = (save: () => Promise<void>, delayMs = DRAFT_AUTOSAVE_DELAY_MS): DraftAutosave => {
  const status = ref<DraftAutosaveStatus>('idle')
  const savedAt = ref<Date | null>(null)

  let timer: ReturnType<typeof setTimeout> | null = null
  let inflight: Promise<void> | null = null
  let dirty = false

  const clearTimer = (): void => {
    if (timer !== null) {
      clearTimeout(timer)
      timer = null
    }
  }

  const run = (): Promise<void> => {
    if (inflight) {
      // Skrivet som pågår har ikke med de siste endringene — skriv igjen etterpå.
      dirty = true
      return inflight
    }

    dirty = false
    status.value = 'saving'

    inflight = save()
      .then(() => {
        savedAt.value = new Date()
        status.value = 'saved'
      })
      .catch(() => {
        status.value = 'error'
        dirty = true
        clearTimer()
        timer = setTimeout(() => {
          timer = null
          void run()
        }, RETRY_DELAY_MS)
      })
      .finally(() => {
        inflight = null

        if (dirty && timer === null) {
          void run()
        }
      })

    return inflight
  }

  const schedule = (): void => {
    clearTimer()
    dirty = true
    status.value = inflight ? 'saving' : 'pending'
    timer = setTimeout(() => {
      timer = null
      void run()
    }, delayMs)
  }

  const flush = async (): Promise<void> => {
    clearTimer()

    if (dirty || inflight) {
      await run()
    }

    // Et skriv som lå i kø bak det pågående er nå startet — vent på det også.
    if (inflight) {
      await inflight
    }
  }

  const cancel = (): void => {
    clearTimer()
    dirty = false

    if (!inflight) {
      status.value = 'idle'
    }
  }

  return { status, savedAt, schedule, flush, cancel }
}

export interface SettingsAutosaveOptions {
  /** Skjemaets tilstand som streng. */
  signature: Ref<string>
  /** Signaturen til sist lagrede tilstand; '' = ikke lastet. */
  baseline: Ref<string>
  /** Skriver skjemaet. Kaster ved feil. */
  save: () => Promise<void>
  /** Feilmeldingen brukeren ser; serverens egen melding når den finnes. */
  describeError: (error: unknown) => string
  delayMs?: number
}

export interface SettingsAutosave {
  status: Ref<DraftAutosaveStatus>
  /** Feilmelding fra siste mislykkede skriv; '' når alt er i orden. */
  errorMessage: Ref<string>
  /**
   * Sann når svaret som nettopp kom er vårt eget skriv: baseline flyttes til
   * det som ble sendt og skjemaet står urørt. Usann ellers — da skal siden
   * synke skjemaet fra svaret.
   */
  absorbOwnUpdate: () => boolean
  /** Skjemaet avviker fra sist lagrede tilstand. */
  isDirty: () => boolean
  /** Skriver det som venter nå (før siden forlates). */
  flush: () => Promise<void>
  /** Forkaster det som venter (brukeren forlater uten å lagre). */
  cancel: () => void
}

/**
 * Kjernen i autolagringen av en innstillingsside: hver endring i `signature`
 * starter pausen på nytt, et skjema som er tilbake på lagret tilstand skriver
 * ingenting, og fanen som forlates (visibilitychange) skriver det som venter.
 * Må kalles i setup(). Rutevakten eier appen.
 */
export const useSettingsAutosave = ({
  signature,
  baseline,
  save,
  describeError,
  delayMs = SETTINGS_AUTOSAVE_DELAY_MS,
}: SettingsAutosaveOptions): SettingsAutosave => {
  const errorMessage = ref('')

  // Signaturen som er på vei til serveren; null når ingen skriv pågår.
  let sentSignature: string | null = null

  const autosave = createDraftAutosave(async () => {
    sentSignature = signature.value

    try {
      await save()
      errorMessage.value = ''
    } catch (error) {
      errorMessage.value = describeError(error)
      throw error
    } finally {
      sentSignature = null
    }
  }, delayMs)

  const absorbOwnUpdate = (): boolean => {
    if (sentSignature === null) {
      return false
    }

    baseline.value = sentSignature

    return true
  }

  const isDirty = (): boolean => baseline.value !== '' && signature.value !== baseline.value

  watch(signature, () => {
    if (baseline.value === '') {
      return
    }

    if (isDirty()) {
      autosave.schedule()
    } else {
      autosave.cancel()
    }
  })

  const onVisibilityChange = (): void => {
    if (document.visibilityState === 'hidden') {
      void autosave.flush()
    }
  }

  onMounted(() => {
    document.addEventListener('visibilitychange', onVisibilityChange)
  })

  onBeforeUnmount(() => {
    document.removeEventListener('visibilitychange', onVisibilityChange)
    autosave.cancel()
  })

  return {
    status: autosave.status,
    errorMessage,
    absorbOwnUpdate,
    isDirty,
    flush: autosave.flush,
    cancel: autosave.cancel,
  }
}
