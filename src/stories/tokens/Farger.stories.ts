import { computed, defineComponent, h } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { nkProductThemes, signTheme } from '../../tokens'
import type { NkScheme } from '../../tokens'

// Fargene leses live fra token-pakka for produktet/modusen valgt i toolbaren.

const GROUPS: Array<{ title: string; keys: Array<keyof NkScheme> }> = [
  { title: 'Flater', keys: ['page', 'surface', 'surfaceSoft', 'surfaceSoftAccent', 'surfaceRail', 'railStart', 'railEnd'] },
  { title: 'Tekst', keys: ['textPrimary', 'textSecondary'] },
  { title: 'Handling og merkevare', keys: ['primary', 'primaryHover', 'onPrimary', 'secondary', 'onSecondary', 'info', 'onInfo', 'attention', 'onAttention'] },
  { title: 'Status', keys: ['success', 'onSuccess', 'warning', 'onWarning', 'error', 'onError'] },
  { title: 'Myke flater (soft)', keys: ['primarySoft', 'onPrimarySoft', 'successSoft', 'onSuccessSoft', 'warningSoft', 'onWarningSoft', 'errorSoft', 'onErrorSoft'] },
  { title: 'Rail-ikoner', keys: ['railIcon', 'railIconStrong'] },
]

// on-farger vises oppå sin basisfarge (onSuccess → success) så paret kan leses direkte.
function baseKeyFor(key: keyof NkScheme): keyof NkScheme | null {
  if (!/^on[A-Z]/.test(key)) return null
  const base = key.slice(2)
  return (base.charAt(0).toLowerCase() + base.slice(1)) as keyof NkScheme
}

const Swatches = defineComponent({
  props: { produkt: { type: String, default: 'sign' }, modus: { type: String, default: 'light' } },
  setup(props) {
    const scheme = computed<NkScheme>(() => {
      const theme = nkProductThemes[props.produkt] ?? signTheme
      return props.modus === 'dark' ? theme.dark : theme.light
    })
    return () =>
      h('div', { style: 'display:flex;flex-direction:column;gap:28px;' },
        GROUPS.map((group) =>
          h('section', [
            h('h3', { style: 'margin:0 0 10px;font-size:0.95rem;' }, group.title),
            h('div', { style: 'display:flex;flex-wrap:wrap;gap:12px;' },
              group.keys.map((key) => {
                const value = scheme.value[key] as string
                const baseKey = baseKeyFor(key)
                const baseValue = baseKey ? (scheme.value[baseKey] as string | undefined) : undefined
                return h('div', { key, style: 'width:150px;' }, [
                  h('div', {
                    style: `height:64px;border-radius:8px;background:${baseValue ?? value};border:1px solid var(--nk-surface-border);display:flex;align-items:center;justify-content:center;`,
                  }, baseValue ? h('span', { style: `color:${value};font-size:0.9rem;font-weight:600;` }, 'Aa') : undefined),
                  h('div', { style: 'font-size:0.78rem;font-weight:600;margin-top:6px;' }, key),
                  h('code', { style: 'font-size:0.72rem;opacity:0.75;' }, value),
                ])
              }),
            ),
          ]),
        ),
      )
  },
})

const meta: Meta = {
  title: 'Design system/Tokens/Farger',
  component: Swatches,
  parameters: { controls: { disable: true } },
}

export default meta
type Story = StoryObj

export const Palett: Story = {
  render: (_args, context) =>
    h(Swatches, {
      produkt: String(context.globals.produkt ?? 'sign'),
      modus: String(context.globals.modus ?? 'light'),
    }),
}
