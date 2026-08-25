import { computed, defineComponent, h } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { cssStaticVariables, cssVariables, nkProductThemes, signTheme } from '../../tokens'
import type { NkScheme } from '../../tokens'

// Oppslagsside: alle --nk-*-variablene productCss genererer, med verdiene for
// produktet/modusen valgt i toolbaren. Statiske variabler er modus-uavhengige.

const isColor = (value: string) => value.startsWith('#') || value.startsWith('rgba(')

function rows(vars: Record<string, string>) {
  return Object.entries(vars).map(([name, value]) =>
    h('div', { key: name, style: 'display:flex;align-items:center;gap:12px;' }, [
      h('code', { style: 'width:240px;font-size:0.75rem;' }, name),
      h('div', {
        style: `width:40px;height:20px;border-radius:4px;border:1px solid var(--nk-surface-border);background:${isColor(value) ? value : 'transparent'};${isColor(value) ? '' : 'visibility:hidden;'}`,
      }),
      h('code', { style: 'font-size:0.72rem;opacity:0.75;' }, value),
    ]),
  )
}

const Oversikt = defineComponent({
  props: { produkt: { type: String, default: 'sign' }, modus: { type: String, default: 'light' } },
  setup(props) {
    const scheme = computed<NkScheme>(() => {
      const theme = nkProductThemes[props.produkt] ?? signTheme
      return props.modus === 'dark' ? theme.dark : theme.light
    })
    return () =>
      h('div', { style: 'display:flex;flex-direction:column;gap:28px;' }, [
        h('section', [
          h('h3', { style: 'margin:0 0 10px;font-size:0.95rem;' }, 'Statisk (modus-uavhengig)'),
          h('div', { style: 'display:flex;flex-direction:column;gap:6px;' }, rows(cssStaticVariables())),
        ]),
        h('section', [
          h('h3', { style: 'margin:0 0 10px;font-size:0.95rem;' }, 'Scheme (per produkt/modus)'),
          h('div', { style: 'display:flex;flex-direction:column;gap:6px;' }, rows(cssVariables(scheme.value))),
        ]),
      ])
  },
})

const meta: Meta = {
  title: 'Design system/Tokens/CSS-variabler',
  component: Oversikt,
  parameters: { controls: { disable: true } },
}

export default meta
type Story = StoryObj

export const Oppslag: Story = {
  render: (_args, context) =>
    h(Oversikt, {
      produkt: String(context.globals.produkt ?? 'sign'),
      modus: String(context.globals.modus ?? 'light'),
    }),
}
