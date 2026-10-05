<script setup lang="ts">
import { computed, getCurrentInstance, nextTick, onBeforeUnmount, ref, useAttrs, useId, watch } from 'vue'

/**
 * Felles dialog-wrapper (SIGN-846): `v-dialog` med tilgjengelig navn ut av
 * boksen. Vuetify gir `role="dialog"`, `aria-modal`, fokusfelle og Esc, men
 * kobler ikke dialogen til tittelen sin — skjermlesere leser da bare
 * «dialog» (WCAG 4.1.2, funn B6 i SIGN-21). NkDialog gjør koblingen selv:
 *
 * - **Navn:** dialogen pekes mot den synlige tittelen med `aria-labelledby`.
 *   Tittelen er elementet merket `data-nk-dialog-title`, ellers den første
 *   overskriften i innholdet (`h1`–`h6`, `role="heading"`, `v-card-title`,
 *   `v-toolbar-title`). Mangler tittelen `id`, får den en. En dialog uten
 *   synlig tittel (bildevisning, datovelger) får navnet sitt med
 *   `aria-label`. Finnes ingen av delene, sier konsollen fra.
 * - **Beskrivelse:** et element merket `data-nk-dialog-description`
 *   (ingressen) kobles med `aria-describedby`.
 * - **Fokusretur:** når dialogen lukkes, går fokus tilbake til elementet som
 *   hadde det da den åpnet. Vuetify gjør det bare for dialoger med
 *   `activator`; de fleste av våre styres med `v-model`.
 *
 * Alt annet er `v-dialog`: props, hendelser og slots sendes rett videre, og
 * innholdet er appens eget — wrapperen har ingen egen flate og ingen stil.
 * `aria-label`, `aria-labelledby` og `aria-describedby` satt av eieren vinner
 * alltid over det wrapperen finner selv.
 */
defineOptions({ inheritAttrs: false })

interface Props {
  /** v-model. Uten v-model styrer dialogen seg selv (f.eks. med `#activator`). */
  modelValue?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  modelValue: undefined,
})

const emit = defineEmits<{
  'update:modelValue': [value: boolean]
}>()

interface DialogHandle {
  contentEl?: HTMLElement | null
  activatorEl?: HTMLElement | null
}

const TITLE_MARKER = '[data-nk-dialog-title]'
const DESCRIPTION_MARKER = '[data-nk-dialog-description]'
const HEADINGS = 'h1, h2, h3, h4, h5, h6, [role="heading"], .v-card-title, .v-toolbar-title'

const attrs = useAttrs()
const uid = useId()
const dialog = ref<DialogHandle | null>(null)
const internalOpen = ref(false)
const isOpen = computed(() => props.modelValue ?? internalOpen.value)

const titleId = ref<string>()
const descriptionId = ref<string>()

const given = (name: string) => {
  const value = attrs[name]
  return typeof value === 'string' && value !== '' ? value : undefined
}

// Vuetify setter eierens scope-id på den teleporterte overlayen ut fra hvem
// som rendret `v-dialog`. Det er nå denne wrapperen, så eierens scope-id
// (som ligger på wrapperens vnode) sendes videre — ellers treffer ikke
// eierens `scoped`-stiler dialogen lenger.
const scopeId = getCurrentInstance()?.vnode.scopeId
const scopeAttrs = scopeId ? { [scopeId]: '' } : {}

const dialogAttrs = computed(() => ({
  ...scopeAttrs,
  ...attrs,
  'aria-labelledby': given('aria-labelledby') ?? (given('aria-label') ? undefined : titleId.value),
  'aria-describedby': given('aria-describedby') ?? descriptionId.value,
}))

const ensureId = (element: Element, fallback: string) => {
  if (!element.id) element.id = fallback
  return element.id
}

let warned = false

/** Leser tittel og ingress ut av innholdet slik det står akkurat nå. */
const syncNames = () => {
  const content = dialog.value?.contentEl
  if (!content) return

  const title = content.querySelector(TITLE_MARKER) ?? content.querySelector(HEADINGS)
  titleId.value = title ? ensureId(title, `nk-dialog-title-${uid}`) : undefined

  const description = content.querySelector(DESCRIPTION_MARKER)
  descriptionId.value = description ? ensureId(description, `nk-dialog-description-${uid}`) : undefined

  if (!title && !warned && !given('aria-label') && !given('aria-labelledby') && content.childElementCount > 0) {
    warned = true
    console.warn(
      '[NkDialog] Dialogen har ikke noe tilgjengelig navn. Merk tittelen med data-nk-dialog-title, bruk en overskrift, eller sett aria-label.',
    )
  }
}

// Innholdet kan bytte mens dialogen er åpen (steg, lasting, v-if på
// tittelen), så navnet følger DOM-en så lenge den står åpen.
let observer: MutationObserver | null = null
const stopObserving = () => {
  observer?.disconnect()
  observer = null
}

watch(
  () => (isOpen.value ? (dialog.value?.contentEl ?? null) : null),
  (content) => {
    stopObserving()
    if (!content) return
    syncNames()
    if (typeof MutationObserver === 'undefined') return
    observer = new MutationObserver(syncNames)
    observer.observe(content, { childList: true, subtree: true })
  },
  { flush: 'post', immediate: true },
)

// Fokusretur. Elementet som har fokus i det dialogen åpnes, huskes før
// Vuetify flytter fokus inn i dialogen.
let opener: HTMLElement | null = null
const activeElement = () => (typeof document === 'undefined' ? null : (document.activeElement as HTMLElement | null))

const restoreFocus = () => {
  const target = opener
  opener = null
  // Dialoger med activator får fokus tilbake av Vuetify.
  if (dialog.value?.activatorEl || !target?.isConnected) return
  // Har eieren alt flyttet fokus et annet sted, blir det stående der.
  const active = activeElement()
  const content = dialog.value?.contentEl
  if (active && active !== document.body && active !== target && !content?.contains(active)) return
  target.focus({ preventScroll: true })
}

watch(
  isOpen,
  (open) => {
    if (open) {
      const active = activeElement()
      opener = active && active !== document.body ? active : null
      return
    }
    void nextTick(restoreFocus)
  },
  { flush: 'sync', immediate: true },
)

onBeforeUnmount(() => {
  stopObserving()
  if (!isOpen.value) return
  // Dialogen fjernes mens den står åpen (v-if hos eieren): fokus skal
  // likevel tilbake når innholdet er borte.
  const target = opener
  opener = null
  void nextTick(() => {
    const active = activeElement()
    if (target?.isConnected && (!active || active === document.body)) target.focus({ preventScroll: true })
  })
})

const onUpdate = (value: boolean) => {
  internalOpen.value = value
  emit('update:modelValue', value)
}

/** Lukker dialogen — også tilgjengelig i standard-slotten som `close`. */
const close = () => onUpdate(false)

defineExpose({ close, syncNames })
</script>

<template>
  <v-dialog ref="dialog" v-bind="dialogAttrs" :model-value="isOpen" @after-enter="syncNames" @update:model-value="onUpdate">
    <template v-if="$slots.activator" #activator="slotProps">
      <slot name="activator" v-bind="slotProps" />
    </template>
    <template #default="slotProps">
      <slot v-bind="slotProps" :close="close" />
    </template>
  </v-dialog>
</template>
