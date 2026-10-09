// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { afterEach, describe, expect, it } from 'vitest'
import { createApp, h, reactive, type App } from 'vue'

import EmailVerificationBanner from '../src/web/EmailVerificationBanner.vue'
import { emailVerificationTexts } from '../src/web/emailVerificationTexts'

// Båndet «Bekreft e-posten din» (SIGN-1676). Det som voktes her: adressen og
// fristen står i teksten på brukerens språk, knappen følger nedtellingen,
// sendingen eies av appen, og fargene kommer fra varselrollen — aldri en hex.

const DEADLINE = '2026-10-11 14:30:00'

let app: App | null = null
let host: HTMLElement | null = null

function mountBanner(initial: { locale?: string; busy?: boolean; resendSecondsLeft?: number; labels?: Record<string, string> } = {}) {
  const props = reactive({ pending: { email: 'kari@example.com', deadlineAt: DEADLINE }, ...initial })
  let resends = 0

  host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp({
    render: () =>
      h(EmailVerificationBanner, {
        ...props,
        onResend: () => {
          resends += 1
        },
      } as never),
  })
  app.mount(host)

  const banner = () => host!.querySelector<HTMLElement>('.nk-verify')!
  const button = () => host!.querySelector<HTMLButtonElement>('.nk-verify__button')!

  return { props, resends: () => resends, banner, button }
}

const formatted = (locale: string): string =>
  new Intl.DateTimeFormat(locale, { dateStyle: 'long', timeStyle: 'short' }).format(new Date('2026-10-11T14:30:00Z'))

afterEach(() => {
  app?.unmount()
  host?.remove()
  app = null
  host = null
})

describe('båndet «Bekreft e-posten din»', () => {
  it('sier adressen og fristen på kildespråket, formatert av Intl', () => {
    const { banner, button } = mountBanner()

    expect(banner().getAttribute('role')).toBe('region')
    expect(banner().getAttribute('aria-label')).toBe('E-mail address not verified')
    expect(banner().querySelector('.nk-verify__text')!.textContent).toContain(`Confirm your e-mail address by ${formatted('en-GB')}. We sent a link to kari@example.com.`)
    expect(banner().querySelector('time')!.getAttribute('datetime')).toBe('2026-10-11T14:30:00.000Z')
    expect(button().textContent!.trim()).toBe('Send a new link')
    expect(button().disabled).toBe(false)
  })

  it('bruker brukerens språk fra pakken, uten at appen sender tekster', () => {
    const { banner, button } = mountBanner({ locale: 'no' })

    expect(banner().getAttribute('aria-label')).toBe('E-postadressen er ikke bekreftet')
    expect(banner().querySelector('.nk-verify__text')!.textContent).toContain(`Bekreft e-postadressen din innen ${formatted('nb-NO')}. Vi har sendt en lenke til kari@example.com.`)
    expect(button().textContent!.trim()).toBe('Send ny lenke')
  })

  it('melder sendingen til appen og følger nedtellingen den eier', async () => {
    const { props, resends, button } = mountBanner({ locale: 'no' })

    button().click()
    expect(resends()).toBe(1)

    props.resendSecondsLeft = 27
    await Promise.resolve()
    expect(button().disabled).toBe(true)
    expect(button().textContent!.trim()).toBe('Send på nytt om 27 s')

    props.resendSecondsLeft = 0
    props.busy = true
    await Promise.resolve()
    expect(button().disabled).toBe(true)
  })

  it('tar en ISO-frist som den er', () => {
    const { props, banner } = mountBanner()
    props.pending = { email: 'kari@example.com', deadlineAt: '2026-10-11T14:30:00Z' }

    expect(banner().querySelector('time')!.getAttribute('datetime')).toBe('2026-10-11T14:30:00.000Z')
  })

  it('har alle tekstene på hvert språk pakken har, og gir kildespråket ellers', () => {
    const source = emailVerificationTexts('en')
    const keys = Object.keys(source).sort()

    const dir = join(__dirname, '..', 'src', 'web', 'emailVerificationTexts')
    for (const locale of ['no', 'sv', 'fr', 'pl']) {
      const texts = JSON.parse(readFileSync(join(dir, `${locale}.json`), 'utf8')) as Record<string, string>
      expect(Object.keys(texts).sort(), locale).toEqual(keys)
      expect(texts.message, locale).toContain('{date}')
      expect(texts.message, locale).toContain('{email}')
      expect(texts.resendIn, locale).toContain('{seconds}')
    }

    expect(emailVerificationTexts('pt-BR')).toBe(source)
    expect(emailVerificationTexts('no-NO')).toBe(emailVerificationTexts('no'))
  })

  it('henter fargene fra varselrollen, aldri en hex', () => {
    const source = readFileSync(join(__dirname, '..', 'src', 'web', 'EmailVerificationBanner.vue'), 'utf8')
    const style = source.slice(source.indexOf('<style'))

    expect(style).toContain('var(--nk-warning, var(--color-warning))')
    expect(style).not.toMatch(/#[0-9a-f]{3,8}\b/i)
  })
})
