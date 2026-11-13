<script setup lang="ts">
import { computed, nextTick, ref, watch } from 'vue'
import IdentityAvatar from './IdentityAvatar.vue'
import NkEmptyState from './NkEmptyState.vue'
import NkSheet from './NkSheet.vue'
import { NK_SEARCH_FIELD_ATTRS } from '../forms/searchFieldAttrs'
import type { NkContactPickerItem, NkContactPickerLabels, NkContactPickerView } from '../types/NkContactPicker'

/**
 * Kontaktvelgeren (SIGN-1913): standarden for å velge en kontakt — kunde,
 * leverandør, underleverandør eller ansatt. En modal med kontaktlisten ferdig
 * framme, søk øverst og en kort forhåndsvisning av hver kontakt, som liste
 * eller som kort. Ett trykk på en kontakt velger den.
 *
 * Komponenten eier bare flaten. Appen eier dataene (`items`, hentet med søk og
 * side for side fra serveren), tekstene (`labels`), hvilken visning brukeren
 * har valgt (`v-model:view`, lagret per bruker) og «Ny kontakt»-skjemaet
 * (`#create`, vist i stedet for listen når `creating` er sann).
 */
interface Props {
  /** v-model: åpen/lukket. */
  modelValue: boolean
  /** Dialogens navn: hva som velges, f.eks. «Velg kunde». */
  title: string
  subtitle?: string
  items: NkContactPickerItem[]
  /** Kontakten som er valgt fra før — merkes i listen. */
  selectedId?: string | null
  /** v-model:search. Appen søker på serveren når teksten endres. */
  search?: string
  /** v-model:view. */
  view?: NkContactPickerView
  loading?: boolean
  /** Serveren har flere treff: «Vis flere» vises under listen og sender `load-more`. */
  hasMore?: boolean
  /** Viser «Ny kontakt»-knappen (`labels.create`), som sender `create`. */
  canCreate?: boolean
  /** Appens «Ny kontakt»-skjema vises i `#create` i stedet for listen. */
  creating?: boolean
  /** Viser «Fjern valg»-knappen (`labels.clear`) når en kontakt er valgt fra før. */
  clearable?: boolean
  labels: NkContactPickerLabels
  maxWidth?: number | string
}

const props = withDefaults(defineProps<Props>(), {
  subtitle: '',
  selectedId: null,
  search: '',
  view: 'list',
  loading: false,
  hasMore: false,
  canCreate: false,
  creating: false,
  clearable: false,
  maxWidth: 920,
})

const emit = defineEmits<{
  'update:modelValue': [open: boolean]
  'update:search': [search: string]
  'update:view': [view: NkContactPickerView]
  /** Kontakten brukeren trykket på. Eieren lukker dialogen når valget er tatt imot. */
  select: [id: string]
  'load-more': []
  create: []
  clear: []
}>()

const VIEWS: NkContactPickerView[] = ['list', 'cards']
const VIEW_ICONS: Record<NkContactPickerView, string> = {
  list: 'mdi-format-list-bulleted',
  cards: 'mdi-view-grid-outline',
}

const viewLabel = (view: NkContactPickerView): string => (view === 'list' ? props.labels.viewList : props.labels.viewCards)

const searchField = ref<{ focus: () => void } | null>(null)

// Søkefeltet har fokus når velgeren åpnes og når «Ny kontakt» lukkes, så
// brukeren kan skrive med en gang.
watch(
  () => props.modelValue && !props.creating,
  async (ready) => {
    if (ready) {
      await nextTick()
      searchField.value?.focus()
    }
  },
)

const showClear = computed(() => props.clearable && Boolean(props.selectedId) && Boolean(props.labels.clear))
const showCreate = computed(() => props.canCreate && Boolean(props.labels.create))
const hasFooter = computed(() => !props.creating && (showClear.value || showCreate.value))
const firstLoad = computed(() => props.loading && props.items.length === 0)

interface Section {
  key: string
  title: string | null
  items: NkContactPickerItem[]
}

