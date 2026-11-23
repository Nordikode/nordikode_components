// @vitest-environment happy-dom
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, reactive, ref, type App, type Component } from 'vue'
import { createVuetify } from 'vuetify'
import { VAlert, VBtn, VCard, VCardText, VCardTitle, VDialog } from 'vuetify/components'

import NkConfirmDialog from '../src/components/NkConfirmDialog.vue'
import NkDialog from '../src/components/NkDialog.vue'
import NkSheet from '../src/components/NkSheet.vue'

// Dialogene er felles for alle flatene (SIGN-846). Det som voktes her, er
// det skjermleseren og tastaturet trenger: dialogen har et navn som peker
// på den synlige tittelen, ingressen er beskrivelsen, og fokus går tilbake
// dit brukeren kom fra når dialogen lukkes.

beforeAll(() => {
  // Vuetify måler og animerer; happy-dom har ikke alt.
  const globals = globalThis as Record<string, unknown>
  globals.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  }
  globals.visualViewport ??= { addEventListener() {}, removeEventListener() {}, width: 1280, height: 800 }
  if (typeof Element.prototype.animate !== 'function') {
    Element.prototype.animate = (() => ({ finished: Promise.resolve(), cancel() {} })) as never
  }
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    addEventListener() {},
    removeEventListener() {},
    addListener() {},
    removeListener() {},
  })) as never
})

let app: App | null = null
let host: HTMLElement | null = null

function mount(root: Component, defaults: Record<string, Record<string, unknown>> = {}) {
  host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp(root)
  app.use(createVuetify({ components: { VAlert, VBtn, VCard, VCardText, VCardTitle, VDialog }, defaults }))
  app.mount(host)
}

// Knappestandarden appene setter i `plugins/vuetify.ts`.
const appButtonDefaults = { VBtn: { color: 'primary', variant: 'flat' } }

const settle = async () => {
  for (let i = 0; i < 4; i += 1) await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
}

// Dialogen setter fokus på «Avbryt» når inn-animasjonen er ferdig
// (Vuetifys after-enter). settle() alene venter ikke alltid lenge nok, og
// testene feilet da tilfeldig i CI: vent til fokuset faktisk står der.
const opened = async () => {
  await settle()
  await vi.waitFor(() => {
    expect(document.activeElement?.classList.contains('nk-confirm__cancel')).toBe(true)
  })
  await settle()
}

const overlay = () => document.querySelector<HTMLElement>('.v-overlay.v-dialog')
const content = () => document.querySelector<HTMLElement>('.v-overlay__content')

afterEach(() => {
  app?.unmount()
  host?.remove()
  app = null
  host = null
  document.body.innerHTML = ''
  vi.restoreAllMocks()
})

