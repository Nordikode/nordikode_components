<script setup lang="ts">
/**
 * Selve app-headeren for webflatene (nettsiden, admin, konto-appen,
 * company-appen …). Menyene (`AccountIdentityMenu`, `TenantSwitcherMenu`,
 * `AppLauncherMenu`, `ThemeToggle`) var delt fra før — denne komponenten
 * deler resten: skallet, merkevaren, navigasjonen og mobilatferden, slik at
 * flatene slutter å sprike i høyde, bredde, z-index og burger-oppførsel.
 *
 * Ren presentasjon: nav-punkter, etiketter og aktiv sti kommer som props;
 * verts-appen komponerer menyene sine i `#menus`-sloten (datakildene er
 * ulike per app) og kan overstyre lenkerendringen per punkt via `#nav-item`
 * (Inertia `Link`, `RouterLink`, …) — default er en vanlig `<a>`.
 *
 * Standardrekkefølgen (dokumentert i design systemet):
 * merkevare (+ produktsymbol/`#brand-suffix`) → tynn skillestrek →
 * firmablokken i `#tenant` (`TenantSwitcherMenu variant="block"`: logo og
 * fullt firmanavn, klikk åpner firmabyttet — SIGN-561) → navigasjon → …
 * → `#actions` → ThemeToggle → NotificationBellMenu → AppLauncherMenu →
 * AccountIdentityMenu → burger. Venstre side sier hvor brukeren er
 * (merkevare, produkt, firma); høyre side er brukerens egne verktøy.
 *
 * Tema: verts-appens web-designtokens (`--color-*`, `--radius-*`) og
 * aksentkontrakten `--nk-chrome-accent` / `--nk-chrome-accent-ink`.
 * z-index styres av `--nk-chrome-z`: pakka setter 50 på `html` (uscopet
 * blokk under), verts-appen overstyrer på `:root`. Ikke stol på fallbacken i
 * `var()` alene — i Chrome 152 ble den til 0, og innhold med `z-index: 0`
 * (kort, knapper) la seg over menypanelene (SIGN-442).
 */
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useSlots, watch } from 'vue'
import BrandWordmark from './BrandWordmark.vue'
import ProductSymbol from './ProductSymbol.vue'
import type { ProductSymbolKey } from './ProductSymbol.vue'

export type AppHeaderNavChild = {
  key: string
  label: string
  href: string
  /** Full sidelast/ekstern lenke — rendres alltid som `<a>`, aldri via `#nav-item`. */
  external?: boolean
  /** Eksplisitt aktiv-overstyring; ellers utledes aktiv av `currentPath`. */
  active?: boolean
}

export type AppHeaderNavItem = AppHeaderNavChild & {
  href?: string
  /** Ett nedtrekksnivå. Punkter med children ignorerer `href`. */
  children?: AppHeaderNavChild[]
}

export type AppHeaderLabels = {
  /** aria-label på `<nav>`-elementet. */
  navigation: string
  /** aria-label på burger-knappen (tilstanden bæres av aria-expanded). */
  menu: string
}

const props = withDefaults(
  defineProps<{
    labels: AppHeaderLabels
    /** Navigasjonspunktene — rendres både som desktop-nav og i burger-skuffen. */
    nav?: AppHeaderNavItem[]
    /** Dit merkevaren lenker. Kan være ekstern (konto-appen → nettsiden). */
    brandHref?: string
    brandLabel?: string
    /**
     * Produktsymbolet foran produktnavnet i `#brand-suffix` (SIGN-614) —
     * pakkas `ProductSymbol`, så alle apper viser sitt symbol fra samme kilde.
     */
    productSymbol?: ProductSymbolKey | null
    /** Innholdsbredde: full uten tak (standard på alle flater, SIGN-620/643), standard 64rem, wide 72rem. */
    width?: 'standard' | 'wide' | 'full'
    /** Aktiv sti for aktiv-markering (f.eks. `location.pathname`). */
    currentPath?: string | null
  }>(),
  {
    nav: () => [],
    brandHref: '/',
    brandLabel: 'Nordikode',
    productSymbol: null,
    width: 'full',
    currentPath: null,
  },
)

