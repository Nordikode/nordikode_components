import { defineComponent, h, ref, type Component } from 'vue'
import { VBtn, VChip, VSelect, VSwitch } from 'vuetify/components'
import type { Meta, StoryObj } from '@storybook/vue3-vite'
import NkListPane from '../../components/NkListPane.vue'
import NkStatusChip from '../../components/NkStatusChip.vue'

// Listepanelet (SIGN-1845): ett hode for alle liste/detalj-flater.
// Tittelraden (tittel, brikke, handling), søkeraden (søk + filterknapp med
// antall aktive filtre) og verktøyraden (brikker). Rull i listen: verktøyraden
// legges sammen og tittelraden strammes, mens tittel, brikke og «Ny sak» blir
// stående over søket (SIGN-1852); øverst åpner hodet seg igjen. Filtrene
// ligger i nedtrekksmenyen, aldri som rekker av felt i hodet.

const meta: Meta<typeof NkListPane> = {
  title: 'Komponenter/NkListPane',
  component: NkListPane,
  parameters: { layout: 'fullscreen' },
}

export default meta
type Story = StoryObj<typeof NkListPane>

const kunder = ['Hansen', 'Berg', 'Solberg', 'Nilsen', 'Haugen', 'Dahl', 'Moen', 'Lie', 'Strand', 'Bakken']
const saker = Array.from({ length: 40 }, (_, i) => ({
  id: String(i + 1),
  title: ['Bytte dusj', 'Totalrenovering av bad', 'Nytt kjøkken', 'Legge parkett', 'Male fasade'][i % 5],
  customer: `${kunder[i % kunder.length]} · ${['Bergen', 'Oslo', 'Trondheim'][i % 3]}`,
  status: ['Ny', 'Tilbud sendt', 'Vunnet'][i % 3],
}))

const rad = (sak: (typeof saker)[number], valgt: boolean) =>
  h(
    'button',
    {
      type: 'button',
      style: {
        background: valgt ? 'var(--nk-surface-soft-accent)' : 'transparent',
        border: 0,
        borderBottom: '1px solid var(--nk-surface-border)',
        cursor: 'pointer',
        display: 'flex',
        flexDirection: 'column',
        font: 'inherit',
        gap: '2px',
        padding: '12px 20px',
        textAlign: 'left',
        width: '100%',
      },
    },
    [
      h('strong', sak.title),
      h('span', { style: { color: 'var(--nk-text-secondary)', fontSize: '0.85rem' } }, `${sak.customer} · ${sak.status}`),
    ],
  )

const Demo = defineComponent({
  props: { medFiltre: { type: Boolean, default: true }, medVerktoy: { type: Boolean, default: true } },
  setup(props) {
    const search = ref('')
    const status = ref<string | null>(null)
    const bareMine = ref(false)
    const filterCount = () => (status.value === null ? 0 : 1) + (bareMine.value ? 1 : 0)
    const synlige = () =>
      saker.filter(
        (sak) =>
          (status.value === null || sak.status === status.value) &&
          (search.value === '' || `${sak.title} ${sak.customer}`.toLowerCase().includes(search.value.toLowerCase())),
      )

    return () =>
      h('div', { style: { display: 'flex', height: '100vh', background: 'rgb(var(--v-theme-background))' } }, [
        h(
          NkListPane,
          {
            title: 'Saker',
            headingTag: 'h1',
            search: search.value,
            'onUpdate:search': (value: string) => (search.value = value),
            searchPlaceholder: 'Søk i saker',
            filterCount: filterCount(),
            labels: { filters: 'Filtre', resetFilters: 'Nullstill' },
            'onReset-filters': () => {
              status.value = null
              bareMine.value = false
            },
          },
          {
            badge: () => h(NkStatusChip, { label: '3 venter', size: 'sm', tone: 'warning' }),
            actions: () => h(VBtn, { prependIcon: 'mdi-plus', size: 'small' }, () => 'Ny sak'),
            ...(props.medFiltre
              ? {
                  filters: () => [
                    h(VSelect as Component, {
                      density: 'compact',
                      hideDetails: true,
                      items: [
                        { title: 'Alle statuser', value: null },
                        { title: 'Ny', value: 'Ny' },
                        { title: 'Tilbud sendt', value: 'Tilbud sendt' },
                        { title: 'Vunnet', value: 'Vunnet' },
                      ],
                      label: 'Status',
                      modelValue: status.value,
                      'onUpdate:modelValue': (value: string | null) => (status.value = value),
                      variant: 'outlined',
                    }),
                    h(VSwitch as Component, {
                      color: 'primary',
                      density: 'compact',
                      hideDetails: true,
                      label: 'Bare mine saker',
                      modelValue: bareMine.value,
                      'onUpdate:modelValue': (value: boolean | null) => (bareMine.value = value === true),
                    }),
                  ],
                }
              : {}),
            ...(props.medVerktoy
              ? {
                  toolbar: () =>
                    ['Alle', 'Aktive', 'Vunnet', 'Tapt'].map((navn, i) =>
                      h(VChip, { class: i === 0 ? 'panel-filter--active' : '', size: 'small', variant: 'tonal' }, () => navn),
                    ),
                }
              : {}),
            default: () => synlige().map((sak) => rad(sak, sak.id === '2')),
            footer: () =>
              h('p', { style: { color: 'var(--nk-text-secondary)', fontSize: '0.85rem', margin: 0, padding: '10px 20px' } }, `${synlige().length} av ${saker.length} saker`),
          },
        ),
        h('div', { style: { flex: 1, padding: '24px', color: 'var(--nk-text-secondary)' } }, 'Det valgte vises her. Rull i listen til venstre: verktøyraden legges sammen og hodet strammes, men tittel og «Ny sak» står.'),
      ])
  },
})

