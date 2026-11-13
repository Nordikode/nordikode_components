import { computed, defineComponent, h, ref } from 'vue'
import { VBtn, VTextField } from 'vuetify/components'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NkContactPickerDialog from '../../components/NkContactPickerDialog.vue'
import type { NkContactPickerItem, NkContactPickerLabels, NkContactPickerView } from '../../types/NkContactPicker'

// Kontaktvelgeren (SIGN-1913): standarden for å velge en kontakt, uansett
// type. Listen står framme når velgeren åpnes, søket ligger øverst, og hver
// kontakt vises med en kort forhåndsvisning — som liste eller kort. Appen eier
// data, søk mot serveren og tekster; her er søket simulert i historien.

const meta: Meta<typeof NkContactPickerDialog> = {
  title: 'Komponenter/NkContactPickerDialog',
  component: NkContactPickerDialog,
}

export default meta
type Story = StoryObj<typeof NkContactPickerDialog>

const baseLabels: NkContactPickerLabels = {
  search: 'Søk i kontakter',
  view: 'Visning',
  viewList: 'Liste',
  viewCards: 'Kort',
  close: 'Lukk',
  selected: 'Valgt',
  showMore: 'Vis flere',
  loading: 'Laster …',
  empty: 'Ingen kontakter ennå',
  noMatches: 'Ingen treff',
}

const kunder: NkContactPickerItem[] = [
  { id: 'k1', name: 'Kari Hansen', kind: 'person', tags: ['Kunde'], phone: '+47 909 90 909', email: 'kari.hansen@example.no', location: 'Bergen' },
  { id: 'k2', name: 'Fjordbygg AS', kind: 'company', tags: ['Kunde', 'Leverandør'], secondary: 'Ola Nordmann', phone: '+47 55 12 34 56', email: 'post@fjordbygg.example.no', location: 'Os' },
  { id: 'k3', name: 'Borettslaget Solsiden', kind: 'company', tags: ['Kunde'], secondary: 'Styreleder Anne Lie', email: 'styret@solsiden.example.no', location: 'Bergen' },
  { id: 'k4', name: 'Per Olsen', kind: 'person', tags: ['Kunde'], phone: '+47 412 34 567', location: 'Askøy' },
  { id: 'k5', name: 'Vestrør AS', kind: 'company', tags: ['Underleverandør'], secondary: 'Jonas Vik', phone: '+47 911 22 333', email: 'jonas@vestror.example.no', location: 'Fana' },
  { id: 'k6', name: 'Ingrid Berg', kind: 'person', email: 'ingrid.berg@example.no' },
]

const leverandorer: NkContactPickerItem[] = [
  { id: 'l1', name: 'Optimera Bergen', kind: 'company', tags: ['Leverandør'], phone: '+47 55 50 60 70', email: 'bergen@optimera.example.no', location: 'Bergen', group: 'Brukes ofte' },
  { id: 'l2', name: 'Byggmakker Åsane', kind: 'company', tags: ['Leverandør'], phone: '+47 55 18 19 20', location: 'Åsane', group: 'Brukes ofte' },
  { id: 'l3', name: 'Ahlsell Norge', kind: 'company', tags: ['Leverandør'], email: 'ordre@ahlsell.example.no', location: 'Stavanger', group: 'Alle kontakter' },
  { id: 'l4', name: 'Fjordbygg AS', kind: 'company', tags: ['Kunde', 'Leverandør'], secondary: 'Ola Nordmann', location: 'Os', group: 'Alle kontakter' },
]

const ansatte: NkContactPickerItem[] = [
  { id: 'a1', name: 'Tommy Riise', kind: 'person', secondary: 'Daglig leder', email: 'tommy@firma.example.no', phone: '+47 900 00 001' },
  { id: 'a2', name: 'Hedvig Moe', kind: 'person', secondary: 'Prosjektleder', email: 'hedvig@firma.example.no' },
  { id: 'a3', name: 'Christer Dahl', kind: 'person', secondary: 'Tømrer', phone: '+47 900 00 003' },
]

interface PickerStoryOptions {
  title: string
  subtitle?: string
  items: NkContactPickerItem[]
  labels: NkContactPickerLabels
  selectedId?: string | null
  view?: NkContactPickerView
  canCreate?: boolean
  clearable?: boolean
}

