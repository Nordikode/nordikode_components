import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

// Antall-merkene i den delte chromen (bjellen, app-velgeren, sidemenyen) skal
// ha samme farge på alle flater. Fargen kommer derfor fra badge-kontrakten
// `--nk-chrome-badge` / `--nk-chrome-badge-ink`, aldri fra aksenten — den er
// appens egen farge, og bjellens antall ble svart i noen apper og rosa i
// andre da den brukte aksenten (SIGN-1318).

const webDir = join(__dirname, '..', 'src', 'web')

type BadgeRule = { file: string; selector: string; declarations: Map<string, string> }

function badgeRules(): BadgeRule[] {
  const rules: BadgeRule[] = []

  for (const file of readdirSync(webDir).filter((name) => name.endsWith('.vue'))) {
    const source = readFileSync(join(webDir, file), 'utf8')
    const styles = [...source.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/g)].map((match) => match[1]).join('\n')
    const css = styles.replace(/\/\*[\s\S]*?\*\//g, '')

    for (const [, selector, body] of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) {
      if (!/__badge(?![\w-])/.test(selector)) continue

      const declarations = new Map<string, string>()
      for (const declaration of body.split(';')) {
        const separator = declaration.indexOf(':')
        if (separator === -1) continue
        declarations.set(declaration.slice(0, separator).trim(), declaration.slice(separator + 1).trim())
      }
      rules.push({ file, selector: selector.trim(), declarations })
    }
  }

  return rules
}

describe('antall-merkene i chromen', () => {
  const filled = badgeRules().filter((rule) => rule.declarations.has('background') || rule.declarations.has('background-color'))

  it('finner merkene på bjellen, app-velgeren og sidemenyen', () => {
    expect(filled.map((rule) => rule.selector).sort()).toEqual(['.nk-bell__badge', '.nk-launcher__badge', '.nk-section-nav__badge'])
  })

  it.each(filled)('$selector i $file fylles med badge-kontrakten, aldri aksenten', (rule) => {
    const background = rule.declarations.get('background') ?? rule.declarations.get('background-color')

    expect(background).toMatch(/^var\(--nk-chrome-badge,/)
    expect(rule.declarations.get('color')).toMatch(/^var\(--nk-chrome-badge-ink,/)
  })
})