describe('NkDialog', () => {
  it('names the dialog after the first heading in its content', async () => {
    mount(() =>
      h(NkDialog, { modelValue: true }, () =>
        h(VCard, () => [h(VCardTitle, () => 'Slette saken?'), h(VCardText, () => 'Saken fjernes.')]),
      ),
    )
    await settle()

    const dialog = overlay()!
    expect(dialog.getAttribute('role')).toBe('dialog')
    expect(dialog.getAttribute('aria-modal')).toBe('true')
    const title = document.getElementById(dialog.getAttribute('aria-labelledby')!)
    expect(title?.textContent).toBe('Slette saken?')
  })

  it('prefers the element marked as title and keeps an id the owner has set', async () => {
    mount(() =>
      h(NkDialog, { modelValue: true }, () =>
        h('div', [
          h('h3', 'Trinn 1 av 3'),
          h('span', { id: 'eget-navn', 'data-nk-dialog-title': '' }, 'Send tilbudet'),
          h('p', { 'data-nk-dialog-description': '' }, 'Kunden får en lenke på e-post.'),
        ]),
      ),
    )
    await settle()

    const dialog = overlay()!
    expect(dialog.getAttribute('aria-labelledby')).toBe('eget-navn')
    const description = document.getElementById(dialog.getAttribute('aria-describedby')!)
    expect(description?.textContent).toBe('Kunden får en lenke på e-post.')
  })

  it('lets an explicit aria-label win and adds no aria-labelledby next to it', async () => {
    mount(() => h(NkDialog, { modelValue: true, 'aria-label': 'Bilde 2 av 5' }, () => h('h2', 'Skjult overskrift')))
    await settle()

    const dialog = overlay()!
    expect(dialog.getAttribute('aria-label')).toBe('Bilde 2 av 5')
    expect(dialog.hasAttribute('aria-labelledby')).toBe(false)
  })

  it('follows the content when the title is replaced while the dialog is open', async () => {
    const step = ref(1)
    mount(() =>
      h(NkDialog, { modelValue: true }, () =>
        step.value === 1 ? h('h2', { key: 'a' }, 'Velg kunde') : h('h2', { key: 'b' }, 'Bekreft kunde'),
      ),
    )
    await settle()
    step.value = 2
    await settle()

    const title = document.getElementById(overlay()!.getAttribute('aria-labelledby')!)
    expect(title?.textContent).toBe('Bekreft kunde')
  })

  it('warns when a dialog has no accessible name', async () => {
    const warn = vi.spyOn(console, 'warn').mockImplementation(() => {})
    mount(() => h(NkDialog, { modelValue: true }, () => h('div', [h('p', 'Bare tekst')])))
    await settle()

    expect(overlay()!.hasAttribute('aria-labelledby')).toBe(false)
    expect(warn).toHaveBeenCalledTimes(1)
    expect(String(warn.mock.calls[0][0])).toContain('NkDialog')
  })

  it('returns focus to the element that opened a v-model dialog', async () => {
    const open = ref(false)
    mount(() =>
      h('div', [
        h('button', { id: 'opener', onClick: () => (open.value = true) }, 'Åpne'),
        h(
          NkDialog,
          { modelValue: open.value, 'onUpdate:modelValue': (value: boolean) => (open.value = value) },
          () => h('div', [h('h2', 'Gi nytt navn'), h('button', { id: 'inside' }, 'Lagre')]),
        ),
      ]),
    )
    const opener = document.getElementById('opener') as HTMLButtonElement
    opener.focus()
    opener.click()
    await settle()
    document.getElementById('inside')!.focus()
    expect(document.activeElement?.id).toBe('inside')

    open.value = false
    await settle()
    expect(document.activeElement).toBe(opener)
  })

  it('leaves focus alone when the owner has moved it elsewhere on close', async () => {
    const open = ref(false)
    mount(() =>
      h('div', [
        h('button', { id: 'opener', onClick: () => (open.value = true) }, 'Åpne'),
        h('input', { id: 'next' }),
        h(NkDialog, { modelValue: open.value }, () => h('h2', 'Ny sak')),
      ]),
    )
    const opener = document.getElementById('opener') as HTMLButtonElement
    opener.focus()
    opener.click()
    await settle()

    document.getElementById('next')!.focus()
    open.value = false
    await settle()
    expect(document.activeElement?.id).toBe('next')
  })

  it('closes on Escape and reports it to the owner', async () => {
    const open = ref(true)
    mount(() =>
      h(NkDialog, { modelValue: open.value, 'onUpdate:modelValue': (value: boolean) => (open.value = value) }, () =>
        h('h2', 'Ny sak'),
      ),
    )
    await settle()

    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await settle()
    expect(open.value).toBe(false)
  })

  it("passes the owner's scope id on to the teleported dialog so scoped styles still match", async () => {
    const Owner = defineComponent({
      __scopeId: 'data-v-owner',
      render: () => h(NkDialog, { modelValue: true, class: 'owner-dialog' }, () => h('h2', 'Søk')),
    } as never)
    mount(Owner)
    await settle()

    const dialog = overlay()!
    expect(dialog.classList.contains('owner-dialog')).toBe(true)
    expect(dialog.hasAttribute('data-v-owner')).toBe(true)
  })

  it('hands a close function to the default slot', async () => {
    const open = ref(true)
    mount(() =>
      h(NkDialog, { modelValue: open.value, 'onUpdate:modelValue': (value: boolean) => (open.value = value) }, {
        default: ({ close }: { close: () => void }) => h('button', { id: 'close', 'aria-label': 'Lukk', onClick: close }),
      }),
    )
    await settle()
    document.getElementById('close')!.click()
    await settle()
    expect(open.value).toBe(false)
  })
})