/** Åpneknapp + velgeren, med søk simulert på navnet. */
const pickerStory = (options: PickerStoryOptions) =>
  defineComponent({
    setup() {
      const open = ref(true)
      const search = ref('')
      const view = ref<NkContactPickerView>(options.view ?? 'list')
      const selectedId = ref<string | null>(options.selectedId ?? null)
      const creating = ref(false)
      const items = computed(() =>
        options.items.filter((item) => item.name.toLowerCase().includes(search.value.trim().toLowerCase())),
      )

      return () =>
        h('div', [
          h(VBtn, { onClick: () => (open.value = true) }, () => options.title),
          h(
            NkContactPickerDialog,
            {
              modelValue: open.value,
              title: creating.value ? (options.labels.create ?? options.title) : options.title,
              subtitle: options.subtitle,
              items: items.value,
              selectedId: selectedId.value,
              search: search.value,
              view: view.value,
              canCreate: options.canCreate,
              clearable: options.clearable,
              creating: creating.value,
              labels: { ...options.labels, noMatches: `Ingen treff på «${search.value.trim()}»` },
              'onUpdate:modelValue': (value: boolean) => {
                open.value = value
                creating.value = false
              },
              'onUpdate:search': (value: string) => (search.value = value),
              'onUpdate:view': (value: NkContactPickerView) => (view.value = value),
              onSelect: (id: string) => {
                selectedId.value = id
                open.value = false
              },
              onClear: () => {
                selectedId.value = null
                open.value = false
              },
              onCreate: () => (creating.value = true),
            },
            {
              create: () => [
                h(VTextField, { label: 'Navn', modelValue: search.value, autofocus: true }),
                h(VTextField, { label: 'Telefon' }),
                h('div', { style: 'display:flex;gap:8px;justify-content:flex-end;' }, [
                  h(VBtn, { variant: 'text', onClick: () => (creating.value = false) }, () => 'Avbryt'),
                  h(VBtn, { onClick: () => (creating.value = false) }, () => 'Opprett'),
                ]),
              ],
            },
          ),
        ])
    },
  })

// Kunde på et prosjekt: listen står framme, ett trykk velger, og kunden som
// alt er valgt er merket og kan fjernes.
export const Kunde: Story = {
  render: () =>
    h(
      pickerStory({
        title: 'Velg kunde',
        items: kunder,
        selectedId: 'k2',
        canCreate: true,
        clearable: true,
        labels: { ...baseLabels, create: 'Ny kunde', clear: 'Fjern kunde' },
      }),
    ),
}

// Kortvisningen: samme data, med telefon, e-post og sted på egne linjer.
export const KundeSomKort: Story = {
  render: () =>
    h(
      pickerStory({
        title: 'Velg kunde',
        items: kunder,
        view: 'cards',
        canCreate: true,
        labels: { ...baseLabels, create: 'Ny kunde' },
      }),
    ),
}

// Leverandør på en prisliste: forslag øverst («Brukes ofte»), resten under.
export const Leverandor: Story = {
  render: () =>
    h(
      pickerStory({
        title: 'Velg leverandør',
        subtitle: 'Prisene i fila knyttes til leverandøren du velger.',
        items: leverandorer,
        canCreate: true,
        labels: { ...baseLabels, search: 'Søk i leverandører', create: 'Ny leverandør' },
      }),
    ),
}

// Ansatt: samme velger, uten «Ny» — ansatte opprettes i firmaappen.
export const Ansatt: Story = {
  render: () =>
    h(
      pickerStory({
        title: 'Velg ansvarlig',
        items: ansatte,
        clearable: true,
        selectedId: 'a1',
        labels: { ...baseLabels, search: 'Søk i ansatte', empty: 'Ingen ansatte ennå', clear: 'Fjern ansvarlig' },
      }),
    ),
}

// Tomt register: tomtilstanden inviterer til å opprette den første kontakten.
export const TomtRegister: Story = {
  render: () =>
    h(
      pickerStory({
        title: 'Velg kunde',
        items: [],
        canCreate: true,
        labels: { ...baseLabels, create: 'Ny kunde' },
      }),
    ),
}

// Mottakere i en melding: flere kan velges, og brikkene avgrenser listen til
// én type kontakt. «Ferdig» lukker velgeren.
export const Mottakere: Story = {
  render: () =>
    h(
      defineComponent({
        setup() {
          const open = ref(true)
          const search = ref('')
          const filter = ref('all')
          const selectedIds = ref<string[]>(['a2'])
          const alle = [
            ...ansatte.map((item) => ({ ...item, tags: ['Kollega'], group: 'Kollegaer' })),
            ...kunder.map((item) => ({ ...item, group: 'Kontakter' })),
          ]
          const items = computed(() =>
            alle
              .filter((item) => filter.value === 'all' || (filter.value === 'colleagues') === (item.group === 'Kollegaer'))
              .filter((item) => item.name.toLowerCase().includes(search.value.trim().toLowerCase())),
          )

          return () =>
            h('div', [
              h(VBtn, { onClick: () => (open.value = true) }, () => `Mottakere (${selectedIds.value.length})`),
              h(NkContactPickerDialog, {
                modelValue: open.value,
                title: 'Velg mottakere',
                multiple: true,
                selectedIds: selectedIds.value,
                items: items.value,
                search: search.value,
                filters: [
                  { key: 'all', label: 'Alle' },
                  { key: 'colleagues', label: 'Kollegaer' },
                  { key: 'contacts', label: 'Kontakter' },
                ],
                filter: filter.value,
                labels: { ...baseLabels, done: 'Ferdig', filters: 'Vis', noMatches: 'Ingen treff' },
                'onUpdate:modelValue': (value: boolean) => (open.value = value),
                'onUpdate:search': (value: string) => (search.value = value),
                'onUpdate:filter': (value: string) => (filter.value = value),
                onToggle: (id: string) => {
                  selectedIds.value = selectedIds.value.includes(id)
                    ? selectedIds.value.filter((chosen) => chosen !== id)
                    : [...selectedIds.value, id]
                },
                onConfirm: () => (open.value = false),
              }),
            ])
        },
      }),
    ),
}