/** Radene delt i grupper der appen har satt `group`; uten grupper er det én liste uten overskrift. */
const sections = computed<Section[]>(() => {
  const list: Section[] = []

  for (const item of props.items) {
    const title = item.group ?? null
    const last = list[list.length - 1]

    if (last && last.title === title) {
      last.items.push(item)
    } else {
      list.push({ key: `${list.length}:${title ?? ''}`, title, items: [item] })
    }
  }

  return list
})

/** Listevisningens ene linje under navnet: det som finnes av kontaktperson, telefon, e-post og sted. */
const subline = (item: NkContactPickerItem): string =>
  [item.secondary, item.phone, item.email, item.location].filter(Boolean).join(' · ')

const details = (item: NkContactPickerItem): { icon: string; text: string }[] =>
  [
    { icon: 'mdi-phone-outline', text: item.phone ?? '' },
    { icon: 'mdi-email-outline', text: item.email ?? '' },
    { icon: 'mdi-map-marker-outline', text: item.location ?? '' },
  ].filter((detail) => detail.text !== '')
</script>

<template>
  <NkSheet
    :close-label="labels.close"
    :max-width="maxWidth"
    :model-value="modelValue"
    :subtitle="subtitle"
    :title="title"
    @update:model-value="(open: boolean) => emit('update:modelValue', open)"
  >
    <div v-if="creating" class="nk-contact-picker__create">
      <slot name="create" />
    </div>

    <template v-else>
      <div class="nk-contact-picker__toolbar">
        <v-text-field
          ref="searchField"
          v-bind="NK_SEARCH_FIELD_ATTRS"
          :aria-label="labels.search"
          class="nk-contact-picker__search"
          clearable
          density="comfortable"
          hide-details
          :loading="loading && items.length > 0"
          :model-value="search"
          :placeholder="labels.search"
          prepend-inner-icon="mdi-magnify"
          variant="outlined"
          @update:model-value="(value: string | null) => emit('update:search', value ?? '')"
        />
        <div :aria-label="labels.view" class="nk-contact-picker__views" role="group">
          <button
            v-for="option in VIEWS"
            :key="option"
            :aria-label="viewLabel(option)"
            :aria-pressed="view === option"
            class="nk-contact-picker__view"
            :class="{ 'nk-contact-picker__view--active': view === option }"
            :data-view="option"
            :title="viewLabel(option)"
            type="button"
            @click="emit('update:view', option)"
          >
            <v-icon aria-hidden="true" :icon="VIEW_ICONS[option]" size="18" />
          </button>
        </div>
      </div>

      <div class="nk-contact-picker__results" :class="`nk-contact-picker__results--${view}`">
        <div v-if="firstLoad" aria-live="polite" class="nk-contact-picker__loading">
          <v-progress-circular color="primary" indeterminate size="22" />
          <span>{{ labels.loading }}</span>
        </div>

        <NkEmptyState
          v-else-if="items.length === 0"
          :icon="search.trim() === '' ? 'mdi-account-multiple-outline' : 'mdi-magnify'"
          :size="search.trim() === '' ? 'default' : 'compact'"
          :title="search.trim() === '' ? labels.empty : labels.noMatches"
        />

        <template v-else>
          <section v-for="section in sections" :key="section.key" class="nk-contact-picker__section">
            <h3 v-if="section.title" class="nk-contact-picker__section-title">{{ section.title }}</h3>
            <ul class="nk-contact-picker__items">
              <li v-for="item in section.items" :key="item.id" class="nk-contact-picker__item-wrap">
                <button
                  :aria-current="item.id === selectedId ? 'true' : undefined"
                  class="nk-contact-picker__item"
                  :class="{ 'nk-contact-picker__item--selected': item.id === selectedId }"
                  :data-contact-id="item.id"
                  type="button"
                  @click="emit('select', item.id)"
                >
                  <span class="nk-contact-picker__identity">
                    <IdentityAvatar
                      v-if="item.kind === 'person' || item.imageUrl"
                      color="secondary"
                      :image-url="item.imageUrl ?? null"
                      :name="item.name"
                      :size="view === 'cards' ? 40 : 34"
                    />
                    <v-avatar v-else color="secondary" :size="view === 'cards' ? 40 : 34">
                      <v-icon aria-hidden="true" icon="mdi-domain" :size="view === 'cards' ? 20 : 18" />
                    </v-avatar>
                    <span class="nk-contact-picker__texts">
                      <span class="nk-contact-picker__name-row">
                        <span class="nk-contact-picker__name">{{ item.name }}</span>
                        <span v-for="tag in item.tags ?? []" :key="tag" class="nk-contact-picker__tag">{{ tag }}</span>
                      </span>
                      <span v-if="view === 'list' && subline(item)" class="nk-contact-picker__sub">{{ subline(item) }}</span>
                      <span v-if="view === 'cards' && item.secondary" class="nk-contact-picker__sub">{{ item.secondary }}</span>
                    </span>
                    <span v-if="item.id === selectedId" class="nk-contact-picker__selected">
                      <v-icon aria-hidden="true" icon="mdi-check" size="16" />
                      {{ labels.selected }}
                    </span>
                  </span>
                  <span v-if="view === 'cards' && details(item).length > 0" class="nk-contact-picker__details">
                    <span v-for="detail in details(item)" :key="detail.icon" class="nk-contact-picker__detail">
                      <v-icon aria-hidden="true" :icon="detail.icon" size="14" />
                      <span class="nk-contact-picker__detail-text">{{ detail.text }}</span>
                    </span>
                  </span>
                </button>
              </li>
            </ul>
          </section>

          <div v-if="hasMore" class="nk-contact-picker__more">
            <v-btn :loading="loading" prepend-icon="mdi-chevron-down" variant="text" @click="emit('load-more')">
              {{ labels.showMore }}
            </v-btn>
          </div>
        </template>
      </div>
    </template>

    <template v-if="hasFooter" #actions>
      <v-btn v-if="showCreate" class="me-auto" prepend-icon="mdi-plus" variant="tonal" @click="emit('create')">
        {{ labels.create }}
      </v-btn>
      <v-btn v-if="showClear" variant="text" @click="emit('clear')">{{ labels.clear }}</v-btn>
    </template>
  </NkSheet>
