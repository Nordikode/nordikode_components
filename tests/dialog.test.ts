// @vitest-environment happy-dom
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

function mount(root: Component) {
  host = document.createElement('div')
  document.body.appendChild(host)
  app = createApp(root)
  app.use(createVuetify({ components: { VAlert, VBtn, VCard, VCardText, VCardTitle, VDialog } }))
  app.mount(host)
}

const settle = async () => {
  for (let i = 0; i < 4; i += 1) await nextTick()
  await new Promise((resolve) => setTimeout(resolve, 0))
  await nextTick()
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
})

describe('NkConfirmDialog', () => {
  function mountConfirm(extra: Record<string, unknown> = {}) {
    const state = reactive({ open: true, confirmed: 0, cancelled: 0, ...extra })
    mount(() =>
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
    )
    const button = (name: string) => content()!.querySelector<HTMLButtonElement>(`.nk-confirm__${name}`)!
    return { state, button }
  }

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
})
