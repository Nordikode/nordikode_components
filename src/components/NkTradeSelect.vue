<script setup lang="ts">
import { computed, nextTick, ref } from 'vue'
import type { ComponentPublicInstance } from 'vue'
import NkStatusChip from './NkStatusChip.vue'
import type { NkPlatformTradeOption, NkTradeCreateInput, NkTradeDelivery, NkTradeOption } from '../types/NkTrade'
import type { NkTradeSelectLabels } from '../types/NkTradeSelectLabels'

/**
 * Fagvelgeren (SIGN-1481): den ene velgeren overalt et fag velges i Sign.
 *
 * - Listen er firmaets fag (`trades`) i firmaets rekkefølge. Fag som settes
 *   bort får merket `labels.subcontracted`. Arkiverte fag vises ikke, men et
 *   arkivert fag som alt er valgt står med merket `labels.archived`.
 * - Søket treffer navnet og synonymene til plattformfaget det kom fra.
 * - Heter ingen av firmaets fag akkurat det som er skrevet (navn eller
 *   synonym), og appen har gitt
 *   `canManage` og `createTrade`, står «Legg til …» nederst. Treffer teksten
 *   et fag i Nordikodes fagliste (`platformTrades`, navn eller synonym),
 *   legges det til derfra; ellers som eget fag.
 * - Et nytt fag får alltid levering. Velgeren spør rett under feltet, med
 *   mindre flaten alt vet svaret og sender `delivery` (UE-fanen:
 *   `subcontracted`).
 * - `v-model` er fagets nøkkel (eller nøklene med `multiple`). Nøkkelen til
 *   et nytt fag kommer fra `createTrade`; velgeren lager aldri en selv.
 * - Appen eier all tekst (`labels`), listene og opprettelsen. Øvrige
 *   attributter (`density`, `variant`, `hide-details` …) går til
 *   `v-autocomplete`.
 */
interface Props {
  modelValue: string | string[] | null
  trades: NkTradeOption[]
  labels: NkTradeSelectLabels
  /** Nordikodes fagliste på brukerens språk; gjør at «Legg til» kan hente faget derfra. */
  platformTrades?: NkPlatformTradeOption[]
  multiple?: boolean
  /** Rettigheten `core.trades.manage`. Uten den vises ikke «Legg til». */
  canManage?: boolean
  /** Oppretter faget (core `createTenantTrade`) og gir nøkkelen tilbake. */
  createTrade?: (input: NkTradeCreateInput) => Promise<string>
  /** Levering for nye fag når flaten alt vet den; da spør ikke velgeren. */
  delivery?: NkTradeDelivery | null
  hint?: string
  loading?: boolean
  disabled?: boolean
  errorMessages?: string | string[]
}

const props = withDefaults(defineProps<Props>(), {
  platformTrades: () => [],
  multiple: false,
  canManage: false,
  createTrade: undefined,
  delivery: null,
  hint: undefined,
  loading: false,
  disabled: false,
  errorMessages: () => [],
})

defineOptions({ inheritAttrs: false })

const emit = defineEmits<{
  'update:modelValue': [value: string | string[] | null]
}>()

/** Verdien til «Legg til»-raden. Den sendes aldri ut av velgeren. */
const ADD = '\u0000nk-trade-add'

interface Item {
  value: string
  title: string
  trade?: NkTradeOption
}

const search = ref('')
const firstAnswer = ref<ComponentPublicInstance | null>(null)
/** Navnet som venter på svar om levering. */
const asking = ref<string | null>(null)
/** Plattformfaget «Legg til» gjaldt da spørsmålet ble stilt. */
const askingPlatformKey = ref<string | null>(null)
const creating = ref(false)
const createError = ref<string | null>(null)

const normalize = (text: string): string => text.trim().replace(/\s+/g, ' ').toLocaleLowerCase()

const platformByKey = computed(() => new Map(props.platformTrades.map((trade) => [trade.key, trade])))
const tradeByKey = computed(() => new Map(props.trades.map((trade) => [trade.key, trade])))

const searchTermsFor = (trade: NkTradeOption): string[] => {
  const platform = platformByKey.value.get(trade.platformTradeKey ?? trade.key)
  return [trade.name, ...(platform ? [platform.name, ...(platform.synonyms ?? [])] : [])].map(normalize)
}

const query = computed(() => normalize(search.value))

const activeTrades = computed(() => props.trades.filter((trade) => !trade.archived))

