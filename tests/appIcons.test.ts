import { describe, expect, it } from 'vitest'

import { webAppFallbackIcon, webAppIconFor, webAppIcons } from '../src/web/appIcons'
import { nkProductThemes } from '../src/tokens'

// Hvert produkt har sin egen tegning i app-velgeren. En ny app uten oppføring
// får reserveikonet (tre lag) og kan ikke skilles fra andre nye apper.

describe('appikonene', () => {
  it('har en egen tegning for hver produktapp', () => {
    for (const key of ['sign', 'time', 'sketch']) {
      expect(webAppIconFor(key), key).not.toBe(webAppFallbackIcon)
      expect(webAppIconFor(key).length, key).toBeGreaterThan(0)
    }
  })

  it('gir ingen to apper samme tegning', () => {
    const drawings = Object.values(webAppIcons).map((paths) => paths.join(' '))

    expect(new Set(drawings).size).toBe(drawings.length)
  })

  it('faller tilbake til reserveikonet for en ukjent app', () => {
    expect(webAppIconFor('not-an-app')).toBe(webAppFallbackIcon)
  })
})

describe('produkttemaene', () => {
  it('har Sketch registrert med eget Vuetify-temanavn', () => {
    expect(nkProductThemes.sketch.product).toBe('sketch')
    expect(nkProductThemes.sketch.vuetifyThemeName).toBe('NordikodeSketch')
  })

  it('gir hvert produkt en handlingsfarge ingen andre har', () => {
    for (const mode of ['light', 'dark'] as const) {
      const actions = Object.values(nkProductThemes).map((theme) => theme[mode].primary)

      expect(new Set(actions).size, mode).toBe(actions.length)
    }
  })

  it('har samme sett med roller i alle produkter', () => {
    const roles = (scheme: object) => Object.keys(scheme).sort()
    const expected = roles(nkProductThemes.sign.light)

    for (const theme of Object.values(nkProductThemes)) {
      expect(roles(theme.light), `${theme.product} light`).toEqual(expected)
      expect(roles(theme.dark), `${theme.product} dark`).toEqual(expected)
    }
  })
})
