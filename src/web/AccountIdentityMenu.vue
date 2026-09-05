<script setup lang="ts">
/**
 * Konto-/avatar-menyen for webflatene — én komponent for nettsiden og
 * konto-appen (tidligere en copy-paste-fork av `AccountMenuCore.vue` i begge
 * repoer). Ren presentasjon: ingen stores, ingen i18n — alt kommer inn som
 * props, og utlogging går ut som et event. Appen eier en tynn adapter.
 *
 * Tema: verts-appens web-designtokens (`--color-*`, `--radius-*`) og
 * aksentkontrakten `--nk-chrome-accent` / `--nk-chrome-accent-ink`.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { webAppIconFor } from './appIcons'

export type AccountMenuService = {
  key: string
  label: string
  url: string
}

export type AccountMenuLabels = {
  /** aria-label på avatar-knappen. */
  menu: string
  /** Overskrift for tjenestelisten. */
  services: string
  /** Skjermleser-tekst for tjenesten brukeren står i. */
  current: string
  logOut: string
}

export type AccountMenuThemeOption = {
  value: string
  label: string
}

/**
 * Tema-seksjonen (SIGN-148): lys/mørk/følg systemet som radiogruppe i
 * menyen. Valgfri — apper uten temavalg utelater propen og ser ingen
 * endring. Verts-appen eier både etikettene og selve temabyttet (emit).
 */
export type AccountMenuTheme = {
  /** Overskrift for tema-seksjonen. */
  label: string
  options: AccountMenuThemeOption[]
  /** Gjeldende valg; matches mot option.value. */
  value: string
}

const props = defineProps<{
  name?: string | null
  email?: string | null
  /** Ferdig oppløst URL — adapteren håndterer relative stier. */
  avatarUrl?: string | null
  services: AccountMenuService[]
  /** Hvilken tjeneste denne appen er; markeres med prikk i listen. */
  currentServiceKey: string
  labels: AccountMenuLabels
  theme?: AccountMenuTheme | null
}>()

const emit = defineEmits<{ logout: []; 'select-theme': [value: string] }>()

function onSelectTheme(value: string) {
  // Menyen holdes åpen så brukeren ser temaet skifte og kan angre valget.
  emit('select-theme', value)
}

const open = ref(false)
const avatarFailed = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const menuEl = ref<HTMLElement | null>(null)

const hasServices = computed(() => props.services.length > 0)

// Samme regel som UserAvatar i appene: de to første ordene.
const initials = computed(() => {
  const parts = (props.name ?? '').trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
})

const LOGOUT_ICON = [
  'M9.5 4.75H6.25A1.5 1.5 0 0 0 4.75 6.25v11.5a1.5 1.5 0 0 0 1.5 1.5H9.5',
  'M15 8.5 18.5 12 15 15.5M18.5 12h-9',
]
const CHEVRON = 'm6 9 6 6 6-6'

function toggle() {
  open.value = !open.value
  if (open.value) void nextTick(() => focusItem(0))
}

function close(returnFocus = false) {
  if (!open.value) return
  open.value = false
  if (returnFocus) trigger.value?.focus()
}

function menuItems(): HTMLElement[] {
  return Array.from(menuEl.value?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [])
}

function focusItem(index: number) {
  const items = menuItems()
  if (items.length === 0) return
  const target = ((index % items.length) + items.length) % items.length
  items[target]?.focus()
}

function onMenuKeydown(event: KeyboardEvent) {
  const items = menuItems()
  const current = items.indexOf(document.activeElement as HTMLElement)

  switch (event.key) {
    case 'ArrowDown':
      event.preventDefault()
      focusItem(current + 1)
      break
    case 'ArrowUp':
      event.preventDefault()
      focusItem(current - 1)
      break
    case 'Home':
      event.preventDefault()
      focusItem(0)
      break
    case 'End':
      event.preventDefault()
      focusItem(items.length - 1)
      break
    case 'Escape':
      event.preventDefault()
      close(true)
      break
    case 'Tab':
      close()
      break
  }
}

function onDocumentPointerDown(event: PointerEvent) {
  if (open.value && root.value && !root.value.contains(event.target as Node)) close()
}

