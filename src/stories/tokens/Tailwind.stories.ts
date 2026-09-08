import { computed, defineComponent, h } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import {
  nkProductThemes,
  signTheme,
  tailwindStaticVariables,
  tailwindThemeCss,
  tailwindThemeVariables,
} from '../../tokens'
import type { NkScheme } from '../../tokens'

// Oppslagsside for Tailwind v4-flatene (nettsiden): `@theme`-variablene
// tailwindThemeCss genererer fra samme NkScheme som --nk-*-variablene, med
// verdiene for produktet/modusen valgt i toolbaren — og den ferdige CSS-en
// nettsiden importerer (SIGN-519).

const isColor = (value: string) => value.startsWith('#') || value.startsWith('rgba(')

function rows(vars: Record<string, string>) {
  return Object.entries(vars).map(([name, value]) =>
    h('div', { key: name, style: 'display:flex;align-items:center;gap:12px;' }, [
      h('code', { style: 'width:260px;font-size:0.75rem;' }, name),
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
    const theme = computed(() => nkProductThemes[props.produkt] ?? signTheme)
    const scheme = computed<NkScheme>(() =>
      props.modus === 'dark' ? theme.value.dark : theme.value.light,
    )
    return () =>
      h('div', { style: 'display:flex;flex-direction:column;gap:28px;' }, [
        h('section', [
          h('h3', { style: 'margin:0 0 10px;font-size:0.95rem;' }, 'Statisk (modus-uavhengig)'),
          h('div', { style: 'display:flex;flex-direction:column;gap:6px;' }, rows(tailwindStaticVariables())),
        ]),
        h('section', [
          h('h3', { style: 'margin:0 0 10px;font-size:0.95rem;' }, '@theme-farger (per produkt/modus)'),
          h('div', { style: 'display:flex;flex-direction:column;gap:6px;' }, rows(tailwindThemeVariables(scheme.value))),
        ]),
        h('section', [
          h('h3', { style: 'margin:0 0 10px;font-size:0.95rem;' }, 'Generert CSS (tailwindThemeCss)'),
          h(
            'pre',
            {
              style:
                'margin:0;padding:12px;font-size:0.72rem;line-height:1.5;border:1px solid var(--nk-surface-border);border-radius:8px;background:var(--nk-surface-soft);overflow:auto;max-height:420px;',
            },
            tailwindThemeCss(theme.value),
          ),
        ]),
      ])
  },
})

const meta: Meta = {
  title: 'Design system/Tokens/Tailwind-@theme',
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