describe('NkSheet', () => {
  it('uses title as name, subtitle as description and names the close button', async () => {
    const open = ref(true)
    mount(() =>
      h(
        NkSheet,
        {
          modelValue: open.value,
          title: 'Rediger rolle',
          subtitle: 'Standardrollene kan ikke endres her.',
          closeLabel: 'Lukk',
          'onUpdate:modelValue': (value: boolean) => (open.value = value),
        },
        () => h('p', 'Innhold'),
      ),
    )
    await settle()

    const dialog = overlay()!
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe('Rediger rolle')
    expect(document.getElementById(dialog.getAttribute('aria-describedby')!)?.textContent).toBe(
      'Standardrollene kan ikke endres her.',
    )

    const close = content()!.querySelector<HTMLButtonElement>('.nk-sheet__close')!
    expect(close.getAttribute('aria-label')).toBe('Lukk')
    close.click()
    await settle()
    expect(open.value).toBe(false)
  })

  it('has no close button unless the owner gives it a name', async () => {
    mount(() => h(NkSheet, { modelValue: true, title: 'Ny avdeling' }, () => h('p', 'Innhold')))
    await settle()
    expect(content()!.querySelector('.nk-sheet__close')).toBeNull()
  })

  it('names a sheet with its own head after the heading in it', async () => {
    mount(() =>
      h(NkSheet, { modelValue: true }, { head: () => h('h2', 'Eget hode'), default: () => h('p', 'Innhold') }),
    )
    await settle()
    expect(document.getElementById(overlay()!.getAttribute('aria-labelledby')!)?.textContent).toBe('Eget hode')
  })

  // Et sheet uten innhold skal ikke ha en tom kropp med luft mellom teksten
  // og knappene (SIGN-1763). Luften tas bort i CSS med `:empty`, som ser bort
  // fra kommentarer og tomme tekstnoder. Testen vokter begge halvdelene:
  // at kroppen faktisk er tom i den forstand, og at regelen finnes.
  const body = () => content()!.querySelector<HTMLElement>('.nk-sheet__body')!
  const isEmptyForCss = (element: HTMLElement) =>
    [...element.childNodes].every(
      (node) => node.nodeType === Node.COMMENT_NODE || (node.nodeType === Node.TEXT_NODE && node.textContent === ''),
    )
  const actions = () => [h(VBtn, { variant: 'text' }, () => 'Avbryt'), h(VBtn, () => 'Forleng')]

  it('leaves nothing in the body when the sheet only has a title, a subtitle and actions', async () => {
    mount(() =>
      h(NkSheet, { modelValue: true, title: 'Forlenge gyldigheten?', subtitle: 'Kunden får 14 nye dager.' }, { actions }),
    )
    await settle()

    expect(isEmptyForCss(body())).toBe(true)
    expect(content()!.querySelector('.nk-sheet__actions')).not.toBeNull()
  })

  it('leaves nothing in the body while its only content is switched off, and fills it when it comes', async () => {
    const error = ref('')
    mount(() =>
      h(
        NkSheet,
        { modelValue: true, title: 'Forlenge gyldigheten?' },
        { default: () => (error.value !== '' ? h('p', error.value) : null), actions },
      ),
    )
    await settle()
    expect(isEmptyForCss(body())).toBe(true)

    error.value = 'Kunne ikke forlenge gyldigheten.'
    await settle()
    expect(isEmptyForCss(body())).toBe(false)
    expect(body().textContent).toBe('Kunne ikke forlenge gyldigheten.')
  })

  it('takes the air out of an empty body and gives the actions the distance to the text instead', () => {
    const source = readFileSync(join(__dirname, '..', 'src', 'components', 'NkSheet.vue'), 'utf8')
    const css = source.slice(source.indexOf('<style'))
    const declarationsFor = (selector: string) => {
      const start = css.indexOf(`${selector} {`)
      expect(start, selector).toBeGreaterThan(-1)
      return css.slice(start, css.indexOf('}', start))
    }

    expect(declarationsFor('.nk-sheet__body:empty')).toMatch(/padding-top:\s*0;/)
    expect(declarationsFor('.nk-sheet__body:empty:not(.nk-sheet__body--last)')).toMatch(/padding-bottom:\s*0;/)
    expect(declarationsFor('.nk-sheet__body:empty + .nk-sheet__actions')).toMatch(/padding-top:/)
  })
})

