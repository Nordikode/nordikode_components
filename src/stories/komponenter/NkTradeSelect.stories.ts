import type { Meta, StoryObj } from '@storybook/vue3-vite'
import { ref } from 'vue'
import NkTradeSelect from '../../components/NkTradeSelect.vue'
import type { NkPlatformTradeOption, NkTradeCreateInput, NkTradeOption } from '../../types/NkTrade'
import type { NkTradeSelectLabels } from '../../types/NkTradeSelectLabels'

// Eksempeldata: et tenkt badefirma, ikke et ekte firma.
const trades: NkTradeOption[] = [
  { key: 'carpentry', name: 'Tømrer', delivery: 'own' },
  { key: 'tiling', name: 'Flislegger', delivery: 'own' },
  { key: 'waterproofing', name: 'Membran', delivery: 'own' },
  { key: 'plumbing', name: 'Rørlegger', delivery: 'subcontracted' },
  { key: 'electrical', name: 'Elektriker', delivery: 'subcontracted' },
  { key: 'painting', name: 'Maler', delivery: 'own' },
  { key: 'demolition', name: 'Riving', delivery: 'own' },
  { key: 'membrane-old', name: 'Membran (gammel)', delivery: 'own', archived: true },
]

const platformTrades: NkPlatformTradeOption[] = [
  { key: 'carpentry', name: 'Tømrer', synonyms: ['snekker', 'trearbeid'] },
  { key: 'tiling', name: 'Flislegger', synonyms: ['flis', 'fliser'] },
  { key: 'plumbing', name: 'Rørlegger', synonyms: ['vvs', 'sanitær'] },
  { key: 'electrical', name: 'Elektriker', synonyms: ['elektro', 'el'] },
  { key: 'painting', name: 'Maler', synonyms: ['maling', 'sparkling'] },
  { key: 'masonry', name: 'Murer', synonyms: ['mur', 'puss'] },
  { key: 'roofing', name: 'Taktekker', synonyms: ['tak', 'taktekking'] },
  { key: 'ventilation', name: 'Ventilasjon', synonyms: ['ventilasjonsmontør'] },
]

const labels: NkTradeSelectLabels = {
  field: 'Fag',
  placeholder: 'Søk etter fag',
  subcontracted: 'Settes bort',
  archived: 'Arkivert',
  noMatch: 'Ingen fag passer.',
  noMatchNoAccess: 'Ingen fag passer. En administrator kan legge til fag i Sign-innstillingene.',
  addOwn: (name) => `Legg til «${name}» som nytt fag`,
  addFromPlatform: (name) => `Legg til «${name}» fra Nordikodes fagliste`,
  deliveryQuestion: (name) => `Leverer dere «${name}» selv, eller settes det bort?`,
  deliveryOwn: 'Leverer selv',
  deliverySubcontracted: 'Setter bort',
  cancel: 'Avbryt',
  createFailed: 'Kunne ikke legge til faget.',
}

const meta: Meta<typeof NkTradeSelect> = {
  title: 'Komponenter/NkTradeSelect',
  component: NkTradeSelect,
  render: (args) => ({
    components: { NkTradeSelect },
    setup() {
      const value = ref(args.modelValue)
      const list = ref<NkTradeOption[]>([...args.trades])
      const created = ref<string | null>(null)
      // Står for core `createTenantTrade`: nøkkelen kommer fra «serveren».
      const createTrade = async (input: NkTradeCreateInput): Promise<string> => {
        await new Promise((resolve) => setTimeout(resolve, 400))
        const key = input.platformTradeKey ?? `own-${list.value.length + 1}`
        list.value = [...list.value, { key, name: input.name, delivery: input.delivery, platformTradeKey: input.platformTradeKey }]
        created.value = `${input.name} (${input.delivery === 'own' ? 'leverer selv' : 'settes bort'}, nøkkel ${key})`
        return key
      }
      return { args, value, list, created, createTrade }
    },
    template: `
      <div style="max-width: 420px; display: grid; gap: 16px">
        <NkTradeSelect v-bind="args" v-model="value" :trades="list" :create-trade="args.canManage ? createTrade : undefined" />
        <pre style="margin: 0; font-size: 12px">v-model: {{ JSON.stringify(value) }}</pre>
        <p v-if="created" style="margin: 0; font-size: 12px">Lagt til i firmaets fag: {{ created }}</p>
      </div>`,
  }),
  args: { trades, platformTrades, labels, canManage: true },
}

export default meta
type Story = StoryObj<typeof NkTradeSelect>

/** Søk mens du skriver: «vvs» finner Rørlegger via synonymet. */
export const Sok: Story = { name: 'Søk', args: { modelValue: 'tiling' } }

/** Skriv «Murer»: faget finnes i Nordikodes fagliste og legges til derfra. */
export const LeggTilFraNordikode: Story = { name: 'Legg til fra Nordikodes liste', args: { modelValue: null } }

/** Skriv «Stillas»: finnes ikke noe sted, og legges til som eget fag etter spørsmålet om levering. */
export const LeggTilEget: Story = { name: 'Legg til eget fag', args: { modelValue: null } }

/** UE-fanen vet at faget settes bort; velgeren spør ikke. */
export const UtenSporsmal: Story = { name: 'Levering gitt av flaten (UE)', args: { modelValue: null, delivery: 'subcontracted' } }

export const Flervalg: Story = { args: { modelValue: ['tiling', 'waterproofing'], multiple: true } }

/** Uten `core.trades.manage`: ingen «Legg til», og tomt treff sier hvem som kan. */
export const UtenRettighet: Story = { name: 'Uten rettighet', args: { modelValue: null, canManage: false } }

export const ArkivertValgt: Story = { name: 'Arkivert fag valgt', args: { modelValue: 'membrane-old' } }

export const ArkivertIFlervalg: Story = { name: 'Arkivert fag i flervalg', args: { modelValue: ['membrane-old', 'tiling'], multiple: true } }