function isActive(item: AppHeaderNavChild | AppHeaderNavItem): boolean {
  if (item.active !== undefined) return item.active
  const path = props.currentPath
  const href = item.href
  if (!path || !href) return false
  if (href === '/') return path === '/'
  return path === href || path.startsWith(`${href}/`)
}

function itemActive(item: AppHeaderNavItem): boolean {
  if (item.children?.length) return item.children.some((child) => isActive(child)) || isActive(item)
  return isActive(item)
}

const slots = useSlots()

/* Nedtrekk (desktop): ett åpent om gangen, lukkes utenfor/Escape. */
const openDropdown = ref<string | null>(null)
const navRoot = ref<HTMLElement | null>(null)

function toggleDropdown(key: string) {
  openDropdown.value = openDropdown.value === key ? null : key
}

/* Burger-skuffen (mobil). */
const drawerOpen = ref(false)
const drawerId = 'nk-header-drawer'

function closeAll() {
  openDropdown.value = null
  drawerOpen.value = false
}

function onDocumentPointerDown(event: PointerEvent) {
  if (openDropdown.value && navRoot.value && !navRoot.value.contains(event.target as Node)) {
    openDropdown.value = null
  }
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape' && (openDropdown.value || drawerOpen.value)) closeAll()
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocumentPointerDown)
  document.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocumentPointerDown)
  document.removeEventListener('keydown', onKeydown)
})

// Navigasjon lukker skuff og nedtrekk (SPA-konsumenter navigerer uten sidelast).
watch(
  () => props.currentPath,
  () => void nextTick(closeAll),
)

const rootClass = computed(() => ['nk-header', slots.tenant ? 'nk-header--tenant' : null])

const innerClass = computed(() => [
  'nk-header__inner',
  props.width === 'wide' ? 'nk-header__inner--wide' : null,
  props.width === 'full' ? 'nk-header__inner--full' : null,
])

/** Skuffens flate liste: toppunkter + children (children innrykket). */
const drawerItems = computed(() =>
  props.nav.flatMap((item) => {
    const rows: Array<{ item: AppHeaderNavChild; child: boolean }> = []
    if (item.href && !item.children?.length) rows.push({ item: item as AppHeaderNavChild, child: false })
    for (const child of item.children ?? []) rows.push({ item: child, child: true })
    return rows
  }),
)
</script>

