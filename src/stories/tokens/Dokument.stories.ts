import { h } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { documentCssVariables, documentScheme } from '../../tokens'
import type { NkDocumentScheme } from '../../tokens'

// Dokument-tokenene (`--nk-doc-*`, SIGN-610) er «papir»: kundevendte
// dokumenter (tilbudet i Sign) er lyse i begge fargemoduser og skal se likt
// ut i web, print og PDF. Bytt Modus i toolbaren — prøvene endrer seg ikke.

const GROUPS: Array<{ title: string; keys: Array<keyof NkDocumentScheme> }> = [
  { title: 'Arket', keys: ['paper', 'paperSoft', 'border', 'borderSoft'] },
  { title: 'Blekk', keys: ['ink', 'inkSoft', 'inkMuted', 'title'] },
  { title: 'Bånd (forsidehode, totalsum)', keys: ['band', 'onBand', 'onBandMuted'] },
  { title: 'Handling (berry)', keys: ['accent', 'onAccent', 'accentSoft', 'onAccentSoft', 'accentBorder'] },
  { title: 'Venter og forbehold (gold)', keys: ['attention', 'onAttention', 'attentionSoft', 'onAttentionSoft', 'attentionBorder'] },
  { title: 'Fullført (oliv/lime)', keys: ['success', 'onSuccess', 'successSoft', 'onSuccessSoft'] },
  { title: 'Skygge', keys: ['shadow'] },
]

// Blekk-tokens vises som tekst på arket; on-farger oppå sin basisfarge.
const INK_KEYS = new Set<keyof NkDocumentScheme>(['ink', 'inkSoft', 'inkMuted', 'title'])

function baseKeyFor(key: keyof NkDocumentScheme): keyof NkDocumentScheme | null {
  if (INK_KEYS.has(key)) return 'paper'
  if (!/^on[A-Z]/.test(key)) return null
  const base = key.slice(2)
  return (base.charAt(0).toLowerCase() + base.slice(1)) as keyof NkDocumentScheme
}

const cssName = (key: keyof NkDocumentScheme): string =>
  `--nk-doc-${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`

const meta: Meta = {
  title: 'Design system/Tokens/Dokument-tokens',
  parameters: { controls: { disable: true } },
}

export default meta
type Story = StoryObj

export const Fargeprover: Story = {
  name: 'Fargeprøver',
  render: () =>
    h('div', { style: 'display:flex;flex-direction:column;gap:28px;' }, [
      h('p', { style: 'margin:0;max-width:720px;font-size:0.85rem;color:var(--nk-text-secondary);' },
        'Papiret er lyst uansett appens fargemodus: verdiene under er de samme i lys og mørk, og de genereres som én :root-blokk uten .nk-dark-variant. Rollene bygger på Sign-paletten (tar som blekk og bånd, plum som tittel, berry som handling, gold som venter).'),
      ...GROUPS.map((group) =>
        h('section', [
          h('h3', { style: 'margin:0 0 10px;font-size:0.95rem;' }, group.title),
          h('div', { style: 'display:flex;flex-wrap:wrap;gap:12px;' },
            group.keys.map((key) => {
              const value = documentScheme[key]
              const baseKey = baseKeyFor(key)
              const baseValue = baseKey ? documentScheme[baseKey] : undefined
              const isShadow = key === 'shadow'
              const swatchStyle = isShadow
                ? `height:64px;border-radius:8px;background:${documentScheme.paper};box-shadow:0 6px 28px ${value};`
                : `height:64px;border-radius:8px;background:${baseValue ?? value};border:1px solid ${documentScheme.border};display:flex;align-items:center;justify-content:center;`
              return h('div', { key, style: 'width:170px;' }, [
                h('div', { style: swatchStyle },
                  baseValue ? h('span', { style: `color:${value};font-size:0.9rem;font-weight:600;` }, 'Aa') : undefined),
                h('div', { style: 'font-size:0.78rem;font-weight:600;margin-top:6px;' }, key),
                h('code', { style: 'display:block;font-size:0.7rem;opacity:0.75;' }, cssName(key)),
                h('code', { style: 'font-size:0.72rem;opacity:0.75;' }, value),
              ])
            }),
          ),
        ]),
      ),
    ]),
}

// Et miniatyrark bygget kun av --nk-doc-*-variablene fra productCss(): ser
// identisk ut i lys og mørk modus.
export const Papir: Story = {
  render: () =>
    h('div', { style: 'display:flex;flex-direction:column;gap:12px;max-width:560px;' }, [
      h('p', { style: 'margin:0;font-size:0.85rem;color:var(--nk-text-secondary);' },
        'Bytt Modus i toolbaren — arket forblir lyst mens Storybook-flaten rundt skifter.'),
      h('div', {
        style: 'background:var(--nk-doc-paper);color:var(--nk-doc-ink);border-radius:12px;box-shadow:0 6px 28px var(--nk-doc-shadow);overflow:hidden;font-size:0.85rem;',
      }, [
        h('div', { style: 'background:var(--nk-doc-band);color:var(--nk-doc-on-band);padding:20px 24px;' }, [
          h('div', { style: 'font-size:0.66rem;letter-spacing:0.18em;text-transform:uppercase;color:var(--nk-doc-on-band-muted);font-weight:800;' }, 'Tilbud'),
          h('div', { style: 'font-size:1.4rem;font-weight:800;margin-top:6px;' }, 'Nytt bad i kjeller'),
        ]),
        h('div', { style: 'padding:20px 24px;display:flex;flex-direction:column;gap:12px;' }, [
          h('div', { style: 'font-size:0.64rem;letter-spacing:0.1em;text-transform:uppercase;color:var(--nk-doc-ink-muted);font-weight:800;' }, 'Utarbeidet for'),
          h('div', { style: 'font-weight:800;color:var(--nk-doc-title);' }, 'Kari Nordmann'),
          h('div', { style: 'background:var(--nk-doc-paper-soft);border:1px solid var(--nk-doc-border);border-radius:10px;padding:12px 14px;color:var(--nk-doc-ink-soft);' },
            'Rive eksisterende bad, nytt membransystem og fliser på gulv og vegg.'),
          h('div', { style: 'background:var(--nk-doc-attention-soft);border:1px solid var(--nk-doc-attention-border);border-radius:10px;padding:12px 14px;' }, [
            h('div', { style: 'font-weight:800;color:var(--nk-doc-on-attention-soft);margin-bottom:4px;' }, '⚠ Forbehold'),
            h('div', { style: 'color:var(--nk-doc-ink-soft);' }, 'Tilbudet forutsetter at sluk kan gjenbrukes.'),
          ]),
          h('span', { style: 'align-self:flex-start;background:var(--nk-doc-accent-soft);border:1px solid var(--nk-doc-accent-border);color:var(--nk-doc-on-accent-soft);border-radius:999px;padding:2px 10px;font-size:0.68rem;font-weight:700;' }, 'Gjør kundevennlig'),
          h('div', { style: 'display:flex;justify-content:space-between;background:var(--nk-doc-band);color:var(--nk-doc-on-band);border-radius:9px;padding:12px 14px;font-weight:800;' }, [
            h('span', 'Totalt inkl. mva'),
            h('span', '184 500 kr'),
          ]),
        ]),
      ]),
      h('details', [
        h('summary', { style: 'font-size:0.8rem;cursor:pointer;' }, 'CSS-variablene'),
        h('pre', { style: 'font-size:0.7rem;margin:8px 0 0;' },
          Object.entries(documentCssVariables()).map(([name, value]) => `${name}: ${value};`).join('\n')),
      ]),
    ]),
}
