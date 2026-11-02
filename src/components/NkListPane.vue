<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, useSlots, watch } from 'vue'

import type { NkListPaneLabels } from '../types/NkListPaneLabels'

/**
 * Delt listepanel for liste/detalj-flater (SIGN-1845): listen til venstre,
 * det valgte til høyre. Erstatter app-kopiene av `.panel-head`/
 * `.panel-search`/`.panel-filters` i backoffice, Sign og Time.
 *
 * Hodet er tre rader, og ikke mer:
 * - **Tittelraden**: tittel (`title`), ev. brikker i `#badge` og handlingene
 *   i `#actions` (Ny …) til høyre.
 * - **Søkeraden**: søkefeltet (`v-model:search`), det som settes inn i
 *   `#search-append` (sortering o.l.) og én filterknapp med antall aktive
 *   filtre som åpner `#filters` i en nedtrekksmeny. Filtre ligger aldri som
 *   rekker av nedtrekksfelt i selve hodet.
 * - **Verktøyraden** (`#toolbar`, valgfri): filterbrikker, teller, sortering.
 *
 * Komponenten eier rullingen i listen (`#default`), så hodet kan krympe:
 * når listen rulles, legges tittel- og verktøyraden sammen og bare
 * søkeraden står; rulles listen tilbake til toppen, kommer de igjen.
 * Krympingen skjer bare når listen fortsatt kan rulles etterpå — ellers
 * ville hodet hoppe opp og ned på en liste som knapt er lengre enn flaten.
 * `prefers-reduced-motion` slår av overgangen.
 *
 * `#footer` står fast under listen (sidetall). Appen eier all tekst (i18n),
 * alle filtre og alle handlinger; komponenten eier geometri og toner —
 * kun tokens, ingen egne px.
 */
interface Props {
  title: string
  /** Overskriftsnivået: `h1` når panelet er sidens hovedoverskrift (Sign), ellers `h2`. */
  headingTag?: 'h1' | 'h2' | 'h3'
  /** Søketeksten (`v-model:search`). Uten `searchPlaceholder` vises ikke søkefeltet. */
  search?: string | null
  searchPlaceholder?: string
  /** Ekstra attributter til søkefeltet (autocomplete, data-testid …). */
  searchFieldAttrs?: Record<string, unknown>
  /** Antall aktive filtre — vises som merke på filterknappen. */
  filterCount?: number
  labels?: NkListPaneLabels
  /** Krymp hodet når listen rulles (standard: ja). */
  condense?: boolean
  /** Panelets bredde på brede skjermer; under `md` fyller det alltid bredden. */
  width?: string
}

const props = withDefaults(defineProps<Props>(), {
  headingTag: 'h2',
  search: undefined,
  searchPlaceholder: '',
  searchFieldAttrs: () => ({}),
  filterCount: 0,
  labels: () => ({}),
  condense: true,
  width: '',
})

const emit = defineEmits<{
  'update:search': [value: string]
  /** Brukeren trykket «Nullstill» i filtermenyen. */
  'reset-filters': []
}>()

const slots = useSlots()

const hasSearch = computed(() => props.searchPlaceholder !== '')
const hasFilters = computed(() => Boolean(slots.filters) && (props.labels.filters ?? '') !== '')
const hasSearchRow = computed(() => hasSearch.value || hasFilters.value || Boolean(slots['search-append']))
const hasToolbar = computed(() => Boolean(slots.toolbar))
const showReset = computed(() => props.filterCount > 0 && (props.labels.resetFilters ?? '') !== '')

const filtersOpen = ref(false)

const onSearchInput = (value: string | null): void => {
  emit('update:search', value ?? '')
}

const onResetFilters = (): void => {
  emit('reset-filters')
  filtersOpen.value = false
}

/* --- Krympingen --- */
// Hodet krymper når listen er rullet forbi terskelen, og kommer tilbake
// først når listen står (nesten) på toppen igjen. De to terskelverdiene er
// ulike med vilje: uten gapet ville hodet blafre rundt én rulleposisjon.
const CONDENSE_AT = 48
const EXPAND_AT = 8

const body = ref<HTMLElement | null>(null)
const titleRow = ref<HTMLElement | null>(null)
const toolbarRow = ref<HTMLElement | null>(null)
const condensed = ref(false)

// Hodet kan bare krympe når det finnes en søkerad å stå igjen med — uten
// den ville hele hodet forsvinne.
const canCondense = computed(() => props.condense && hasSearchRow.value)