<template>
  <header :class="rootClass">
    <div :class="innerClass">
      <slot name="brand" :close="closeAll">
        <a :href="brandHref" class="nk-header__brand">
          <BrandWordmark variant="mark" class="nk-header__brand-mark" alt="" />
          <span class="nk-header__brand-label">
            {{ brandLabel }}<span v-if="$slots['brand-suffix'] || productSymbol" class="nk-header__brand-suffix">
              <ProductSymbol v-if="productSymbol" :product="productSymbol" class="nk-header__brand-symbol" />
              <slot name="brand-suffix" /></span>
          </span>
        </a>
      </slot>

      <!-- Firmablokken (SIGN-561): hvilket firma brukeren opptrer for, rett
           etter merkevaren og skilt med en tynn strek. Verts-appen legger sin
           TenantSwitcherMenu-adapter her med variant="block". -->
      <template v-if="$slots.tenant">
        <span class="nk-header__divider" aria-hidden="true" />
        <div class="nk-header__tenant">
          <slot name="tenant" />
        </div>
      </template>

      <nav v-if="nav.length > 0" ref="navRoot" class="nk-header__nav" :aria-label="labels.navigation">
        <template v-for="item in nav" :key="item.key">
          <div v-if="item.children?.length" class="nk-header__dropdown">
            <button
              type="button"
              class="nk-header__link nk-header__link--button"
              :class="{ 'nk-header__link--active': itemActive(item) }"
              :aria-expanded="openDropdown === item.key"
              aria-haspopup="true"
              @click="toggleDropdown(item.key)"
            >
              {{ item.label }}
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
                stroke-linecap="round"
                class="nk-header__chevron"
                :class="{ 'nk-header__chevron--open': openDropdown === item.key }"
                aria-hidden="true"
              >
                <path d="m6 9 6 6 6-6" />
              </svg>
            </button>
            <Transition name="nk-pop">
              <div v-if="openDropdown === item.key" class="nk-header__dropdown-panel">
                <template v-for="child in item.children" :key="child.key">
                  <slot
                    v-if="!child.external"
                    name="nav-item"
                    :item="child"
                    :active="isActive(child)"
                    :close="closeAll"
                  >
                    <a
                      :href="child.href"
                      class="nk-header__dropdown-link"
                      :class="{ 'nk-header__dropdown-link--active': isActive(child) }"
                      @click="closeAll"
                    >
                      {{ child.label }}
                    </a>
                  </slot>
                  <a v-else :href="child.href" class="nk-header__dropdown-link" @click="closeAll">
                    {{ child.label }}
                  </a>
                </template>
              </div>
            </Transition>
          </div>

          <template v-else-if="item.href">
            <slot v-if="!item.external" name="nav-item" :item="item" :active="itemActive(item)" :close="closeAll">
              <a
                :href="item.href"
                class="nk-header__link"
                :class="{ 'nk-header__link--active': itemActive(item) }"
              >
                {{ item.label }}
              </a>
            </slot>
            <a v-else :href="item.href" class="nk-header__link">{{ item.label }}</a>
          </template>
        </template>
      </nav>

      <span class="nk-header__spacer" />

      <div class="nk-header__end">
        <slot name="actions" />
        <slot name="menus" />
        <button
          v-if="nav.length > 0"
          type="button"
          class="nk-header__burger"
          :aria-label="labels.menu"
          :aria-expanded="drawerOpen"
          :aria-controls="drawerId"
          @click="drawerOpen = !drawerOpen"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="1.5"
            stroke-linecap="round"
            class="nk-header__burger-icon"
            aria-hidden="true"
          >
            <path v-if="drawerOpen" d="M6 6l12 12M18 6L6 18" />
            <path v-else d="M4 7h16M4 12h16M4 17h16" />
          </svg>
        </button>
      </div>
    </div>

    <div v-if="drawerOpen && nav.length > 0" :id="drawerId" class="nk-header__drawer">
      <template v-for="row in drawerItems" :key="row.item.key">
        <slot
          v-if="!row.item.external"
          name="nav-item"
          :item="row.item"
          :active="isActive(row.item)"
          :close="closeAll"
          :drawer="true"
        >
          <a
            :href="row.item.href"
            class="nk-header__drawer-link"
            :class="{
              'nk-header__drawer-link--child': row.child,
              'nk-header__drawer-link--active': isActive(row.item),
            }"
            @click="closeAll"
          >
            {{ row.item.label }}
          </a>
        </slot>
        <a
          v-else
          :href="row.item.href"
          class="nk-header__drawer-link"
          :class="{ 'nk-header__drawer-link--child': row.child }"
          @click="closeAll"
        >
          {{ row.item.label }}
        </a>
      </template>
    </div>
  </header>
</template>

<style scoped>
.nk-header {
  position: sticky;
  top: 0;
  z-index: var(--nk-chrome-z, 50);
  border-bottom: 1px solid color-mix(in srgb, var(--color-line) 60%, transparent);
  background: color-mix(in srgb, var(--color-surface) 80%, transparent);
  /* Kun standard-egenskapen: LightningCSS slår sammen prefikset+uprefikset
     og lar siste vinne — en manuell -webkit-linje ville strippet denne. */
  backdrop-filter: saturate(180%) blur(20px);
  /* Siste vern (SIGN-537): headeren skal aldri gi siden horisontal scroll. */
  overflow-x: clip;
}

.nk-header__inner {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  height: 3.25rem;
  max-width: 64rem;
  margin-inline: auto;
  padding-inline: 1.25rem;
}

.nk-header__inner--wide {
  max-width: 72rem;
}