</template>

<style scoped>
/* Søkeraden står fast øverst mens listen ruller under: den dekker sheetets
   luft over seg (negativ top = kroppens padding), så ingenting skinner
   gjennom over feltet. */
.nk-contact-picker__toolbar {
  align-items: center;
  background: var(--nk-surface);
  display: flex;
  gap: var(--nk-space-unit);
  margin: calc(var(--nk-space-unit) * -2.5) 0 0;
  padding: calc(var(--nk-space-unit) * 2.5) 0 var(--nk-space-unit);
  position: sticky;
  top: calc(var(--nk-space-unit) * -2.5);
  z-index: 1;
}

.nk-contact-picker__search {
  flex: 1 1 auto;
  min-width: 0;
}

.nk-contact-picker__views {
  border: 1px solid var(--nk-surface-border);
  border-radius: var(--nk-radius-md);
  display: inline-flex;
  flex-shrink: 0;
  overflow: hidden;
}

.nk-contact-picker__view {
  align-items: center;
  background: none;
  border: 0;
  color: var(--nk-text-secondary);
  cursor: pointer;
  display: inline-flex;
  height: calc(var(--nk-space-unit) * 5);
  justify-content: center;
  width: calc(var(--nk-space-unit) * 5);
}

.nk-contact-picker__view--active {
  background: var(--nk-surface-soft-accent);
  color: var(--nk-text-primary);
}

.nk-contact-picker__view:focus-visible,
.nk-contact-picker__item:focus-visible {
  outline: 2px solid rgb(var(--v-theme-primary));
  outline-offset: -2px;
}