const collapsibleHeight = (): number =>
  (titleRow.value?.offsetHeight ?? 0) + (toolbarRow.value?.offsetHeight ?? 0)

const evaluate = (): void => {
  const element = body.value

  if (element === null) {
    return
  }

  if (!canCondense.value) {
    condensed.value = false

    return
  }

  const top = element.scrollTop

  if (condensed.value) {
    if (top <= EXPAND_AT) {
      condensed.value = false
    }

    return
  }

  // Krympingen gir listen mer plass, så det som kan rulles blir mindre.
  // Krymp bare når det fortsatt er nok å rulle etterpå — ellers ville
  // rulleposisjonen havne på toppen igjen og hodet komme tilbake av seg selv.
  const remainingAfterCondense = element.scrollHeight - element.clientHeight - collapsibleHeight()

  if (top > CONDENSE_AT && remainingAfterCondense > CONDENSE_AT) {
    condensed.value = true
  }
}

let resizeObserver: ResizeObserver | null = null

onMounted(() => {
  // Når listen blir kortere (filter, færre treff) mens hodet er krympet,
  // flytter nettleseren rulleposisjonen uten alltid å si fra — så vi ser
  // etter når innholdet endrer størrelse.
  if (typeof ResizeObserver !== 'undefined' && body.value !== null) {
    resizeObserver = new ResizeObserver(() => evaluate())
    resizeObserver.observe(body.value)

    const content = body.value.firstElementChild

    if (content !== null) {
      resizeObserver.observe(content)
    }
  }
})

onBeforeUnmount(() => {
  resizeObserver?.disconnect()
  resizeObserver = null
})

watch(canCondense, () => evaluate())

const scrollToTop = (): void => {
  body.value?.scrollTo({ top: 0 })
}

defineExpose({
  /** Rulleelementet i listen — for `IntersectionObserver`-rot o.l. */
  body,
  scrollToTop,
  condensed,
})
</script>

<template>
  <section
    :aria-label="props.title"
    class="nk-list-pane"
    :class="{ 'nk-list-pane--condensed': condensed }"
    :style="props.width !== '' ? { '--nk-list-pane-width': props.width } : undefined"
  >
    <header class="nk-list-pane__head">
      <div ref="titleRow" class="nk-list-pane__collapsible">
        <div class="nk-list-pane__title-row">
          <div class="nk-list-pane__heading">
            <component :is="props.headingTag" class="nk-list-pane__title">{{ props.title }}</component>
            <slot name="badge" />
          </div>
          <div v-if="$slots.actions" class="nk-list-pane__actions">
            <slot name="actions" />
          </div>
        </div>
      </div>

      <div v-if="hasSearchRow" class="nk-list-pane__search-row">
        <v-text-field
          v-if="hasSearch"
          :aria-label="props.searchPlaceholder"
          bg-color="surface-soft"
          class="nk-list-pane__search"
          clearable
          density="compact"
          flat
          hide-details
          :model-value="props.search ?? ''"
          :placeholder="props.searchPlaceholder"
          prepend-inner-icon="mdi-magnify"
          rounded="pill"
          variant="solo"
          v-bind="props.searchFieldAttrs"
          @keydown.esc="onSearchInput('')"
          @update:model-value="onSearchInput"
        />
        <slot name="search-append" />
        <v-menu v-if="hasFilters" v-model="filtersOpen" :close-on-content-click="false" location="bottom end">
          <template #activator="{ props: menuProps }">
            <v-btn
              v-bind="menuProps"
              :aria-label="props.labels.filters"
              class="nk-list-pane__filter-btn"
              :class="{ 'nk-list-pane__filter-btn--active': props.filterCount > 0 }"
              data-testid="nk-list-pane-filters"
              icon
              size="small"
              variant="text"
            >
              <v-badge
                color="primary"
                :content="props.filterCount"
                :model-value="props.filterCount > 0"
                offset-x="-2"
                offset-y="-2"
              >
                <v-icon icon="mdi-filter-variant" />
              </v-badge>
              <v-tooltip activator="parent" location="bottom">{{ props.labels.filters }}</v-tooltip>
            </v-btn>
          </template>
          <v-card :aria-label="props.labels.filters" class="nk-list-pane__filters" role="group">
            <div class="nk-list-pane__filters-body">
              <slot name="filters" :close="() => (filtersOpen = false)" />
            </div>
            <div v-if="showReset" class="nk-list-pane__filters-foot">
              <v-btn data-testid="nk-list-pane-reset" size="small" variant="text" @click="onResetFilters">
                {{ props.labels.resetFilters }}
              </v-btn>
            </div>
          </v-card>
        </v-menu>
      </div>

      <div v-if="hasToolbar" ref="toolbarRow" class="nk-list-pane__collapsible">
        <div class="nk-list-pane__toolbar">
          <slot name="toolbar" />
        </div>
      </div>
    </header>

    <div ref="body" class="nk-list-pane__body" @scroll.passive="evaluate">
      <div class="nk-list-pane__content">
        <slot />
      </div>
    </div>

    <footer v-if="$slots.footer" class="nk-list-pane__footer">
      <slot name="footer" />
    </footer>
  </section>