.nk-header__inner--full {
  max-width: none;
}

.nk-header__brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  /* Merkevaren er det som krymper på smale skjermer — menyene og burgeren
     er viktigere enn hele navnet (SIGN-537). */
  flex-shrink: 1;
  min-width: 0;
  color: var(--color-ink);
  text-decoration: none;
}

.nk-header__brand-mark {
  height: 1.5rem;
  flex-shrink: 0;
}

/* Merkevaren holder sin bredde når firmablokken står ved siden av — det er
   firmanavnet som trunkeres, ikke «Nordikode». */
.nk-header--tenant .nk-header__brand {
  flex-shrink: 0;
}

.nk-header__divider {
  width: 1px;
  height: 1.25rem;
  flex-shrink: 0;
  margin-inline: -0.25rem;
  background: var(--color-line);
}

/* Blokken tar plassen som er ledig etter menyene og krymper først av alt. */
.nk-header__tenant {
  display: flex;
  align-items: center;
  min-width: 0;
  flex: 0 1 auto;
}

.nk-header__brand-label {
  min-width: 0;
  overflow: hidden;
  font-size: 0.9375rem;
  font-weight: 600;
  white-space: nowrap;
  text-overflow: ellipsis;
}

.nk-header__brand-suffix {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  vertical-align: bottom;
  margin-inline-start: 0.375rem;
  font-weight: 400;
  color: var(--color-ink-tertiary);
}

/* Produktsymbolet (SIGN-614): litt høyere enn versalhøyden slik at det leses
   som et merke foran navnet, ikke som et tegn i det. Tar-delen følger
   blekkfargen (ikke suffiksets dempede tone), merkefargen er fast. */
.nk-header__brand-symbol {
  height: 1.25rem;
  color: var(--color-ink);
}

.nk-header__nav {
  display: none;
  align-items: center;
  gap: 1.25rem;
}

.nk-header__link {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  border: 0;
  background: transparent;
  padding: 0;
  font-family: inherit;
  font-size: 0.875rem;
  color: var(--color-ink-secondary);
  text-decoration: none;
  cursor: pointer;
  transition: color 0.15s;
}

.nk-header__link:hover,
.nk-header__link:focus-visible {
  color: var(--color-ink);
}

.nk-header__link--active {
  color: var(--color-ink);
  font-weight: 500;
}

.nk-header__chevron {
  width: 0.75rem;
  height: 0.75rem;
  color: var(--color-ink-tertiary);
  transition: transform 0.15s;
}

.nk-header__chevron--open {
  transform: rotate(180deg);
}

.nk-header__dropdown {
  position: relative;
}

.nk-header__dropdown-panel {
  position: absolute;
  inset-inline-start: 0;
  top: 100%;
  z-index: 50;
  margin-top: 0.625rem;
  min-width: 11rem;
  transform-origin: top left;
  border: 1px solid var(--color-line);
  border-radius: var(--radius-standard);
  background: var(--color-surface-raised);
  padding: 0.375rem;
  box-shadow:
    0 10px 15px -3px rgb(0 0 0 / 0.1),
    0 4px 6px -4px rgb(0 0 0 / 0.1);
}

.nk-header__dropdown-link {
  display: block;
  border-radius: var(--radius-compact);
  padding: 0.5rem 0.75rem;
  font-size: 0.875rem;
  color: var(--color-ink-secondary);
  text-decoration: none;
  white-space: nowrap;
  transition: background-color 0.15s, color 0.15s;
}

.nk-header__dropdown-link:hover,
.nk-header__dropdown-link:focus-visible {
  background: var(--color-surface-alt);
  color: var(--color-ink);
}

.nk-header__dropdown-link--active {
  color: var(--color-ink);
  font-weight: 500;
}

.nk-header__spacer {
  flex: 1;
}

.nk-header__end {
  display: flex;
  align-items: center;
  gap: 0.375rem;
  flex-shrink: 0;
}

.nk-header__burger {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  flex-shrink: 0;
  border: 0;
  border-radius: 9999px;
  background: transparent;
  color: var(--color-ink-secondary);
  cursor: pointer;
  transition: background-color 0.15s, color 0.15s;
}

