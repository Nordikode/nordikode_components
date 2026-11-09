import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NkLineChart from '../../web/NkLineChart.vue'

/**
 * Linjediagrammet (SIGN-1873): utvikling over tid etter dataviz-reglene —
 * én akse, tynn linje, siste verdi merket, tooltip og tabell for resten.
 * Tekstene og tallformatet kommer fra appen; her på norsk med Intl.
 */
type Args = InstanceType<typeof NkLineChart>['$props']

const days = Array.from({ length: 30 }, (_, index) => {
  const date = new Date(Date.UTC(2026, 9, 1 + index))

  return date.toISOString().slice(0, 10)
})

const shortDate = new Intl.DateTimeFormat('nb', { day: 'numeric', month: 'short', timeZone: 'UTC' })
const longDate = new Intl.DateTimeFormat('nb', { weekday: 'short', day: 'numeric', month: 'long', timeZone: 'UTC' })
const count = new Intl.NumberFormat('nb', { maximumFractionDigits: 0 })

const labels = { table: 'Vis som tabell', chart: 'Vis som diagram', category: 'Periode', empty: 'Ingen tall ennå.' }

const meta: Meta<Args> = {
  title: 'Komponenter/NkLineChart',
  component: NkLineChart,
  decorators: [() => ({ template: '<div style="max-width: 48rem; padding: 1.5rem"><story /></div>' })],
  args: {
    categories: days,
    labels,
    ariaLabel: 'Nye firmaer per dag',
    formatValue: (value: number) => count.format(value),
    formatCategory: (value: string) => shortDate.format(new Date(value)),
    formatCategoryLong: (value: string) => longDate.format(new Date(value)),
  },
}

export default meta
type Story = StoryObj<Args>

/** Én serie: ingen forklaring, siste verdi merket direkte, fyll under linjen. */
export const EnSerie: Story = {
  args: {
    series: [{ key: 'new', label: 'Nye firmaer', values: days.map((_, index) => Math.round(3 + 4 * Math.sin(index / 4) + (index % 5))) }],
  },
}

/** To serier med samme enhet: forklaring under, tooltipen viser begge. */
export const ToSerier: Story = {
  args: {
    ariaLabel: 'Brukere og firmaer innom per dag',
    series: [
      { key: 'users', label: 'Brukere innom', values: days.map((_, index) => 40 + Math.round(12 * Math.sin(index / 3)) + index) },
      { key: 'tenants', label: 'Firmaer innom', values: days.map((_, index) => 12 + Math.round(3 * Math.cos(index / 5))), color: 'var(--nk-text-title)' },
    ],
  },
}

/** Mens tallene hentes: forrige tegning holdes svakere. */
export const Laster: Story = {
  args: { ...EnSerie.args, loading: true },
}

/** Uten kategorier: tom-teksten fra appen. */
export const Tom: Story = {
  args: { categories: [], series: [] },
}