const matches = computed(() =>
  query.value === ''
    ? activeTrades.value
    : activeTrades.value.filter((trade) => searchTermsFor(trade).some((term) => term.includes(query.value))),
)

/** Plattformfaget teksten heter akkurat (navn eller synonym), hvis firmaet ikke alt har det. */
const platformMatch = computed<NkPlatformTradeOption | null>(() => {
  if (query.value === '') return null
  const found = props.platformTrades.find((trade) =>
    [trade.name, ...(trade.synonyms ?? [])].some((term) => normalize(term) === query.value),
  )
  if (!found) return null
  const taken = props.trades.some((trade) => (trade.platformTradeKey ?? trade.key) === found.key)
  return taken ? null : found
})

/**
 * «Legg til» vises bare når teksten ikke alt er et av firmaets fag — også
 * et arkivert: ellers ville velgeren bedt core lage et duplikat av et fag
 * som bare er lagt bort.
 */
const canAdd = computed(
  () =>
    props.canManage &&
    props.createTrade !== undefined &&
    query.value !== '' &&
    !props.trades.some((trade) => searchTermsFor(trade).includes(query.value)),
)

const addLabel = computed(() =>
  platformMatch.value ? props.labels.addFromPlatform(platformMatch.value.name) : props.labels.addOwn(search.value.trim()),
)

const items = computed<Item[]>(() => [
  ...matches.value.map((trade) => ({ value: trade.key, title: trade.name, trade })),
  ...(canAdd.value ? [{ value: ADD, title: addLabel.value }] : []),
])

const selectedKeys = computed<string[]>(() => {
  if (props.multiple) return Array.isArray(props.modelValue) ? props.modelValue : []
  return typeof props.modelValue === 'string' && props.modelValue !== '' ? [props.modelValue] : []
})

/** Nøkkelen til et valgt fag; et valgt fag som ikke står i listen (arkivert) kommer som ren streng. */
const keyOf = (item: Item | string): string => (typeof item === 'string' ? item : item.value)

const nameFor = (key: string): string => tradeByKey.value.get(key)?.name ?? key
const isArchived = (key: string): boolean => tradeByKey.value.get(key)?.archived === true
const isSubcontracted = (key: string): boolean => tradeByKey.value.get(key)?.delivery === 'subcontracted'

const shownErrors = computed(() => [
  ...(Array.isArray(props.errorMessages) ? props.errorMessages : [props.errorMessages]).filter((message) => message !== ''),
  ...(createError.value ? [createError.value] : []),
])

const noDataText = computed(() => (props.canManage ? props.labels.noMatch : props.labels.noMatchNoAccess))

function select(key: string) {
  if (props.multiple) {
    const current = selectedKeys.value
    emit('update:modelValue', current.includes(key) ? current : [...current, key])
  } else {
    emit('update:modelValue', key)
  }
}

function remove(key: string) {
  emit('update:modelValue', selectedKeys.value.filter((selected) => selected !== key))
}

function onUpdate(value: string | string[] | null) {
  const values = Array.isArray(value) ? value : value === null ? [] : [value]
  const chosen = values.filter((key) => key !== ADD)
  if (!values.includes(ADD)) {
    emit('update:modelValue', props.multiple ? chosen : (chosen[0] ?? null))
    return
  }
  // Ved flervalg kan en avhuking og «Legg til» komme i samme runde: avhukingen
  // sendes ut først, så den ikke går tapt mens det nye faget lages.
  if (props.multiple && chosen.length !== selectedKeys.value.length) {
    emit('update:modelValue', chosen)
  }
  startAdd()
}

function startAdd() {
  const name = platformMatch.value?.name ?? search.value.trim()
  if (name === '') return
  const platformTradeKey = platformMatch.value?.key ?? null
  createError.value = null
  if (props.delivery) {
    void create(name, platformTradeKey, props.delivery)
    return
  }
  asking.value = name
  askingPlatformKey.value = platformTradeKey
  // Vuetify tømmer søket og lukker menyen ved valg; spørsmålet står under
  // feltet, og fokus går til første svar.
  void nextTick(() => {
    ;(firstAnswer.value?.$el as HTMLElement | undefined)?.focus()
  })
}

async function create(name: string, platformTradeKey: string | null, delivery: NkTradeDelivery) {
  if (!props.createTrade || creating.value) return
  creating.value = true
  try {
    const key = await props.createTrade({ name, platformTradeKey, delivery })
    asking.value = null
    search.value = ''
    select(key)
  } catch {
    createError.value = props.labels.createFailed
  } finally {
    creating.value = false
  }
}