.nk-header__burger:hover,
.nk-header__burger:focus-visible {
  background: var(--color-surface-alt);
  color: var(--color-ink);
}

.nk-header__burger-icon {
  width: 1.25rem;
  height: 1.25rem;
}

.nk-header__drawer {
  display: flex;
  flex-direction: column;
  gap: 0.125rem;
  border-top: 1px solid color-mix(in srgb, var(--color-line) 60%, transparent);
  padding: 0.5rem 1.25rem 0.75rem;
  max-height: calc(100dvh - 3.25rem);
  overflow-y: auto;
}

.nk-header__drawer-link {
  display: block;
  border-radius: var(--radius-compact);
  padding: 0.5rem 0.625rem;
  font-size: 0.875rem;
  color: var(--color-ink-secondary);
  text-decoration: none;
  transition: background-color 0.15s, color 0.15s;
}

.nk-header__drawer-link:hover,
.nk-header__drawer-link:focus-visible {
  background: var(--color-surface-alt);
  color: var(--color-ink);
}

.nk-header__drawer-link--child {
  padding-inline-start: 1.5rem;
}

.nk-header__drawer-link--active {
  color: var(--color-ink);
  font-weight: 500;
}

/* Smale mobiler (SIGN-537): tettere rad, suffikset bort, tenant-chipen
   som ikon — så tema, app-velger, firma, konto og burger får plass på 360 px.
   Med firmablokk (SIGN-561) viker også ordet «Nordikode» — merket står, og
   plassen går til firmanavnet, som trunkeres med logoen intakt. */
@media (max-width: 479px) {
  .nk-header__inner {
    gap: 0.75rem;
    padding-inline: 0.75rem;
  }

  .nk-header__brand-suffix,
  .nk-header--tenant .nk-header__brand-label {
    display: none;
  }

  .nk-header--tenant .nk-header__inner {
    gap: 0.5rem;
  }

  .nk-header__divider {
    margin-inline: 0;
  }

  .nk-header__end {
    gap: 0.125rem;
  }
}

@media (min-width: 640px) {
  .nk-header__nav {
    display: flex;
  }

  .nk-header__burger,
  .nk-header__drawer {
    display: none;
  }
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
  .nk-header__link,
  .nk-header__chevron,
  .nk-header__dropdown-link,
  .nk-header__burger,
  .nk-header__drawer-link,
  .nk-pop-enter-active,
  .nk-pop-leave-active {
    transition: none;
  }
}
</style>

<!-- Uscopet med vilje: `:global()` i scoped CSS knekker i pakkas
     LightningCSS-minifisering. Klassenavnene er nk-namespacet. -->
<style>
/* Standardlaget for chromen. `html` (0,0,1) taper for verts-appens `:root`
   (0,1,0) uansett lastrekkefølge, så appene kan overstyre. */
html {
  --nk-chrome-z: 50;
}

.dark .nk-header__burger:hover,
.dark .nk-header__burger:focus-visible {
  background: var(--color-surface-raised);
}

/* Tenant-chipen i #menus viser bare avataren på smale mobiler (SIGN-537);
   navnet står fortsatt øverst i panelet. Firmablokken i #tenant beholder
   navnet trunkert (SIGN-561). Uscopet fordi triggeren er slot-innhold. */
@media (max-width: 479px) {
  .nk-header .nk-tenant__trigger--chip .nk-tenant__trigger-name {
    display: none;
  }

  .nk-header .nk-tenant__trigger--block .nk-tenant__trigger-name {
    max-width: 9rem;
  }
}

.dark .nk-header .nk-tenant__trigger--block:hover {
  background: var(--color-surface-raised);
}

.dark .nk-header__dropdown-link:hover,
.dark .nk-header__dropdown-link:focus-visible,
.dark .nk-header__drawer-link:hover,
.dark .nk-header__drawer-link:focus-visible {
  background: color-mix(in srgb, var(--color-surface-alt) 20%, transparent);
}
</style>
