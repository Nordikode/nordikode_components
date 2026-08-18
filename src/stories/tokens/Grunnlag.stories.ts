import { h } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { nkFontFamily, nkRadius, nkSpaceUnit } from '../../tokens'

const meta: Meta = {
  title: 'Design system/Tokens/Grunnlag',
  parameters: { controls: { disable: true } },
}

export default meta
type Story = StoryObj

export const Radius: Story = {
  render: () =>
    h('div', { style: 'display:flex;gap:16px;align-items:flex-end;flex-wrap:wrap;' },
      Object.entries(nkRadius).map(([name, value]) =>
        h('div', { key: name, style: 'text-align:center;' }, [
          h('div', {
            style: `width:96px;height:64px;border-radius:${value};background:var(--nk-surface);border:1.5px solid var(--nk-action-primary);`,
          }),
          h('div', { style: 'font-size:0.78rem;margin-top:6px;' }, `${name} · ${value}`),
        ]),
      ),
    ),
}

export const Spacing: Story = {
  render: () =>
    h('div', { style: 'display:flex;flex-direction:column;gap:10px;' },
      [1, 2, 3, 4, 6, 8].map((n) =>
        h('div', { key: n, style: 'display:flex;align-items:center;gap:12px;' }, [
          h('code', { style: 'width:120px;font-size:0.75rem;' }, `${n} × ${nkSpaceUnit}`),
          h('div', {
            style: `height:16px;width:calc(${n} * ${nkSpaceUnit});background:var(--nk-action-primary);border-radius:3px;`,
          }),
        ]),
      ),
    ),
}

export const Typografi: Story = {
  render: () =>
    h('div', { style: `font-family:${nkFontFamily};display:flex;flex-direction:column;gap:12px;` }, [
      h('div', { style: 'font-size:0.75rem;opacity:0.7;' }, `Fontstack: ${nkFontFamily} — Inter lastes i appens index.html`),
      h('div', { style: 'font-size:2rem;font-weight:750;letter-spacing:-0.02em;' }, 'Overskrift 750'),
      h('div', { style: 'font-size:1.25rem;font-weight:650;' }, 'Mellomtittel 650'),
      h('div', { style: 'font-size:1rem;font-weight:400;max-width:60ch;' },
        'Brødtekst 400 — Sign sender tilbudet til kunden når alle linjene er klare, og varsler deg så snart det er signert.'),
      h('div', { style: 'font-size:0.78rem;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;opacity:0.7;' },
        'Etikett 600'),
    ]),
}
