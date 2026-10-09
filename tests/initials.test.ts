import { describe, expect, it } from 'vitest'

import { initialsOf } from '../src/initials'

describe('initialsOf', () => {
  it('tar første bokstav i de to første ordene', () => {
    expect(initialsOf('Kari Lund')).toBe('KL')
    expect(initialsOf('Ola Nordmann Hansen')).toBe('ON')
  })

  it('gir én bokstav for ett ord', () => {
    expect(initialsOf('Kari')).toBe('K')
  })

  it('tåler mellomrom rundt og mellom ordene, og små bokstaver', () => {
    expect(initialsOf('  fjord   as ')).toBe('FA')
  })

  it('gir reserven for tomt navn', () => {
    expect(initialsOf('')).toBe('?')
    expect(initialsOf('   ')).toBe('?')
    expect(initialsOf(null)).toBe('?')
    expect(initialsOf(undefined)).toBe('?')
    expect(initialsOf('', 'U')).toBe('U')
  })

  it('bruker samme regel i begge innganger', async () => {
    const main = await import('../src/index')
    const web = await import('../src/web/index')
    expect(main.initialsOf).toBe(initialsOf)
    expect(web.initialsOf).toBe(initialsOf)
  })
})
