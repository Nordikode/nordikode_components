import { describe, expect, it } from 'vitest'

import { nkTypography } from '../src/tokens/base'
import { cssStaticVariables, defaultStaticTokens, productCss, type NkStaticTokens } from '../src/tokens/css'
import { signTheme } from '../src/tokens/products/sign'

// Typografirollene skal komme ut som CSS-variabler i appene (SIGN-1942).
// Det som voktes: hver rolle i nkTypography har sin variabel, kompakt
// brødtekst er 14 px ved siden av en urørt brødtekst på 16 px, og et
// theme lab-utkast lagret før rollen fantes gir standardverdien og ikke
// en tom variabel.

const VARIABLES: Record<keyof typeof nkTypography, string> = {
  rootSize: '--nk-font-root',
  heading: '--nk-text-heading',
  body: '--nk-text-body',
  bodyCompact: '--nk-text-body-compact',
  label: '--nk-text-label',
  button: '--nk-text-button',
}

describe('typografi-tokens', () => {
  it('gir hver rolle i nkTypography sin CSS-variabel', () => {
    const variables = cssStaticVariables()

    for (const role of Object.keys(nkTypography) as Array<keyof typeof nkTypography>) {
      expect(variables[VARIABLES[role]], role).toBe(nkTypography[role])
    }
  })

  it('har kompakt brødtekst på 14 px, og brødteksten er fortsatt 16 px', () => {
    expect(nkTypography.rootSize).toBe('16px')
    expect(nkTypography.body).toBe('1rem')
    expect(nkTypography.bodyCompact).toBe('0.875rem')
  })

  it('skriver --nk-text-body-compact i CSS-en appene genererer', () => {
    expect(productCss(signTheme)).toContain('--nk-text-body-compact: 0.875rem;')
  })

  it('gir standardverdien når et lagret utkast mangler rollen', () => {
    const draft = defaultStaticTokens()
    const { bodyCompact: _removed, ...olderTypography } = draft.typography
    const olderDraft = { ...draft, typography: olderTypography } as NkStaticTokens

    expect(cssStaticVariables(olderDraft)['--nk-text-body-compact']).toBe(nkTypography.bodyCompact)
  })

  it('følger verdien når rollen er endret i et utkast', () => {
    const draft = defaultStaticTokens()
    draft.typography.bodyCompact = '0.9rem'

    expect(cssStaticVariables(draft)['--nk-text-body-compact']).toBe('0.9rem')
  })
})
