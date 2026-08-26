import { computed, defineComponent, h } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { nkProductThemes, signTheme } from '../../tokens'
import type { NkScheme } from '../../tokens'

// Fargene leses live fra token-pakka for produktet/modusen valgt i toolbaren.

const GROUPS: Array<{ title: string; keys: Array<keyof NkScheme> }> = [
  { title: 'Flater', keys: ['page', 'surface', 'surfaceSoft', 'surfaceSoftAccent', 'surfaceRail', 'railStart', 'railEnd', 'surfaceInverse', 'onSurfaceInverse', 'onSurfaceInverseMuted', 'onSurfaceInverseAccent'] },
  { title: 'Tekst', keys: ['textPrimary', 'textSecondary'] },
  { title: 'Handling og merkevare', keys: ['primary', 'primaryHover', 'onPrimary', 'secondary', 'onSecondary', 'info', 'onInfo', 'attention', 'onAttention'] },
  { title: 'Status', keys: ['success', 'onSuccess', 'warning', 'onWarning', 'error', 'onError'] },
  { title: 'Myke flater (soft)', keys: ['primarySoft', 'onPrimarySoft', 'infoSoft', 'onInfoSoft', 'successSoft', 'onSuccessSoft', 'warningSoft', 'onWarningSoft', 'errorSoft', 'onErrorSoft'] },
  { title: 'Kanter og glass', keys: ['surfaceBorder', 'surfaceGlass', 'surfaceSubtle'] },
  { title: 'Skygger', keys: ['shadowSoft', 'shadowStrong'] },
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
                // Skyggetokens er rgba-farger som brukes i box-shadow — vis dem som faktisk skygge på en flate.
                const isShadow = key.startsWith('shadow')
                const swatchStyle = isShadow
                  ? `height:64px;border-radius:8px;background:${scheme.value.surface};box-shadow:0 8px 24px ${value};`
                  : `height:64px;border-radius:8px;background:${baseValue ?? value};border:1px solid var(--nk-surface-border);display:flex;align-items:center;justify-content:center;`
                return h('div', { key, style: 'width:150px;' }, [
                  h('div', { style: swatchStyle },
                    baseValue ? h('span', { style: `color:${value};font-size:0.9rem;font-weight:600;` }, 'Aa') : undefined),
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

// Vuetify theme.variables — tall/farge som styrer kanter og dempet tekst, ikke swatch-farger.
const VuetifyVariabler = defineComponent({
  props: { produkt: { type: String, default: 'sign' }, modus: { type: String, default: 'light' } },
  setup(props) {
    const scheme = computed<NkScheme>(() => {
      const theme = nkProductThemes[props.produkt] ?? signTheme
      return props.modus === 'dark' ? theme.dark : theme.light
    })
    const ROWS: Array<{ key: 'borderColor' | 'borderOpacity' | 'mediumEmphasisOpacity'; label: string }> = [
      { key: 'borderColor', label: 'Kantfarge (kombineres med borderOpacity)' },
      { key: 'borderOpacity', label: 'Kant-opasitet (nkOpacity.border*)' },
      { key: 'mediumEmphasisOpacity', label: 'Dempet tekst, f.eks. text-medium-emphasis (nkOpacity.mediumEmphasis*)' },
    ]
    return () =>
      h('div', { style: 'display:flex;flex-direction:column;gap:10px;' },
        ROWS.map(({ key, label }) =>
          h('div', { key, style: 'display:flex;align-items:center;gap:12px;' }, [
            h('code', { style: 'width:200px;font-size:0.75rem;' }, key),
            key === 'borderColor'
              ? h('div', {
                  style: `width:40px;height:20px;border-radius:4px;background:${scheme.value.borderColor};border:1px solid var(--nk-surface-border);`,
                })
              : h('code', { style: 'width:40px;font-size:0.75rem;' }, String(scheme.value[key])),
            h('code', { style: 'font-size:0.72rem;opacity:0.75;width:80px;' },
              key === 'borderColor' ? scheme.value.borderColor : ''),
            h('div', { style: 'font-size:0.78rem;opacity:0.7;' }, label),
          ]),
        ),
      )
  },
})

export const Variabler: Story = {
  render: (_args, context) =>
    h(VuetifyVariabler, {
      produkt: String(context.globals.produkt ?? 'sign'),
      modus: String(context.globals.modus ?? 'light'),
    }),
}
