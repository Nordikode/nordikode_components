<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useSlots, watch } from 'vue'

import { NK_SEARCH_FIELD_ATTRS } from '../forms/searchFieldAttrs'
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
 * Komponenten eier rullingen i listen (`#default`), så hodet kan krympe
 * (SIGN-1852): når listen rulles, legges verktøyraden sammen og tittelraden
 * strammes — mindre tittel, mindre luft — mens tittelen, tellerne og
 * handlingene blir stående sammen med søkeraden. Brukeren mister aldri hvor
 * hen er eller den viktigste handlingen. Rulles listen tilbake til toppen,
 * åpner hodet seg igjen. Alt som endrer seg (høyde, luft, tittelstørrelse,
 * skillelinjen under hodet) animerer med samme varighet og kurve, så det
 * oppleves som én bevegelse; `prefers-reduced-motion` slår den av.
 * Krympingen skjer bare når listen fortsatt kan rulles etterpå — ellers
 * ville hodet hoppe opp og ned på en liste som knapt er lengre enn flaten.
 *
 * **Liste først** (`listFirst`, SIGN-1888): listen er en egen side og det
 * valgte åpnes på hele flaten, uten listen ved siden av. Da fyller panelet
 * bredden, og med `detailOpen` skjules det helt — men det står montert, så
 * søk, filtre og rulleposisjon er de samme når brukeren kommer tilbake.
 * Rulleposisjonen tas vare på her, siden komponenten eier rullingen.
 * Standard er som før: listen til venstre, det valgte til høyre.
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
  /** Ekstra attributter til søkefeltet (data-testid …) — legges over `NK_SEARCH_FIELD_ATTRS`. */
  searchFieldAttrs?: Record<string, unknown>
  /** Antall aktive filtre — vises som merke på filterknappen. */
  filterCount?: number
  labels?: NkListPaneLabels
  /** Krymp hodet når listen rulles (standard: ja). */
  condense?: boolean
  /** Panelets bredde på brede skjermer; under `md` fyller det alltid bredden. */
  width?: string
  /**
   * Liste først (SIGN-1888): listen er en egen side i full bredde, og det
   * valgte vises alene. Standard er listen til venstre med det valgte ved siden av.
   */
  listFirst?: boolean
  /** Med `listFirst`: noe er valgt, så listen skjules (og beholder rulleposisjonen). */
  detailOpen?: boolean
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
  listFirst: false,
  detailOpen: false,
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

// Hodet kan bare krympe når det finnes en søkerad å samle seg rundt — uten
// den er det bare tittelraden igjen, og den skal stå som den er.
const canCondense = computed(() => props.condense && hasSearchRow.value)

// Hvor mye hodet kan komme til å krympe. Det nøyaktige tallet er verktøyraden
// pluss luften som strammes i de to andre radene — vi bruker med vilje et
// overslag (hele tittelraden i stedet for bare luften): overslaget gjør bare
// at en liste som er marginalt lengre enn flaten lar være å krympe, mens et
// for lavt tall ville gitt et hode som blafrer.
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

/* --- Liste først (SIGN-1888) --- */
// Et skjult element mister rulleposisjonen i noen nettlesere. Den leses
// derfor før panelet skjules (watch kjører før tegningen) og settes tilbake
// når panelet vises igjen.
const hidden = computed(() => props.listFirst && props.detailOpen)
let scrollTopBeforeHide = 0

watch(hidden, (isHidden) => {
  if (isHidden) {
    scrollTopBeforeHide = body.value?.scrollTop ?? 0

    return
  }

  void nextTick(() => {
    if (body.value !== null) {
      body.value.scrollTop = scrollTopBeforeHide
    }

    evaluate()
  })
})

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
    v-show="!hidden"
    :aria-label="props.title"
    class="nk-list-pane"
    :class="{ 'nk-list-pane--condensed': condensed, 'nk-list-pane--list-first': props.listFirst }"
    :style="props.width !== '' ? { '--nk-list-pane-width': props.width } : undefined"
  >
    <header class="nk-list-pane__head">
      <div ref="titleRow" class="nk-list-pane__title-row">
        <div class="nk-list-pane__heading">
          <component :is="props.headingTag" class="nk-list-pane__title">{{ props.title }}</component>
          <slot name="badge" />
        </div>
        <div v-if="$slots.actions" class="nk-list-pane__actions">
          <slot name="actions" />
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
          v-bind="{ ...NK_SEARCH_FIELD_ATTRS, ...props.searchFieldAttrs }"
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
        <div class="nk-list-pane__collapsible-inner">
          <div class="nk-list-pane__toolbar">
            <slot name="toolbar" />
          </div>
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
  /* Én bevegelse for hele hodet: alt som endrer seg ved krymping deler
     varighet og kurve, ellers ser det ut som deler som klippes bort. */
  --nk-list-pane-duration: 280ms;
  --nk-list-pane-motion: var(--nk-list-pane-duration) cubic-bezier(0.2, 0, 0, 1);

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

