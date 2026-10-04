import { describe, expect, it } from 'vitest'

import { missingTemplatePlaceholders, parseTemplate, templatePlaceholderKeys, templateToken } from '../src/template'

describe('templatePlaceholderKeys', () => {
  it('finner nøklene i rekkefølge uten duplikater', () => {
    expect(templatePlaceholderKeys('Ny melding fra {sender} ({company}): {link} {company}')).toEqual(['sender', 'company', 'link'])
  })

  it('tåler tom tekst', () => {
    expect(templatePlaceholderKeys(null)).toEqual([])
    expect(templatePlaceholderKeys('')).toEqual([])
  })
})

describe('parseTemplate', () => {
  it('deler teksten i tekst og kjente plassholdere', () => {
    expect(parseTemplate('Hei {company}: {link}', ['company', 'link'])).toEqual([
      { kind: 'text', text: 'Hei ' },
      { kind: 'placeholder', key: 'company' },
      { kind: 'text', text: ': ' },
      { kind: 'placeholder', key: 'link' },
    ])
  })

  it('lar ukjente {…} stå som tekst', () => {
    expect(parseTemplate('{x} og {link}', ['link'])).toEqual([
      { kind: 'text', text: '{x} og ' },
      { kind: 'placeholder', key: 'link' },
    ])
  })

  it('setter sammen til samme tekst (lagringsformatet er uendret)', () => {
    const text = '{link}\nHilsen {company} {ukjent}'
    const joined = parseTemplate(text, ['link', 'company'])
      .map((segment) => (segment.kind === 'text' ? segment.text : templateToken(segment.key)))
      .join('')
    expect(joined).toBe(text)
  })
})

describe('missingTemplatePlaceholders', () => {
  const placeholders = [
    { key: 'company', label: 'Firmanavn' },
    { key: 'link', label: 'Lenke', missingMessage: 'Mangler lenken.' },
  ]

  it('melder obligatoriske plassholdere som mangler', () => {
    expect(missingTemplatePlaceholders('Hei fra {company}', placeholders).map((p) => p.key)).toEqual(['link'])
  })

  it('godtar teksten når de er med', () => {
    expect(missingTemplatePlaceholders('Hei: {link}', placeholders)).toEqual([])
  })

  it('tomt felt betyr standardteksten og mangler ingenting', () => {
    expect(missingTemplatePlaceholders('  ', placeholders)).toEqual([])
    expect(missingTemplatePlaceholders(null, placeholders)).toEqual([])
  })
})
