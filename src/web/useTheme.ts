import { ref } from 'vue'

/**
 * Delt dark-mode-composable for webflatene — én implementasjon i stedet for
 * forkene som tidligere lå i nettsiden og konto-appen.
 *
 * Kontrakt: temaet er `dark`-klassen på `<html>`; OS-preferansen er default.
 * Et eksplisitt valg lagres i localStorage kun så lenge det avviker fra OS-et
 * (selvryddende overstyring) — velges OS-verdien igjen, følger flaten OS-et
 * live. Verts-appens head-script bør sette initial klasse før paint med samme
 * nøkkel; composablen synker derfra.
 *
 * Klassen styrer også `color-scheme` (theme.css i style.css), slik at native
 * kontroller og scrollbars følger appens tema og ikke OS-et (SIGN-433).
 */

const STORAGE_KEY = 'nordikode-theme'

/** `system` følger OS-et; `light`/`dark` er eksplisitte valg (jf. preferredTheme i core). */
export type ThemePreference = 'system' | 'light' | 'dark'

const isDark = ref(false)
/** Gjeldende valg — `system` når ingen lokal overstyring finnes. */
const preference = ref<ThemePreference>('system')
let initialized = false

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function storedPreference(): ThemePreference {
  const stored = readStored()
  return stored === 'dark' || stored === 'light' ? stored : 'system'
}

function apply(dark: boolean) {
  isDark.value = dark
  document.documentElement.classList.toggle('dark', dark)
}

function osPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useTheme() {
  const preferenceRef = preference

  if (!initialized && typeof document !== 'undefined') {
    initialized = true

    // Respekter klassen head-scriptet alt har satt; fall tilbake til lagret
    // valg/OS når flaten ikke har et slikt script.
    preference.value = storedPreference()

    if (document.documentElement.classList.contains('dark')) {
      isDark.value = true
    } else {
      const stored = readStored()
      apply(stored === 'dark' || (stored !== 'light' && osPrefersDark()))
    }

    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', (event) => {
      const stored = readStored()
      if (stored !== 'dark' && stored !== 'light') apply(event.matches)
    })
  }

  /**
   * Bytter lys/mørk og returnerer det resulterende valget: `system` når det
   * nye temaet er OS-ets (overstyringen ryddes), ellers `light`/`dark`.
   * Verts-apper som lagrer valget på profilen (Sign, Time) bruker
   * returverdien — eller `change`-eventet på ThemeToggle.
   */
  function toggle(): ThemePreference {
    const next = !isDark.value
    const nextPreference: ThemePreference = next === osPrefersDark() ? 'system' : next ? 'dark' : 'light'
    try {
      if (nextPreference === 'system') {
        localStorage.removeItem(STORAGE_KEY)
      } else {
        localStorage.setItem(STORAGE_KEY, nextPreference)
      }
    } catch {
      // Privat modus — temaet gjelder likevel ut besøket.
    }
    preference.value = nextPreference
    apply(next)
    return nextPreference
  }

  /**
   * Sett temaet fra brukerens `preferredTheme` i core (sannhetskilden når
   * man er innlogget). `system` rydder den lokale overstyringen.
   */
  function applyPreference(preference: ThemePreference) {
    try {
      if (preference === 'system') {
        localStorage.removeItem(STORAGE_KEY)
      } else {
        localStorage.setItem(STORAGE_KEY, preference)
      }
    } catch {
      // Privat modus — temaet gjelder likevel ut besøket.
    }
    preferenceRef.value = preference
    apply(preference === 'dark' || (preference === 'system' && osPrefersDark()))
  }

  return { isDark, preference: preferenceRef, toggle, applyPreference }
}