function answer(delivery: NkTradeDelivery) {
  if (asking.value) void create(asking.value, askingPlatformKey.value, delivery)
}

function cancelAsk() {
  asking.value = null
}

function onSearch(value: string | null) {
  search.value = value ?? ''
  // Skriver brukeren noe nytt, gjelder ikke spørsmålet lenger.
  if (search.value.trim() !== '') asking.value = null
}

</script>

<template>
  <div class="nk-trade-select">
    <v-autocomplete
      v-bind="$attrs"
      :model-value="props.multiple ? selectedKeys : (selectedKeys[0] ?? null)"
      :items="items"
      item-title="title"
      item-value="value"
      :search="search"
      :label="props.labels.field"
      :placeholder="props.labels.placeholder"
      :multiple="props.multiple"
      :chips="props.multiple"
      :hint="props.hint"
      :persistent-hint="props.hint !== undefined"
      :loading="props.loading || creating"
      :disabled="props.disabled"
      :error-messages="shownErrors"
      :no-data-text="noDataText"
      no-filter
      @update:model-value="onUpdate"
      @update:search="onSearch"
    >
      <template #item="{ props: itemProps, item }">
        <v-list-item
          v-if="item.value === ADD"
          v-bind="itemProps"
          class="nk-trade-select__add"
          prepend-icon="mdi-plus"
          base-color="primary"
        />
        <v-list-item v-else v-bind="itemProps">
          <template v-if="props.multiple" #prepend="{ isSelected }">
            <v-checkbox-btn :model-value="isSelected" tabindex="-1" density="compact" />
          </template>
          <template v-if="isSubcontracted(item.value)" #append>
            <NkStatusChip :label="props.labels.subcontracted" tone="neutral" size="sm" />
          </template>
        </v-list-item>
      </template>

      <template v-if="props.multiple" #chip="{ item }">
        <v-chip :key="keyOf(item)" size="small" closable @click:close="remove(keyOf(item))">
          {{ nameFor(keyOf(item)) }}
          <NkStatusChip v-if="isArchived(keyOf(item))" class="nk-trade-select__badge" :label="props.labels.archived" tone="neutral" size="sm" />
        </v-chip>
      </template>

      <template v-if="!props.multiple" #selection="{ item }">
        <span class="nk-trade-select__single">
          <span class="nk-trade-select__name">{{ nameFor(keyOf(item)) }}</span>
          <NkStatusChip v-if="isArchived(keyOf(item))" :label="props.labels.archived" tone="neutral" size="sm" />
          <NkStatusChip v-else-if="isSubcontracted(keyOf(item))" :label="props.labels.subcontracted" tone="neutral" size="sm" />
        </span>
      </template>

    </v-autocomplete>
    <div v-if="asking" class="nk-trade-select__ask" role="group" :aria-label="props.labels.deliveryQuestion(asking)">
      <p class="nk-trade-select__question">{{ props.labels.deliveryQuestion(asking) }}</p>
      <div class="nk-trade-select__answers">
        <v-btn ref="firstAnswer" color="primary" variant="flat" size="small" :loading="creating" @click="answer('own')">
          {{ props.labels.deliveryOwn }}
        </v-btn>
        <v-btn variant="outlined" size="small" :disabled="creating" @click="answer('subcontracted')">
          {{ props.labels.deliverySubcontracted }}
        </v-btn>
        <v-btn variant="text" size="small" :disabled="creating" @click="cancelAsk">
          {{ props.labels.cancel }}
        </v-btn>
      </div>
    </div>
  </div>
</template>

<style scoped>
.nk-trade-select__add {
  border-top: 1px solid rgba(var(--v-border-color), var(--v-border-opacity));
  font-weight: 600;
}

.nk-trade-select__single {
  display: inline-flex;
  align-items: center;
  gap: var(--nk-space-unit);
  min-width: 0;
}

.nk-trade-select__name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nk-trade-select__badge {
  margin-inline-start: var(--nk-space-unit);
}

.nk-trade-select__ask {
  display: grid;
  gap: var(--nk-space-unit);
  margin-top: var(--nk-space-unit);
  padding: calc(var(--nk-space-unit) * 1.5) calc(var(--nk-space-unit) * 2);
  border-radius: var(--nk-radius-md);
  background: var(--nk-surface-soft-accent);
}

.nk-trade-select__question {
  margin: 0;
}

.nk-trade-select__answers {
  display: flex;
  flex-wrap: wrap;
  gap: var(--nk-space-unit);
}
</style>
