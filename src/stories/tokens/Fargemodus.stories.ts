import { h } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'

/**
 * Viser at native kontroller (scrollbar, checkbox, radio, tekstfelt, select)
 * følger valgt tema — ikke OS-preferansen. Temaklassen (`dark`/`nk-dark`)
 * bærer `color-scheme`; verifiser ved å emulere `prefers-color-scheme: dark`
 * i devtools mens Modus står på Light, og omvendt (SIGN-433).
 */
const meta: Meta = {
  title: 'Design system/Tokens/Fargemodus',
  parameters: { controls: { disable: true } },
}

export default meta
type Story = StoryObj

const field = 'font: inherit;padding:8px 10px;border-radius:var(--nk-radius-sm);border:1px solid var(--nk-surface-border);min-width:220px;'

export const NativeKontroller: Story = {
  name: 'Native kontroller',
  render: () =>
    h('div', { style: 'display:flex;flex-direction:column;gap:20px;max-width:720px;color:var(--nk-text-primary);' }, [
      h('p', { style: 'margin:0;font-size:0.85rem;color:var(--nk-text-secondary);' },
        'Alt under er native nettleserkontroller uten egen styling. De skal være lyse i lys modus og mørke i mørk modus — uavhengig av hva operativsystemet foretrekker.'),
      h('div', { style: 'display:flex;gap:16px;flex-wrap:wrap;align-items:center;' }, [
        h('label', { style: 'display:flex;align-items:center;gap:8px;' }, [
          h('input', { type: 'checkbox', checked: true }), 'Send kopi til kunden',
        ]),
        h('label', { style: 'display:flex;align-items:center;gap:8px;' }, [
          h('input', { type: 'checkbox' }), 'Krev signatur',
        ]),
        h('label', { style: 'display:flex;align-items:center;gap:8px;' }, [
          h('input', { type: 'radio', name: 'nk-modus', checked: true }), 'Fastpris',
        ]),
        h('label', { style: 'display:flex;align-items:center;gap:8px;' }, [
          h('input', { type: 'radio', name: 'nk-modus' }), 'Regning',
        ]),
      ]),
      h('div', { style: 'display:flex;gap:12px;flex-wrap:wrap;' }, [
        h('input', { type: 'text', value: 'Byggmester Hansen AS', style: field }),
        h('input', { type: 'email', placeholder: 'post@firma.no', style: field }),
        h('select', { style: field }, [
          h('option', 'Snekker'),
          h('option', 'Rørlegger'),
          h('option', 'Elektriker'),
        ]),
      ]),
      h('textarea', { rows: 3, style: `${field}resize:vertical;`, value: 'Beskriv oppdraget…' }),
      h('div', {
        style: 'height:160px;overflow:auto;border:1px solid var(--nk-surface-border);border-radius:var(--nk-radius-md);padding:12px;background:var(--nk-surface);',
      }, [
        h('p', { style: 'margin:0 0 8px;font-size:0.8rem;color:var(--nk-text-secondary);' }, 'Scrollbaren under følger temaet:'),
        ...Array.from({ length: 24 }, (_, i) =>
          h('div', { key: i, style: 'padding:6px 0;border-bottom:1px solid var(--nk-surface-border);' }, `Linje ${i + 1} — bad, kjøkken, tak, fasade`),
        ),
      ]),
    ]),
}
