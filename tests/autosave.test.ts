// @vitest-environment happy-dom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, nextTick, ref, type App } from 'vue'

import NkAutosaveStatus from '../src/web/NkAutosaveStatus.vue'
import { createDraftAutosave, useSettingsAutosave, type SettingsAutosave } from '../src/web/autosave'

// Autolagringen er delt mellom Sign-innstillingene og firmaappen (SIGN-1382):
// samme pause, samme «aldri to skriv om gangen», samme nye forsøk ved feil
// og samme regel om at eget skriv ikke overskriver det brukeren skrev videre.

const DELAY = 100

const settle = async (): Promise<void> => {
  await vi.advanceTimersByTimeAsync(0)
  await nextTick()
}

describe('createDraftAutosave', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('skriver én gang etter pausen og går pending → saving → saved', async () => {
    const save = vi.fn<() => Promise<void>>().mockResolvedValue()
    const autosave = createDraftAutosave(save, DELAY)

    autosave.schedule()
    autosave.schedule()
    expect(autosave.status.value).toBe('pending')

    await vi.advanceTimersByTimeAsync(DELAY)
    expect(save).toHaveBeenCalledTimes(1)
    expect(autosave.status.value).toBe('saved')
    expect(autosave.savedAt.value).not.toBeNull()
  })

  it('skriver én gang til etterpå når det kom endringer mens et skriv pågikk', async () => {
    let release: () => void = () => undefined
    const save = vi.fn<() => Promise<void>>().mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
    ).mockResolvedValue()
    const autosave = createDraftAutosave(save, DELAY)

    autosave.schedule()
    await vi.advanceTimersByTimeAsync(DELAY)
    expect(autosave.status.value).toBe('saving')

    autosave.schedule()
    release()
    await settle()
    await vi.advanceTimersByTimeAsync(DELAY)

    expect(save).toHaveBeenCalledTimes(2)
    expect(autosave.status.value).toBe('saved')
  })

  it('prøver igjen etter en stund når skrivet feiler', async () => {
    const save = vi.fn<() => Promise<void>>().mockRejectedValueOnce(new Error('nede')).mockResolvedValue()
    const autosave = createDraftAutosave(save, DELAY)

    autosave.schedule()
    await vi.advanceTimersByTimeAsync(DELAY)
    expect(autosave.status.value).toBe('error')

    await vi.advanceTimersByTimeAsync(10_000)
    expect(save).toHaveBeenCalledTimes(2)
    expect(autosave.status.value).toBe('saved')
  })
})

describe('useSettingsAutosave', () => {
  const signature = ref('')
  const baseline = ref('')
  const save = vi.fn<() => Promise<void>>()
  let autosave: SettingsAutosave | null = null
  let app: App | null = null

  beforeEach(() => {
    vi.useFakeTimers()
    signature.value = 'lagret'
    baseline.value = 'lagret'
    save.mockReset()
    save.mockResolvedValue()

    const Page = defineComponent({
      setup() {
        autosave = useSettingsAutosave({
          signature,
          baseline,
          save,
          delayMs: DELAY,
          describeError: (error) => (error instanceof Error && error.message !== '' ? error.message : 'Kunne ikke lagre.'),
        })
        return () => h('div', autosave?.status.value)
      },
    })
    const host = document.createElement('div')
    document.body.appendChild(host)
    app = createApp(Page)
    app.mount(host)
  })

  afterEach(() => {
    app?.unmount()
    app = null
    vi.useRealTimers()
  })

  it('skriver etter pausen når skjemaet er endret, og ikke når det er tilbake på lagret tilstand', async () => {
    signature.value = 'endret'
    await settle()
    expect(autosave?.status.value).toBe('pending')
    expect(autosave?.isDirty()).toBe(true)

    signature.value = 'lagret'
    await settle()
    expect(autosave?.status.value).toBe('idle')

    signature.value = 'endret igjen'
    await settle()
    await vi.advanceTimersByTimeAsync(DELAY)
    expect(save).toHaveBeenCalledTimes(1)
    expect(autosave?.status.value).toBe('saved')
  })

  it('absorbOwnUpdate flytter baseline til det som ble sendt mens skrivet pågår, og er usann ellers', async () => {
    let release: () => void = () => undefined
    save.mockImplementationOnce(
      () =>
        new Promise<void>((resolve) => {
          release = resolve
        }),
    )

    expect(autosave?.absorbOwnUpdate()).toBe(false)

    signature.value = 'endret'
    await settle()
    await vi.advanceTimersByTimeAsync(DELAY)

    signature.value = 'endret videre'
    expect(autosave?.absorbOwnUpdate()).toBe(true)
    expect(baseline.value).toBe('endret')
    expect(autosave?.isDirty()).toBe(true)

    release()
    await settle()
    expect(autosave?.absorbOwnUpdate()).toBe(false)
  })

  it('viser beskrivelsen av feilen når skrivet feiler', async () => {
    save.mockRejectedValueOnce(new Error('Navnet er alt i bruk.'))

    signature.value = 'endret'
    await settle()
    await vi.advanceTimersByTimeAsync(DELAY)

    expect(autosave?.status.value).toBe('error')
    expect(autosave?.errorMessage.value).toBe('Navnet er alt i bruk.')
  })
})

describe('NkAutosaveStatus', () => {
  const labels = { saving: 'Lagrer …', saved: 'Lagret', error: 'Kunne ikke lagre.' }

  const render = (props: { status: string; errorMessage?: string }): HTMLElement => {
    const host = document.createElement('div')
    document.body.appendChild(host)
    createApp({ render: () => h(NkAutosaveStatus, { ...props, labels } as never) }).mount(host)

    return host
  }

  it('sier hvor lagringen er, som en statuslinje for skjermlesere', () => {
    expect(render({ status: 'saving' }).textContent?.trim()).toBe('Lagrer …')
    expect(render({ status: 'saved' }).querySelector('[role="status"][aria-live="polite"] svg')).not.toBeNull()
    expect(render({ status: 'error', errorMessage: 'Serverens melding' }).textContent?.trim()).toBe('Serverens melding')
    expect(render({ status: 'error' }).textContent?.trim()).toBe('Kunne ikke lagre.')
    expect(render({ status: 'idle' }).textContent?.trim()).toBe('')
  })
})
