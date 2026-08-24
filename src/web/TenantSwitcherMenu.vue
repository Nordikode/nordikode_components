<script setup lang="ts">
/**
 * Firma-menyen for webflatene — viser firmaet brukeren opptrer for (logo fra
 * tenant-innstillingene når den finnes, ellers initialer) og lar brukeren
 * bytte mellom firmaene sine. Samme visuelle språk og meny-mekanikk som
 * AccountIdentityMenu.
 *
 * Ren presentasjon: tenants, valgt id og etiketter kommer som props; et
 * `select`-event går ut når brukeren velger et ANNET firma enn det valgte
 * (klikk på valgt firma lukker bare menyen). Verts-appen eier selve byttet
 * (f.eks. POST /tenant/switch) og synligheten (innlogget + minst ett firma).
 *
 * Tema: verts-appens web-designtokens (`--color-*`, `--radius-*`) og
 * aksentkontrakten `--nk-chrome-accent` / `--nk-chrome-accent-ink`.
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'

export type TenantSwitcherOption = {
  id: string
  name: string
  logoUrl?: string | null
}

export type TenantSwitcherLabels = {
  /** aria-label på trigger-knappen. */
  menu: string
  /** «Aktivt firma»-teksten i panelheaderen og for skjermlesere på prikken. */
  current: string
  /** Overskrift for firmalisten. */
  companies: string
}

const props = defineProps<{
  tenants: TenantSwitcherOption[]
  selectedId: string
  labels: TenantSwitcherLabels
  /** Deaktiverer valgene mens verts-appen utfører et bytte. */
  switching?: boolean
}>()

const emit = defineEmits<{ select: [tenantId: string] }>()

const selected = computed(() => props.tenants.find((tenant) => tenant.id === props.selectedId) ?? null)

// Samme regel som avataren i kontomenyen: de to første ordene.
function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return '?'
  return parts
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('')
}

/** Logoer som feiler å laste faller tilbake til initialer. */
const failedLogos = ref<Set<string>>(new Set())
const logoFailed = (tenant: TenantSwitcherOption) => failedLogos.value.has(tenant.id)
function markLogoFailed(tenant: TenantSwitcherOption) {
  failedLogos.value = new Set(failedLogos.value).add(tenant.id)
}

const CHEVRON = 'm6 9 6 6 6-6'

const open = ref(false)
const root = ref<HTMLElement | null>(null)
const trigger = ref<HTMLButtonElement | null>(null)
const menuEl = ref<HTMLElement | null>(null)

function toggle() {
  open.value = !open.value
  if (open.value) void nextTick(() => focusItem(0))
}

function close(returnFocus = false) {
  if (!open.value) return
  open.value = false
  if (returnFocus) trigger.value?.focus()
}