onMounted(() => document.addEventListener('pointerdown', onDocumentPointerDown))
onBeforeUnmount(() => document.removeEventListener('pointerdown', onDocumentPointerDown))

function onLogout() {
  close()
  emit('logout')
}
</script>

<template>
  <div ref="root" class="nk-account">
    <button
      ref="trigger"
      type="button"
      class="nk-account__trigger"
      :aria-label="labels.menu"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="toggle"
    >
      <span class="nk-account__avatar">
        <img
          v-if="avatarUrl && !avatarFailed"
          :src="avatarUrl"
          alt=""
          class="nk-account__avatar-img"
          referrerpolicy="no-referrer"
          @error="avatarFailed = true"
        />
        <span v-else class="nk-account__initials">{{ initials }}</span>
      </span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        class="nk-account__chevron"
        :class="{ 'nk-account__chevron--open': open }"
        aria-hidden="true"
      >
        <path :d="CHEVRON" />
      </svg>
    </button>

    <Transition name="nk-pop">
      <div v-if="open" ref="menuEl" role="menu" class="nk-account__panel" @keydown="onMenuKeydown">
        <div class="nk-account__header">
          <div class="nk-account__header-row">
            <p class="nk-account__name">{{ name }}</p>
            <slot name="badge" />
          </div>
          <p class="nk-account__email">{{ email }}</p>
          <slot name="meta" />
        </div>

        <template v-if="hasServices">
          <p class="nk-account__section-label">{{ labels.services }}</p>
          <a
            v-for="service in services"
            :key="service.key"
            role="menuitem"
            :href="service.url"
            rel="noopener"
            class="nk-account__item"
            :class="{ 'nk-account__item--current': service.key === currentServiceKey }"
            @click="close()"
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              stroke-width="1.6"
              stroke-linecap="round"
              stroke-linejoin="round"
              class="nk-account__item-icon"
              aria-hidden="true"
            >
              <path v-for="(d, index) in webAppIconFor(service.key)" :key="index" :d="d" />
            </svg>
            <span class="nk-account__item-label">{{ service.label }}</span>
            <template v-if="service.key === currentServiceKey">
              <span class="nk-account__dot" aria-hidden="true" />
              <span class="nk-sr-only">{{ labels.current }}</span>
            </template>
          </a>
        </template>

        <!-- Reserverader når tjenestelisten mangler (eldre backend/cachet sesjon). -->
        <slot v-else name="fallback" />

        <template v-if="theme && theme.options.length > 0">
          <p class="nk-account__section-label">{{ theme.label }}</p>
          <div role="group" :aria-label="theme.label" class="nk-account__theme">
            <button
              v-for="option in theme.options"
              :key="option.value"
              type="button"
              role="menuitemradio"
              :aria-checked="option.value === theme.value"
              class="nk-account__item nk-account__theme-option"
              :class="{ 'nk-account__theme-option--active': option.value === theme.value }"
              @click="onSelectTheme(option.value)"
            >
              <span class="nk-account__radio" aria-hidden="true" />
              <span class="nk-account__item-label">{{ option.label }}</span>
            </button>
          </div>
        </template>

        <button type="button" role="menuitem" class="nk-account__item nk-account__logout" @click="onLogout">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.6"
            stroke-linecap="round"
            stroke-linejoin="round"
            class="nk-account__item-icon"
            aria-hidden="true"
          >
            <path v-for="(d, index) in LOGOUT_ICON" :key="index" :d="d" />
          </svg>
          {{ labels.logOut }}
        </button>
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.nk-account {
  position: relative;
}

.nk-account__trigger {
  display: flex;
  align-items: center;
  gap: 0.25rem;
  border: 0;
  border-radius: 9999px;
  background: transparent;
  padding: 0.125rem 0.375rem 0.125rem 0.125rem;
  cursor: pointer;
  transition: background-color 0.15s;
}

.nk-account__trigger:hover {
  background: var(--color-surface-alt);
}


.nk-account__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--nk-chrome-accent, var(--color-ink-tertiary)) 12%, transparent);
  box-shadow: inset 0 0 0 1px var(--color-line);
}

