<script setup lang="ts">
/**
 * Seksjonsnavigasjon for plattformappene (company, account, developer —
 * SIGN-656): områdets sider som sidemeny til venstre fra 1280px og opp, og
 * som en rullbar fanerad under sidehodet på smalere skjermer. Én DOM, to
 * layouter — rent CSS, ingen skuff.
 *
 * Punktene kan være lenker (`href`) eller valg (`select`-hendelsen, for
 * seksjoner i samme visning som i kontoinnstillingene). Konsumenter med
 * klient-side ruting (Inertia Link, RouterLink) rendrer lenken selv via
 * `#item`-sloten og gir den klassen `nk-section-nav__link` (+ `--active`),
 * så den får samme stil som pakkas egen.
 *
 * Fargene er web-lagets CSS-var-kontrakt: aktiv markering bruker
 * `--nk-chrome-accent` (appens handlingsfarge) og `--color-surface-alt`.
 */
export type SectionNavItem = {
  key: string
  label: string
  /** Lenke til siden. Utelates for seksjoner som velges i samme visning. */
  href?: string
  /** SVG-path (24×24, som @mdi/js) — valgfritt ikon foran etiketten. */
  icon?: string
  /** Antall-badge (f.eks. ubehandlede). Null/utelatt = ingen. */
  badge?: number | null
}

const props = defineProps<{
  items: SectionNavItem[]
  /** Nøkkelen til aktivt punkt (siden/seksjonen brukeren står i). */
  activeKey?: string | null
  /** Tilgjengelig navn på navigasjonen, f.eks. «Firma» eller «Innstillinger». */
  label: string
}>()

const emit = defineEmits<{ select: [key: string] }>()

function isActive(item: SectionNavItem): boolean {
  return item.key === props.activeKey
}

function select(item: SectionNavItem): void {
  emit('select', item.key)
}
</script>

<template>
  <nav class="nk-section-nav" :aria-label="label">
    <ul class="nk-section-nav__list">
      <li v-for="item in items" :key="item.key" class="nk-section-nav__item">
        <slot name="item" :item="item" :active="isActive(item)" :select="() => select(item)">
          <component
            :is="item.href ? 'a' : 'button'"
            :href="item.href"
            :type="item.href ? undefined : 'button'"
            class="nk-section-nav__link"
            :class="{ 'nk-section-nav__link--active': isActive(item) }"
            :aria-current="isActive(item) ? 'page' : undefined"
            @click="select(item)"
          >
            <svg v-if="item.icon" class="nk-section-nav__icon" viewBox="0 0 24 24" aria-hidden="true">
              <path :d="item.icon" fill="currentColor" />
            </svg>
            <span class="nk-section-nav__label">{{ item.label }}</span>
            <span v-if="item.badge" class="nk-section-nav__badge">{{ item.badge }}</span>
          </component>
        </slot>
      </li>
    </ul>
  </nav>
</template>

<style scoped>
.nk-section-nav {
  min-width: 0;
}

.nk-section-nav__list {
  display: flex;
  gap: 0.125rem;
  list-style: none;
  margin: 0;
  padding: 0;
  /* Smale skjermer: én rullbar rad med faner under sidehodet. */
  overflow-x: auto;
  border-bottom: 1px solid var(--color-line);
  scrollbar-width: none;
}

.nk-section-nav__list::-webkit-scrollbar {
  display: none;
}

.nk-section-nav__item {
  flex-shrink: 0;
}

/* :slotted() dekker lenker konsumentene rendrer selv i #item-sloten. */
.nk-section-nav__link,
:slotted(.nk-section-nav__link) {
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.625rem 0.5rem;
  border: 0;
  border-bottom: 2px solid transparent;
  background: transparent;
  color: var(--color-ink-secondary);
  font: inherit;
  font-size: 0.9rem;
  font-weight: 500;
  line-height: 1.2;
  text-decoration: none;
  white-space: nowrap;
  cursor: pointer;
  transition:
    color 0.15s ease,
    background-color 0.15s ease;
}

.nk-section-nav__link:hover,
.nk-section-nav__link:focus-visible,
:slotted(.nk-section-nav__link:hover),
:slotted(.nk-section-nav__link:focus-visible) {
  color: var(--color-ink);
}

.nk-section-nav__link:focus-visible,
:slotted(.nk-section-nav__link:focus-visible) {
  outline: 2px solid var(--nk-chrome-accent, var(--color-ink));
  outline-offset: 2px;
}

.nk-section-nav__link--active,
:slotted(.nk-section-nav__link--active) {
  border-bottom-color: var(--nk-chrome-accent, var(--color-ink));
  color: var(--color-ink);
  font-weight: 600;
}

.nk-section-nav__icon {
  flex-shrink: 0;
  width: 1.25rem;
  height: 1.25rem;
  opacity: 0.85;
}

.nk-section-nav__label {
  min-width: 0;
}

.nk-section-nav__badge {
  min-width: 1.25rem;
  padding: 0 0.375rem;
  border-radius: 999px;
  background: var(--nk-chrome-badge, var(--color-ink));
  color: var(--nk-chrome-badge-ink, var(--color-surface));
  font-size: 0.7rem;
  font-weight: 700;
  line-height: 1.25rem;
  text-align: center;
}

/* Fra 1280px (Vuetifys lg): sidemeny — vertikal liste, 14rem bred, fast
   under headeren mens innholdet ruller. */
@media (min-width: 1280px) {
  .nk-section-nav {
    position: sticky;
    top: calc(var(--nk-chrome-height, 3.25rem) + 1.5rem);
    flex-shrink: 0;
    width: 14rem;
  }

  .nk-section-nav__list {
    flex-direction: column;
    gap: 0.125rem;
    overflow: visible;
    border-bottom: 0;
  }

  .nk-section-nav__link,
  :slotted(.nk-section-nav__link) {
    display: flex;
    width: 100%;
    padding: 0.5rem 0.75rem;
    border-bottom: 0;
    border-radius: var(--radius-compact);
    white-space: normal;
  }

  .nk-section-nav__link:hover,
  :slotted(.nk-section-nav__link:hover) {
    background: var(--color-surface-alt);
  }

  .nk-section-nav__link--active,
  :slotted(.nk-section-nav__link--active) {
    background: var(--color-surface-alt);
    color: var(--nk-chrome-accent-ink, var(--color-ink));
  }

  .nk-section-nav__label {
    flex: 1;
  }
}
</style>