function choose(tenant: TenantSwitcherOption) {
  close()
  if (tenant.id === props.selectedId || props.switching) return
  emit('select', tenant.id)
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
</script>

<template>
  <div v-if="selected" ref="root" class="nk-tenant">
    <button
      ref="trigger"
      type="button"
      class="nk-tenant__trigger"
      :aria-label="labels.menu"
      :aria-expanded="open"
      aria-haspopup="menu"
      @click="toggle"
    >
      <span class="nk-tenant__avatar">
        <img
          v-if="selected.logoUrl && !logoFailed(selected)"
          :src="selected.logoUrl"
          alt=""
          class="nk-tenant__avatar-img"
          referrerpolicy="no-referrer"
          @error="markLogoFailed(selected)"
        />
        <span v-else class="nk-tenant__initials">{{ initialsOf(selected.name) }}</span>
      </span>
      <svg
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        stroke-width="2"
        stroke-linecap="round"
        class="nk-tenant__chevron"
        :class="{ 'nk-tenant__chevron--open': open }"
        aria-hidden="true"
      >
        <path :d="CHEVRON" />
      </svg>
    </button>

    <Transition name="nk-pop">
      <div v-if="open" ref="menuEl" role="menu" class="nk-tenant__panel" @keydown="onMenuKeydown">
        <div class="nk-tenant__header">
          <p class="nk-tenant__name">{{ selected.name }}</p>
          <p class="nk-tenant__current-label">{{ labels.current }}</p>
        </div>

        <p class="nk-tenant__section-label">{{ labels.companies }}</p>
        <button
          v-for="tenant in tenants"
          :key="tenant.id"
          type="button"
          role="menuitem"
          class="nk-tenant__item"
          :class="{ 'nk-tenant__item--current': tenant.id === selectedId }"
          :disabled="switching"
          @click="choose(tenant)"
        >
          <span class="nk-tenant__item-avatar">
            <img
              v-if="tenant.logoUrl && !logoFailed(tenant)"
              :src="tenant.logoUrl"
              alt=""
              class="nk-tenant__avatar-img"
              referrerpolicy="no-referrer"
              @error="markLogoFailed(tenant)"
            />
            <span v-else class="nk-tenant__item-initials">{{ initialsOf(tenant.name) }}</span>
          </span>
          <span class="nk-tenant__item-label">{{ tenant.name }}</span>
          <template v-if="tenant.id === selectedId">
            <span class="nk-tenant__dot" aria-hidden="true" />
            <span class="nk-sr-only">{{ labels.current }}</span>
          </template>
        </button>

        <!-- Ekstra rader (f.eks. «opprett nytt firma», firma-innstillinger). -->
        <slot name="footer" />
      </div>
    </Transition>
  </div>
</template>

<style scoped>
.nk-tenant {
  position: relative;
}

.nk-tenant__trigger {
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

.nk-tenant__trigger:hover {
  background: var(--color-surface-alt);
}

.nk-tenant__avatar {
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

.nk-tenant__avatar-img {
  height: 100%;
  width: 100%;
  object-fit: cover;
}

.nk-tenant__initials {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--nk-chrome-accent-ink, var(--nk-chrome-accent, var(--color-ink-secondary)));
}

.nk-tenant__chevron {
  width: 0.875rem;
  height: 0.875rem;
  flex-shrink: 0;
  color: var(--color-ink-tertiary);
  transition: transform 0.15s;
}

.nk-tenant__chevron--open {
  transform: rotate(180deg);
}

.nk-tenant__panel {
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

.nk-tenant__header {
  border-bottom: 1px solid var(--color-line);
  padding: 0.625rem 0.75rem;
}

.nk-tenant__name {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--color-ink);
}

.nk-tenant__current-label {
  margin: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-size: 0.75rem;
  color: var(--color-ink-tertiary);
}

.nk-tenant__section-label {
  margin: 0;
  padding: 0.5rem 0.75rem 0.125rem;
  font-size: 0.6875rem;
  font-weight: 500;
  letter-spacing: 0.025em;
  text-transform: uppercase;
  color: var(--color-ink-tertiary);
}

.nk-tenant__item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 0.625rem;
  border: 0;
  border-radius: var(--radius-compact);
  background: transparent;
  padding: 0.5rem 0.75rem;
  text-align: start;
  font-size: 0.875rem;
  font-family: inherit;
  color: var(--color-ink-secondary);
  cursor: pointer;
  outline: none;
  transition: background-color 0.15s, color 0.15s;
}

.nk-tenant__item:hover,
.nk-tenant__item:focus-visible {
  background: var(--color-surface-alt);
  color: var(--color-ink);
}

.nk-tenant__item:disabled {
  cursor: default;
  opacity: 0.6;
}

.nk-tenant__item--current {
  font-weight: 500;
  color: var(--color-ink);
}

.nk-tenant__item-avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  flex-shrink: 0;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 9999px;
  background: color-mix(in srgb, var(--nk-chrome-accent, var(--color-ink-tertiary)) 12%, transparent);
  box-shadow: inset 0 0 0 1px var(--color-line);
}

.nk-tenant__item-initials {
  font-size: 0.625rem;
  font-weight: 600;
  color: var(--nk-chrome-accent-ink, var(--nk-chrome-accent, var(--color-ink-secondary)));
}

.nk-tenant__item-label {
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nk-tenant__dot {
  width: 0.375rem;
  height: 0.375rem;
  flex-shrink: 0;
  border-radius: 9999px;
  background: var(--nk-chrome-accent, var(--color-ink));
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
  .nk-tenant__trigger,
  .nk-tenant__chevron,
  .nk-tenant__item,
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
.dark .nk-tenant .nk-tenant__trigger:hover {
  background: var(--color-surface-raised);
}

.dark .nk-tenant .nk-tenant__item:hover,
.dark .nk-tenant .nk-tenant__item:focus-visible {
  background: color-mix(in srgb, var(--color-surface-alt) 20%, transparent);
}
</style>
