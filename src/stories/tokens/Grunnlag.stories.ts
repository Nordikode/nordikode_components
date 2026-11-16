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
      h('div', { style: `font-size:${nkTypography.bodyCompact};font-weight:400;max-width:60ch;` },
        `Kompakt brødtekst 400 · bodyCompact ${nkTypography.bodyCompact} — for smale sidemenyer og paneler på PC. Regelen står under «Kompakt brødtekst».`),
      h('div', { style: `font-size:${nkTypography.label};font-weight:600;text-transform:uppercase;letter-spacing:0.08em;opacity:0.7;` },
        `Etikett 600 · label ${nkTypography.label}`),
      h('div', { style: `font-size:${nkTypography.button};font-weight:600;` },
        `Knappetekst 600 · button ${nkTypography.button}`),
    ]),
}

// Kompakt brødtekst (SIGN-1942). Panelet under er 360 px bredt, som
// venstremenyen i «Se tilbud» i Sign, der størrelsen ble prøvd og vedtatt.
const KOMPAKT_REGLER = [
  'Brukes for tekst, felt, avkrysningsbokser og titler (halvfet) i smale sidemenyer og paneler på PC.',
  'Sidene ellers bruker fortsatt brødtekst på 16 px (--nk-text-body).',
  'På berøringsskjerm brukes 16 px i felt. Mindre tekst får nettleseren på telefonen til å zoome inn.',
  'Grå hjelpetekst i samme panel bruker --nk-text-label.',
]

const KOMPAKT_VALG: Array<[string, boolean]> = [
  ['Priser per linje', true],
  ['Produktbilder', true],
  ['Fagbeskrivelser', false],
]

const KOMPAKT_CSS = `.panel {
  font-size: var(--nk-text-body); /* berøringsskjerm: 16 px */
}

@media (hover: hover) and (pointer: fine) {
  .panel {
    font-size: var(--nk-text-body-compact); /* PC: 14 px */
  }
}

.panel__title {
  font-weight: 600;
}

.panel__hint {
  font-size: var(--nk-text-label);
  color: var(--nk-text-secondary);
}`

function eksempelPanel(overskrift: string, storrelse: string) {
  return h('div', { style: 'display:flex;flex-direction:column;gap:8px;' }, [
    h('div', { style: `font-size:${nkTypography.label};font-weight:600;opacity:0.7;` }, overskrift),
    h('div', {
      style: `width:360px;max-width:100%;box-sizing:border-box;padding:calc(2 * var(--nk-space-unit));display:flex;flex-direction:column;gap:calc(1.5 * var(--nk-space-unit));background:var(--nk-surface);border:1px solid var(--nk-surface-border);border-radius:var(--nk-radius-lg);color:var(--nk-text-primary);font-size:${storrelse};`,
    }, [
      h('div', { style: 'font-weight:600;color:var(--nk-text-title);' }, 'Velg hva kunden ser'),
      h('div', 'Tilbudet sendes til Ola Hansen på e-post.'),
      h('input', {
        type: 'text',
        value: 'Hei! Her er tilbudet på nytt bad.',
        'aria-label': 'Tilbudstekst',
        style: 'font:inherit;color:inherit;width:100%;box-sizing:border-box;padding:var(--nk-space-unit) calc(1.5 * var(--nk-space-unit));background:var(--nk-surface);border:1px solid var(--nk-surface-border);border-radius:var(--nk-radius-sm);',
      }),
      h('div', { style: 'font-size:var(--nk-text-label);color:var(--nk-text-secondary);' },
        'Teksten står øverst i tilbudet, under overskriften.'),
      ...KOMPAKT_VALG.map(([valg, avkrysset]) =>
        h('label', { key: valg, style: 'display:flex;align-items:center;gap:var(--nk-gap-inline);' }, [
          h('input', { type: 'checkbox', checked: avkrysset, style: 'accent-color:var(--nk-action-primary);margin:0;' }),
          valg,
        ]),
      ),
    ]),
  ])
}

export const KompaktBrodtekst: Story = {
  name: 'Kompakt brødtekst',
  render: () =>
    h('div', { style: `font-family:${nkFontFamily};display:flex;flex-direction:column;gap:24px;max-width:820px;` }, [
      h('div', { style: 'font-size:0.75rem;opacity:0.7;max-width:70ch;' },
        `--nk-text-body-compact: ${nkTypography.bodyCompact} (14 px) — brødteksten i smale sidemenyer og paneler på PC. Brødteksten på 16 px blir for stor der.`),
      h('ul', { style: `margin:0;padding-left:20px;display:flex;flex-direction:column;gap:6px;font-size:${nkTypography.body};max-width:70ch;` },
        KOMPAKT_REGLER.map((regel) => h('li', { key: regel }, regel)),
      ),
      h('div', { style: 'display:flex;gap:24px;flex-wrap:wrap;align-items:flex-start;' }, [
        eksempelPanel(`Kompakt brødtekst · ${nkTypography.bodyCompact} (14 px)`, 'var(--nk-text-body-compact)'),
        eksempelPanel(`Brødtekst · ${nkTypography.body} (16 px) — for stor i et smalt panel`, 'var(--nk-text-body)'),
      ]),
      h('div', { style: 'display:flex;flex-direction:column;gap:8px;' }, [
        h('div', { style: `font-size:${nkTypography.label};font-weight:600;opacity:0.7;` },
          'Slik brukes rollen: 16 px som utgangspunkt, kompakt bare med mus eller pekeplate'),
        h('pre', {
          style: `margin:0;padding:calc(2 * var(--nk-space-unit));overflow:auto;background:var(--nk-surface-soft);border-radius:var(--nk-radius-md);font-family:${nkFontMono};font-size:0.8rem;`,
        }, KOMPAKT_CSS),
      ]),
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