</template>

<style scoped>
.nk-list-pane {
  --nk-list-pane-width: 332px;
  --nk-list-pane-pad-x: calc(var(--nk-space-unit) * 2.5);

  background: rgb(var(--v-theme-surface));
  border-right: 1px solid var(--nk-surface-border);
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  height: 100%;
  min-width: 0;
  width: var(--nk-list-pane-width);
}

@media (max-width: 959.98px) {
  .nk-list-pane {
    border-right: 0;
    width: 100%;
  }
}

.nk-list-pane__head {
  background: rgb(var(--v-theme-surface));
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
}

/* Radene som krymper: et grid med én rad på 1fr → 0fr animerer høyden
   uten å måtte kjenne den. Innholdet klippes i den indre boksen. */
.nk-list-pane__collapsible {
  display: grid;
  grid-template-rows: 1fr;
  transition:
    grid-template-rows 200ms ease,
    opacity 160ms ease;
}

.nk-list-pane__collapsible > * {
  min-height: 0;
  overflow: hidden;
}

.nk-list-pane--condensed .nk-list-pane__collapsible {
  grid-template-rows: 0fr;
  opacity: 0;
  visibility: hidden;
}

@media (prefers-reduced-motion: reduce) {
  .nk-list-pane__collapsible {
    transition: none;
  }
}

.nk-list-pane__title-row {
  align-items: center;
  display: flex;
  gap: var(--nk-space-unit);
  justify-content: space-between;
  min-height: calc(var(--nk-space-unit) * 4.5);
  padding: calc(var(--nk-space-unit) * 1.75) var(--nk-list-pane-pad-x) calc(var(--nk-space-unit) * 0.75);
}

.nk-list-pane__heading {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--nk-space-unit);
  min-width: 0;
}

.nk-list-pane__title {
  color: var(--nk-text-title);
  font-size: 1.15rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  line-height: 1.3;
  margin: 0;
}

.nk-list-pane__actions {
  align-items: center;
  display: flex;
  flex-shrink: 0;
  gap: calc(var(--nk-space-unit) * 0.75);
}

.nk-list-pane__search-row {
  align-items: center;
  display: flex;
  gap: calc(var(--nk-space-unit) * 0.75);
  padding: calc(var(--nk-space-unit) * 0.75) var(--nk-list-pane-pad-x) calc(var(--nk-space-unit) * 1.25);
}

/* Krympet: søkeraden står alene og får luften tittelraden hadde. */
.nk-list-pane--condensed .nk-list-pane__search-row {
  padding-top: calc(var(--nk-space-unit) * 1.5);
}

.nk-list-pane__search {
  flex: 1;
  min-width: 0;
}

.nk-list-pane__filter-btn {
  color: var(--nk-text-secondary);
  flex-shrink: 0;
}

.nk-list-pane__filter-btn--active {
  color: rgb(var(--v-theme-primary));
}

.nk-list-pane__filters {
  min-width: 18rem;
  padding: 0;
}

.nk-list-pane__filters-body {
  display: flex;
  flex-direction: column;
  gap: calc(var(--nk-space-unit) * 1.5);
  padding: calc(var(--nk-space-unit) * 2) calc(var(--nk-space-unit) * 2) calc(var(--nk-space-unit) * 1.5);
}

.nk-list-pane__filters-foot {
  border-top: 1px solid var(--nk-surface-border);
  display: flex;
  justify-content: flex-end;
  padding: calc(var(--nk-space-unit) * 0.75) var(--nk-space-unit);
}

.nk-list-pane__toolbar {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: calc(var(--nk-space-unit) * 0.75);
  padding: 0 var(--nk-list-pane-pad-x) calc(var(--nk-space-unit) * 1.25);
}

.nk-list-pane__body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
}

.nk-list-pane__content {
  display: flex;
  flex-direction: column;
  min-height: 100%;
}

.nk-list-pane__footer {
  border-top: 1px solid var(--nk-surface-border);
  flex-shrink: 0;
}
</style>