/* Fast minstehøyde, så dialogen ikke hopper mens brukeren søker. */
.nk-contact-picker__results {
  display: flex;
  flex-direction: column;
  gap: calc(var(--nk-space-unit) * 2);
  min-height: min(52vh, calc(var(--nk-space-unit) * 55));
}

.nk-contact-picker__loading {
  align-items: center;
  color: var(--nk-text-secondary);
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  font-size: calc(var(--nk-text-body) * 0.875);
  gap: var(--nk-space-unit);
  justify-content: center;
}

.nk-contact-picker__section-title {
  color: var(--nk-text-secondary);
  font-size: calc(var(--nk-text-body) * 0.75);
  font-weight: 700;
  letter-spacing: 0.06em;
  margin: 0 0 var(--nk-space-unit);
  text-transform: uppercase;
}

.nk-contact-picker__items {
  display: flex;
  flex-direction: column;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nk-contact-picker__item {
  background: none;
  border: 0;
  border-radius: var(--nk-radius-md);
  color: var(--nk-text-primary);
  cursor: pointer;
  display: flex;
  flex-direction: column;
  font: inherit;
  gap: calc(var(--nk-space-unit) * 1.5);
  padding: var(--nk-space-unit) calc(var(--nk-space-unit) * 1.5);
  text-align: start;
  width: 100%;
}

.nk-contact-picker__item:hover,
.nk-contact-picker__item--selected {
  background: var(--nk-surface-soft-accent);
}

.nk-contact-picker__identity {
  align-items: center;
  display: flex;
  gap: calc(var(--nk-space-unit) * 1.5);
  min-width: 0;
}

.nk-contact-picker__texts {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
  gap: calc(var(--nk-space-unit) / 4);
  min-width: 0;
}

.nk-contact-picker__name-row {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--nk-space-unit) * 0.75);
}

.nk-contact-picker__name {
  font-size: var(--nk-text-body);
  font-weight: 600;
  overflow-wrap: anywhere;
}

.nk-contact-picker__tag {
  background: var(--nk-muted-soft);
  border-radius: var(--nk-radius-pill);
  color: var(--nk-on-muted-soft);
  font-size: calc(var(--nk-text-body) * 0.72);
  font-weight: 600;
  line-height: 1.5;
  padding: 0 var(--nk-space-unit);
  white-space: nowrap;
}

.nk-contact-picker__sub,
.nk-contact-picker__detail-text {
  color: var(--nk-text-secondary);
  font-size: calc(var(--nk-text-body) * 0.8125);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nk-contact-picker__selected {
  align-items: center;
  color: var(--nk-text-secondary);
  display: inline-flex;
  flex-shrink: 0;
  font-size: calc(var(--nk-text-body) * 0.8125);
  font-weight: 600;
  gap: calc(var(--nk-space-unit) / 2);
}

/* Kortvisningen: samme knapp, lagt i et rutenett med ramme og detaljlinjer. */
.nk-contact-picker__results--cards .nk-contact-picker__items {
  display: grid;
  gap: calc(var(--nk-space-unit) * 1.5);
  grid-template-columns: repeat(auto-fill, minmax(calc(var(--nk-space-unit) * 32), 1fr));
}

.nk-contact-picker__results--cards .nk-contact-picker__item-wrap {
  display: flex;
}

.nk-contact-picker__results--cards .nk-contact-picker__item {
  border: 1px solid var(--nk-surface-border);
  padding: calc(var(--nk-space-unit) * 1.75);
}

.nk-contact-picker__details {
  color: var(--nk-text-secondary);
  display: flex;
  flex-direction: column;
  gap: calc(var(--nk-space-unit) / 2);
  min-width: 0;
}

.nk-contact-picker__detail {
  align-items: center;
  display: flex;
  gap: calc(var(--nk-space-unit) * 0.75);
  min-width: 0;
}

.nk-contact-picker__more {
  display: flex;
  justify-content: center;
}

@media (prefers-reduced-motion: no-preference) {
  .nk-contact-picker__item {
    transition: background-color 120ms ease;
  }
}
</style>