describe('NkConfirmDialog', () => {
  const button = (name: string) => content()!.querySelector<HTMLButtonElement>(`.nk-confirm__${name}`)!

  function mountConfirm(extra: Record<string, unknown> = {}, defaults: Record<string, Record<string, unknown>> = {}) {
    const state = reactive({ open: true, confirmed: 0, cancelled: 0, ...extra })
    mount(
      () =>
        h(NkConfirmDialog, {
          title: 'Slette avdelingen «Montering»?',
          message: 'De tre ansatte i avdelingen blir stående uten avdeling.',
          confirmLabel: 'Slett avdelingen',
          cancelLabel: 'Avbryt',
          tone: 'danger',
          ...extra,
          modelValue: state.open,
          'onUpdate:modelValue': (value: boolean) => (state.open = value),
          onConfirm: () => (state.confirmed += 1),
          onCancel: () => (state.cancelled += 1),
        } as never),
      defaults,
    )
    return { state, button }
  }

  /**
   * En side med en knapp som åpner bekreftelsen, slik appene gjør det.
   * `focusVisible` er svaret nettleseren ville gitt for knappen: `true` når
   * brukeren kom dit med tastaturet, `false` etter et museklikk, og en feil
   * når nettleseren ikke kjenner `:focus-visible`. `null` er Safari etter et
   * museklikk: knappen får ikke fokus i det hele tatt.
   */
  function mountWithOpener(focusVisible: boolean | 'unsupported' | null) {
    const state = reactive({ open: false })
    mount(() =>
      h('div', [
        h('button', { id: 'opener', onClick: () => (state.open = true) }, 'Fjern logoen'),
        h(NkConfirmDialog, {
          title: 'Fjerne firmaets logo?',
          message: 'Tilbudene vises uten logo til en ny er lastet opp.',
          confirmLabel: 'Fjern logoen',
          cancelLabel: 'Avbryt',
          modelValue: state.open,
          'onUpdate:modelValue': (value: boolean) => (state.open = value),
        } as never),
      ]),
    )
    const opener = document.getElementById('opener') as HTMLButtonElement
    if (focusVisible !== null) {
      opener.focus()
      const matches = opener.matches.bind(opener)
      vi.spyOn(opener, 'matches').mockImplementation((selector: string) => {
        if (selector !== ':focus-visible') return matches(selector)
        if (focusVisible === 'unsupported') throw new DOMException('Unknown pseudo-class', 'SyntaxError')
        return focusVisible
      })
    }
    return { state, opener }
  }

  const quiet = () => button('cancel').classList.contains('nk-confirm__cancel--quiet-focus')

  it('is an alertdialog named by the question and described by the message', async () => {
    mountConfirm()
    await settle()

    const dialog = overlay()!
    expect(dialog.getAttribute('role')).toBe('alertdialog')
    expect(document.getElementById(dialog.getAttribute('aria-labelledby')!)?.textContent).toBe(
      'Slette avdelingen «Montering»?',
    )
    expect(document.getElementById(dialog.getAttribute('aria-describedby')!)?.textContent).toBe(
      'De tre ansatte i avdelingen blir stående uten avdeling.',
    )
  })

  it('says the action on the confirm button and does not close on confirm', async () => {
    const { state, button } = mountConfirm()
    await settle()

    expect(button('confirm').textContent?.trim()).toBe('Slett avdelingen')
    button('confirm').click()
    await settle()
    expect(state.confirmed).toBe(1)
    expect(state.open).toBe(true)
  })

  it('cancels from the button and from Escape', async () => {
    const { state, button } = mountConfirm()
    await settle()
    button('cancel').click()
    await settle()
    expect(state.open).toBe(false)
    expect(state.cancelled).toBe(1)

    state.open = true
    await settle()
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await settle()
    expect(state.open).toBe(false)
    expect(state.cancelled).toBe(2)
  })

  it('cannot be closed while the action is running', async () => {
    const { state, button } = mountConfirm({ loading: true })
    await settle()

    expect(button('cancel').disabled).toBe(true)
    window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }))
    await settle()
    expect(state.open).toBe(true)
    expect(state.cancelled).toBe(0)
  })

  it('shows the error as an alert and stays open', async () => {
    const { state } = mountConfirm({ error: 'Kunne ikke slette avdelingen.' })
    await settle()

    const alert = content()!.querySelector('[role="alert"]')
    expect(alert?.textContent).toContain('Kunne ikke slette avdelingen.')
    expect(state.open).toBe(true)
  })

  // «Avbryt» ser ut som i appens andre dialoger (SIGN-1763): en tekstknapp i
  // appens egen knappefarge, uten ramme og uten en farge komponenten har valgt.
  it('makes Cancel a text button in the colour the app gives its buttons', async () => {
    mountConfirm({ tone: 'default' }, appButtonDefaults)
    await settle()

    const cancel = button('cancel')
    expect(cancel.classList.contains('v-btn--variant-text')).toBe(true)
    expect(cancel.classList.contains('v-btn--variant-outlined')).toBe(false)
    expect(cancel.classList.contains('text-primary')).toBe(true)

    const confirm = button('confirm')
    expect(confirm.classList.contains('v-btn--variant-flat')).toBe(true)
    expect(confirm.classList.contains('bg-primary')).toBe(true)
  })

  it('gives Cancel no colour of its own when the app has no button colour', async () => {
    mountConfirm()
    await settle()

    const cancel = button('cancel')
    expect(cancel.classList.contains('v-btn--variant-text')).toBe(true)
    expect([...cancel.classList].filter((name) => name.startsWith('text-') || name.startsWith('bg-'))).toEqual([])
  })

  // Fokus settes på Avbryt fra kode. Markeringen er for tastaturbrukere
  // (WCAG 2.4.7), og musebrukere skal ikke få den (SIGN-1763): Safari tegner
  // den ellers på alt som får fokus fra kode.
  describe('focus mark on Cancel', () => {
    it('is hidden when the dialog was opened with the mouse, and Cancel still has focus', async () => {
      const { opener } = mountWithOpener(false)
      opener.click()
      await opened()

      expect(document.activeElement).toBe(button('cancel'))
      expect(quiet()).toBe(true)
    })

    it('is hidden when nothing had focus as the dialog opened (Safari does not focus a clicked button)', async () => {
      const { opener } = mountWithOpener(null)
      expect(document.activeElement).toBe(document.body)
      opener.click()
      await opened()

      expect(document.activeElement).toBe(button('cancel'))
      expect(quiet()).toBe(true)
    })

    it('is shown when the dialog was opened from the keyboard', async () => {
      const { opener } = mountWithOpener(true)
      opener.click()
      await opened()

      expect(document.activeElement).toBe(button('cancel'))
      expect(quiet()).toBe(false)
    })

    it('is shown when the browser cannot tell how focus got there', async () => {
      const { opener } = mountWithOpener('unsupported')
      opener.click()
      await opened()

      expect(quiet()).toBe(false)
    })

    it('comes back when a mouse user moves focus away and returns', async () => {
      const { opener } = mountWithOpener(false)
      opener.click()
      await opened()
      expect(quiet()).toBe(true)

      button('confirm').focus()
      await settle()
      expect(quiet()).toBe(false)

      button('cancel').focus()
      await settle()
      expect(quiet()).toBe(false)
    })

    it('comes back when a mouse user presses a key on Cancel', async () => {
      const { opener } = mountWithOpener(false)
      opener.click()
      await opened()
      expect(quiet()).toBe(true)

      button('cancel').dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true }))
      await settle()
      expect(quiet()).toBe(false)
    })

    it('is decided again each time the dialog opens', async () => {
      const { state, opener } = mountWithOpener(true)
      opener.click()
      await opened()
      expect(quiet()).toBe(false)

      state.open = false
      await settle()
      vi.mocked(opener.matches).mockImplementation(() => false)
      opener.click()
      await opened()
      expect(quiet()).toBe(true)
    })

    it('hides only the keyboard mark, and only while the class is on', () => {
      const source = readFileSync(join(__dirname, '..', 'src', 'components', 'NkConfirmDialog.vue'), 'utf8')
      const css = source.slice(source.indexOf('<style')).replace(/\/\*[\s\S]*?\*\//g, '')

      expect(css).toContain('.nk-confirm__cancel--quiet-focus:focus-visible::after')
      expect(css).toContain('.nk-confirm__cancel--quiet-focus:focus-visible:not(:hover) > :deep(.v-btn__overlay)')
      // Aldri en regel som tar markeringen fra alle: hver regel om fokus
      // gjelder bare knappen med klassen, og ingen fjerner outline.
      for (const selector of css.match(/[^{}]*:focus[^{}]*(?=\{)/g) ?? []) {
        for (const part of selector.split(',')) expect(part).toContain('.nk-confirm__cancel--quiet-focus')
      }
      expect(css).not.toMatch(/outline:\s*(none|0)\b/)
    })
  })
})
