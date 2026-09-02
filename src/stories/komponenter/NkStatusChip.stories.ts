import { h } from 'vue'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NkStatusChip from '../../components/NkStatusChip.vue'
import type { NkStatusChipTone } from '../../types/NkStatusChipTone'

// Statuschipen (SIGN-309): TO størrelser, seks semantiske toner.
// sm = lister/tabeller (sakslisten), md = hoder/kort (sakshodets «TILBUD SENDT»).
// Tonene følger designsystemets fargeroller: fullført = nordlys-tint,
// underveis = kopper-tint, venter = varsel, feil, info = fjord, nøytral.
// Teksten kommer alltid fra appens i18n — komponenten eier ingen strenger.

const meta: Meta<typeof NkStatusChip> = {
  title: 'Komponenter/NkStatusChip',
  component: NkStatusChip,
  argTypes: {
    tone: { control: 'select', options: ['success', 'inflight', 'warning', 'error', 'info', 'neutral'] },
    size: { control: 'select', options: ['sm', 'md'] },
  },
}

export default meta
type Story = StoryObj<typeof NkStatusChip>

// Norske eksempeldata fra Sign — én typisk tekst per tone.
const EKSEMPLER: Array<{ tone: NkStatusChipTone; label: string; rolle: string }> = [
  { tone: 'success', label: 'Signert', rolle: 'fullført (nordlys-tint)' },
  { tone: 'inflight', label: 'Tilbud sendt', rolle: 'underveis (kopper-tint)' },
  { tone: 'warning', label: 'Venter på kunde', rolle: 'venter på noen (varsel)' },
  { tone: 'error', label: 'Avvist', rolle: 'feil' },
  { tone: 'info', label: 'I melding', rolle: 'maskinen/AI (fjord)' },
  { tone: 'neutral', label: 'Utkast', rolle: 'nøytral' },
]

export const TilbudSendt: Story = {
  args: { label: 'Tilbud sendt', tone: 'inflight', size: 'md' },
}

export const Liten: Story = {
  args: { label: 'Venter på kunde', tone: 'warning', size: 'sm' },
}

// Hele matrisen: begge størrelser × alle toner, med rollenavnet ved siden av.
export const AlleTilstander: Story = {
  render: () =>
    h('div', { style: 'display:flex;flex-direction:column;gap:12px;' },
      EKSEMPLER.map(({ tone, label, rolle }) =>
        h('div', { key: tone, style: 'display:flex;align-items:center;gap:12px;' }, [
          h(NkStatusChip, { tone, label, size: 'sm' }),
          h(NkStatusChip, { tone, label, size: 'md' }),
          h('span', { style: 'font-size:0.78rem;opacity:0.7;' }, `${tone} — ${rolle}`),
        ]),
      ),
    ),
}