/* Liste først (SIGN-1888): listen er siden. Den fyller flaten, har ingen
   kant mot noe ved siden av, og får mer luft og større tittel på brede
   skjermer. Søkefeltet holdes i lesbar bredde i stedet for å strekke seg. */
.nk-list-pane--list-first {
  border-right: 0;
  flex: 1 1 auto;
  width: 100%;
}

@media (min-width: 960px) {
  .nk-list-pane--list-first {
    --nk-list-pane-pad-x: calc(var(--nk-space-unit) * 3);
  }

  .nk-list-pane--list-first .nk-list-pane__title {
    font-size: 1.4rem;
  }

  .nk-list-pane--list-first.nk-list-pane--condensed .nk-list-pane__title {
    font-size: var(--nk-text-body);
  }

  .nk-list-pane--list-first .nk-list-pane__search {
    flex: 0 1 calc(var(--nk-space-unit) * 45);
  }
}

.nk-list-pane__head {
  background: rgb(var(--v-theme-surface));
  /* Skillelinjen kommer først når listen ruller under hodet. */
  border-bottom: 1px solid transparent;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  transition: border-color var(--nk-list-pane-motion);
}

.nk-list-pane--condensed .nk-list-pane__head {
  border-bottom-color: var(--nk-surface-border);
}

/* Tittelraden står alltid; krympet strammes luften og tittelen går ned
   til brødtekststørrelse, så raden er like høy som handlingen i den. */
.nk-list-pane__title-row {
  align-items: center;
  display: flex;
  gap: var(--nk-gap-inline);
  justify-content: space-between;
  padding: calc(var(--nk-space-unit) * 2) var(--nk-list-pane-pad-x) var(--nk-space-unit);
  transition: padding var(--nk-list-pane-motion);
}

.nk-list-pane--condensed .nk-list-pane__title-row {
  padding-bottom: calc(var(--nk-space-unit) * 0.5);
  padding-top: var(--nk-space-unit);
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
  transition: font-size var(--nk-list-pane-motion);
}

.nk-list-pane--condensed .nk-list-pane__title {
  font-size: var(--nk-text-body);
}

.nk-list-pane__actions {
  align-items: center;
  display: flex;
  flex-shrink: 0;
  gap: var(--nk-space-unit);
}

.nk-list-pane__search-row {
  align-items: center;
  display: flex;
  gap: var(--nk-space-unit);
  padding: var(--nk-space-unit) var(--nk-list-pane-pad-x) calc(var(--nk-space-unit) * 1.5);
  transition: padding var(--nk-list-pane-motion);
}

.nk-list-pane--condensed .nk-list-pane__search-row {
  padding-bottom: var(--nk-space-unit);
  padding-top: calc(var(--nk-space-unit) * 0.5);
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
  padding: var(--nk-space-unit);
}

/* Verktøyraden er det som legges sammen: et grid med én rad på 1fr → 0fr
   animerer høyden uten å måtte kjenne den, og innholdet glir opp og
   tones ut i samme bevegelse — ikke klippes. Den indre boksen har ingen
   egen luft, så raden blir faktisk 0 høy når den er lagt sammen. */
.nk-list-pane__collapsible {
  display: grid;
  grid-template-rows: 1fr;
  transition: grid-template-rows var(--nk-list-pane-motion);
}

.nk-list-pane__collapsible-inner {
  min-height: 0;
  overflow: hidden;
}

.nk-list-pane__toolbar {
  align-items: center;
  display: flex;
  flex-wrap: wrap;
  gap: var(--nk-space-unit);
  padding: 0 var(--nk-list-pane-pad-x) calc(var(--nk-space-unit) * 1.5);
  transition:
    opacity var(--nk-list-pane-motion),
    transform var(--nk-list-pane-motion),
    visibility 0s linear 0s;
}

.nk-list-pane--condensed .nk-list-pane__collapsible {
  grid-template-rows: 0fr;
}

.nk-list-pane--condensed .nk-list-pane__toolbar {
  opacity: 0;
  transform: translateY(calc(var(--nk-space-unit) * -1));
  /* Skjules for tastatur og skjermleser først når bevegelsen er ferdig. */
  transition-delay: 0s, 0s, var(--nk-list-pane-duration);
  visibility: hidden;
}

@media (prefers-reduced-motion: reduce) {
  .nk-list-pane {
    --nk-list-pane-duration: 0s;
  }
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
