import { h } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { nkFontFamily, nkFontMono, nkRadius, nkSpaceUnit, nkSpacing, nkTypography } from '../../tokens'

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

const SPACING_LABELS: Record<keyof typeof nkSpacing, string> = {
  cardPadding: 'Innvendig polstring i kort/paneler',
  sectionGap: 'Vertikal avstand mellom kort/seksjoner',
  inlineGap: 'Avstand mellom elementer på rad',
  fabReserve: 'Plass reservert nederst til høyre til en flytende handling (figur 64px + margin 24px)',
}

export const Spacing: Story = {
  render: () =>
    h('div', { style: 'display:flex;flex-direction:column;gap:28px;' }, [
      h('section', [
        h('h3', { style: 'margin:0 0 10px;font-size:0.95rem;' }, 'Semantiske tokens (nkSpacing)'),
        h('div', { style: 'display:flex;flex-direction:column;gap:10px;' },
          (Object.keys(nkSpacing) as Array<keyof typeof nkSpacing>).map((name) =>
            h('div', { key: name, style: 'display:flex;align-items:center;gap:12px;' }, [
              h('code', { style: 'width:180px;font-size:0.75rem;' }, `${name} · ${nkSpacing[name]}`),
              h('div', {
                style: `height:16px;width:${nkSpacing[name]};background:var(--nk-action-primary);border-radius:3px;`,
              }),
              h('div', { style: 'font-size:0.78rem;opacity:0.7;' }, SPACING_LABELS[name]),
            ]),
          ),
        ),
      ]),
      h('section', [
        h('h3', { style: 'margin:0 0 10px;font-size:0.95rem;' }, `Basisskala (${nkSpaceUnit}-enhet)`),
        h('div', { style: 'display:flex;flex-direction:column;gap:10px;' },
          [1, 2, 3, 4, 6, 8].map((n) =>
            h('div', { key: n, style: 'display:flex;align-items:center;gap:12px;' }, [
              h('code', { style: 'width:180px;font-size:0.75rem;' }, `${n} × ${nkSpaceUnit}`),
              h('div', {
                style: `height:16px;width:calc(${n} * ${nkSpaceUnit});background:var(--nk-action-primary);border-radius:3px;`,
              }),
            ]),
          ),
        ),
      ]),
    ]),
}

export const Typografi: Story = {
  render: () =>
    h('div', { style: `font-family:${nkFontFamily};display:flex;flex-direction:column;gap:12px;` }, [
      h('div', { style: 'font-size:0.75rem;opacity:0.7;' },
        `Fontstack: ${nkFontFamily} — Inter lastes i appens index.html. rootSize ${nkTypography.rootSize} er den globale bryteren (html font-size); rollene under er i rem og skalerer med den.`),
      h('div', { style: `font-size:${nkTypography.heading};font-weight:750;letter-spacing:-0.02em;` },
        `Overskrift 750 · heading ${nkTypography.heading}`),
      h('div', { style: `font-size:${nkTypography.body};font-weight:400;max-width:60ch;` },
        `Brødtekst 400 · body ${nkTypography.body} — Sign sender tilbudet til kunden når alle linjene er klare, og varsler deg så snart det er signert.`),
      h('div', { style: `font-size:${nkTypography.label};font-weight:600;text-transform:uppercase;letter-spacing:0.08em;opacity:0.7;` },
        `Etikett 600 · label ${nkTypography.label}`),
      h('div', { style: `font-size:${nkTypography.button};font-weight:600;` },
        `Knappetekst 600 · button ${nkTypography.button}`),
    ]),
}

const MONO_EKSEMPLER: Array<[string, string]> = [
  ['IP-adresse', '203.0.113.42'],
  ['ID', '0198c7e2-4b1a-7c3d-9f20-5a6b8e1d2c34'],
  ['Gjenopprettingskode', 'K7QX-2M9P-0OIL'],
  ['Varenummer', '48210567'],
]

export const Monospace: Story = {
  render: () =>
    h('div', { style: `font-family:${nkFontFamily};display:flex;flex-direction:column;gap:12px;` }, [
      h('div', { style: 'font-size:0.75rem;opacity:0.7;max-width:70ch;' },
        `--nk-font-mono: ${nkFontMono} — for tekst som leses tegn for tegn (ID-er, IP-adresser, koder, nøkler, JSON). Systemets egne fonter, ingen nedlasting. Tokenet er bare fontfamilien; størrelse, vekt og farge arves fra konteksten. Bruk alltid var(--nk-font-mono), aldri en håndskrevet fontliste og aldri en reserveverdi.`),
      ...MONO_EKSEMPLER.map(([etikett, verdi]) =>
        h('div', { key: etikett, style: 'display:flex;align-items:baseline;gap:12px;' }, [
          h('div', { style: `width:180px;font-size:${nkTypography.label};font-weight:600;opacity:0.7;` }, etikett),
          h('div', { style: `font-family:${nkFontMono};font-size:${nkTypography.body};` }, verdi),
        ]),
      ),
      h('div', { style: 'display:flex;align-items:baseline;gap:12px;' }, [
        h('div', { style: `width:180px;font-size:${nkTypography.label};font-weight:600;opacity:0.7;` }, 'Tegn som ligner'),
        h('div', { style: `font-family:${nkFontMono};font-size:${nkTypography.body};` }, '0O 1lI 5S 8B'),
      ]),
    ]),
}