.nk-account__avatar-img {
  height: 100%;
  width: 100%;
  object-fit: cover;
}

.nk-account__initials {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--nk-chrome-accent-ink, var(--nk-chrome-accent, var(--color-ink-secondary)));
}

.nk-account__chevron {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
  color: var(--color-ink-tertiary);
  transition: transform 0.15s;
}

.nk-account__chevron--open {
  transform: rotate(180deg);
}

.nk-account__panel {
  position: absolute;
  inset-inline-end: 0;
  top: 100%;
  z-index: 50;
  margin-top: 0.5rem;
  width: 16rem;
  transform-origin: top right;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-standard);
  background: var(--color-surface-raised);
  padding: 0.375rem;
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
}

.nk-account__header {
  border-bottom: 1px solid var(--color-line);
  padding: 0.625rem 0.75rem;
}

.nk-account__header-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.nk-account__name {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-ink);
}

.nk-account__email {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
  color: var(--color-ink-tertiary);
}

.nk-account__theme-option {
  width: 100%;
  text-align: left;
  border: 0;
  background: transparent;
  cursor: pointer;
}

.nk-account__radio {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
  border-radius: 9999px;
  border: 1.5px solid var(--color-ink-secondary);
}

.nk-account__theme-option--active .nk-account__radio {
  border-color: var(--nk-chrome-accent, var(--color-ink));
  background:
    radial-gradient(circle at center, var(--nk-chrome-accent, var(--color-ink)) 0 45%, transparent 50%);
}

.nk-account__section-label {
  margin: 0;
  padding: 0.5rem 0.75rem 0.125rem;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--color-ink-tertiary);
}

.nk-account__item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.625rem;
  border: 0;
  border-radius: var(--radius-compact);
  background: transparent;
  padding: 0.5rem 0.75rem;
  text-align: start;
  text-decoration: none;
  font-size: 0.875rem;
  font-family: inherit;
  color: var(--color-ink-secondary);
  cursor: pointer;
  outline: none;
  transition: background-color 0.15s, color 0.15s;
}

.nk-account__item:hover,
.nk-account__item:focus-visible {
  background: var(--color-surface-alt);
  color: var(--color-ink);
}


.nk-account__item--current {
  font-weight: 500;
  color: var(--color-ink);
}

.nk-account__item-icon {
  width: 1rem;
  height: 1rem;
  flex-shrink: 0;
}

.nk-account__item-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nk-account__dot {
  width: 0.375rem;
  height: 0.375rem;
  flex-shrink: 0;
  border-radius: 9999px;
  background: var(--nk-chrome-accent, var(--color-ink));
}

.nk-account__logout {
  margin-top: 0.25rem;
  border-top: 1px solid var(--color-line);
  border-radius: 0 0 var(--radius-compact) var(--radius-compact);
  padding-top: 0.625rem;
}

.nk-sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

.nk-pop-enter-active {
  transition: transform 0.1s ease-out, opacity 0.1s ease-out;
}

.nk-pop-leave-active {
  transition: transform 75ms ease-in, opacity 75ms ease-in;
}

.nk-pop-enter-from,
.nk-pop-leave-to {
  transform: scale(0.95);
  opacity: 0;
}

@media (prefers-reduced-motion: reduce) {
  .nk-account__trigger,
  .nk-account__chevron,
  .nk-account__item,
  .nk-pop-enter-active,
  .nk-pop-leave-active {
    transition: none;
  }
}
</style>

<!-- Uscopet med vilje: `:global()` i scoped CSS knekker i pakkas
     LightningCSS-minifisering (selektoren `.dark .x` reduseres til `.dark`).
     Klassenavnene er nk-namespacet, så uscopede regler er trygge. -->
<style>
.dark .nk-account .nk-account__trigger:hover {
  background: var(--color-surface-raised);
}

.dark .nk-account .nk-account__item:hover,
.dark .nk-account .nk-account__item:focus-visible {
  background: color-mix(in srgb, var(--color-surface-alt) 20%, transparent);
}
</style>