// Sakslisten i Sign: tittel med brikke og «Ny sak», søk, filtre i menyen,
// brikkerad og teller nederst. Rull i listen.
export const Standard: Story = {
  render: () => h(Demo),
}

// Backoffice-variant: uten brikkerad — bare tittel, søk og filtermenyen.
export const UtenVerktoyrad: Story = {
  render: () => h(Demo, { medVerktoy: false }),
}

// Bare søk: ingen filtre å vise, så filterknappen finnes ikke.
export const BareSok: Story = {
  render: () => h(Demo, { medFiltre: false, medVerktoy: false }),
}

// Liste først (SIGN-1888, slått på i Sign): listen er en egen side i full
// bredde. Velg en rad: listen skjules og det valgte står alene med et kryss
// oppe til høyre. Lukk: listen er tilbake med samme søk og rulleposisjon.
const ListeForstDemo = defineComponent({
  setup() {
    const search = ref('')
    const valgt = ref<string | null>(null)
    const synlige = () =>
      saker.filter((sak) => search.value === '' || `${sak.title} ${sak.customer}`.toLowerCase().includes(search.value.toLowerCase()))

    return () =>
      h('div', { style: { display: 'flex', height: '100vh', background: 'rgb(var(--v-theme-background))' } }, [
        h(
          NkListPane,
          {
            title: 'Saker',
            headingTag: 'h1',
            listFirst: true,
            detailOpen: valgt.value !== null,
            search: search.value,
            'onUpdate:search': (value: string) => (search.value = value),
            searchPlaceholder: 'Søk i saker',
          },
          {
            actions: () => h(VBtn, { prependIcon: 'mdi-plus' }, () => 'Ny sak'),
            toolbar: () =>
              ['Alle', 'Aktive', 'Vunnet', 'Tapt'].map((navn, i) =>
                h(VChip, { class: i === 0 ? 'panel-filter--active' : '', size: 'small', variant: 'tonal' }, () => navn),
              ),
            default: () =>
              synlige().map((sak) => h('div', { key: sak.id, onClick: () => (valgt.value = sak.id) }, [rad(sak, false)])),
          },
        ),
        valgt.value !== null
          ? h('div', { style: { display: 'flex', flex: 1, flexDirection: 'column' } }, [
              h(
                'div',
                {
                  style: {
                    alignItems: 'center',
                    background: 'rgb(var(--v-theme-surface))',
                    borderBottom: '1px solid var(--nk-surface-border)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    padding: '8px 12px 8px 24px',
                  },
                },
                [
                  h('strong', saker.find((sak) => sak.id === valgt.value)?.title),
                  h(VBtn, { 'aria-label': 'Lukk saken', icon: 'mdi-close', size: 'small', variant: 'text', onClick: () => (valgt.value = null) }),
                ],
              ),
              h('p', { style: { color: 'var(--nk-text-secondary)', margin: 0, padding: '24px' } }, 'Det valgte fyller hele flaten. Krysset går tilbake til listen.'),
            ])
          : null,
      ])
  },
})

export const ListeForst: Story = {
  render: () => h(ListeForstDemo),
}
