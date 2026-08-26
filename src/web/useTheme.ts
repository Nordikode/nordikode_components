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
 */

const STORAGE_KEY = 'nordikode-theme'

/** `system` følger OS-et; `light`/`dark` er eksplisitte valg (jf. preferredTheme i core). */
export type ThemePreference = 'system' | 'light' | 'dark'

const isDark = ref(false)
let initialized = false

function readStored(): string | null {
  try {
    return localStorage.getItem(STORAGE_KEY)
  } catch {
    return null
  }
}

function apply(dark: boolean) {
  isDark.value = dark
  document.documentElement.classList.toggle('dark', dark)
}

function osPrefersDark(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}

export function useTheme() {
  if (!initialized && typeof document !== 'undefined') {
    initialized = true

    // Respekter klassen head-scriptet alt har satt; fall tilbake til lagret
    // valg/OS når flaten ikke har et slikt script.
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

  function toggle() {
    const next = !isDark.value
    try {
      if (next === osPrefersDark()) {
        localStorage.removeItem(STORAGE_KEY)
      } else {
        localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
      }
    } catch {
      // Privat modus — temaet gjelder likevel ut besøket.
    }
    apply(next)
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
    apply(preference === 'dark' || (preference === 'system' && osPrefersDark()))
  }

  return { isDark, toggle, applyPreference }
}
