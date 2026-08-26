<script setup lang="ts">
/**
 * Standard sidehode for webflatene: tilbakelenke → H1 → undertittel, med
 * plass til statuschip (`#badge`) og primærhandlinger (`#actions`). Gir alle
 * sidene samme uttrykk uavhengig av flate (nettsiden, admin, account,
 * company).
 *
 * Reglene komponenten håndhever (fra design systemet):
 * - Én H1 per side — den eies av PageHeader, ikke av layouten.
 * - Tilbakelenken er hierarkisk: den peker alltid ett nivå opp i URL-en,
 *   aldri på nettleserhistorikken. Nivå 1-sider har ingen tilbakelenke.
 * - Ingen breadcrumbs — ett nivå opp + tydelig tittel dekker hierarkiet.
 *
 * SPA-/Inertia-konsumenter kan overstyre lenkerendringen via `#back`-sloten
 * (default er en vanlig `<a>`).
 */
export type PageHeaderBack = {
  href: string
  label: string
}

defineProps<{
  title: string
  subtitle?: string | null
  /** Ett nivå opp i hierarkiet. Utelates på områdets toppnivåsider. */
  back?: PageHeaderBack | null
}>()
</script>

<template>
  <div class="nk-page-header">
    <slot v-if="back" name="back" :back="back">
      <a :href="back.href" class="nk-page-header__back">
        <span aria-hidden="true">←</span>
        {{ back.label }}
      </a>
    </slot>

    <div class="nk-page-header__row">
      <h1 class="nk-page-header__title">
        {{ title }}<span v-if="$slots.badge" class="nk-page-header__badge"><slot name="badge" /></span>
      </h1>
      <div v-if="$slots.actions" class="nk-page-header__actions">
        <slot name="actions" />
      </div>
    </div>

    <p v-if="subtitle" class="nk-page-header__subtitle">{{ subtitle }}</p>
    <slot name="meta" />
  </div>
</template>

<style scoped>
.nk-page-header {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.nk-page-header__back {
  display: inline-flex;
  align-items: center;
  gap: 0.375rem;
  align-self: flex-start;
  font-size: 0.75rem;
  color: var(--color-ink-tertiary);
  text-decoration: none;
  transition: color 0.15s;
}

.nk-page-header__back:hover,
.nk-page-header__back:focus-visible {
  color: var(--color-ink);
}

.nk-page-header__row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
}

.nk-page-header__title {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 600;
  letter-spacing: -0.025em;
  line-height: 1.2;
  color: var(--color-ink);
  text-wrap: balance;
}

.nk-page-header__badge {
  margin-inline-start: 0.625rem;
  display: inline-flex;
  vertical-align: middle;
  font-weight: 400;
  letter-spacing: normal;
}

.nk-page-header__actions {
  display: flex;
  flex-shrink: 0;
  align-items: center;
  gap: 0.5rem;
}

.nk-page-header__subtitle {
  margin: 0;
  font-size: 0.875rem;
  color: var(--color-ink-tertiary);
  max-width: 42rem;
}

@media (min-width: 640px) {
  .nk-page-header__title {
    font-size: 1.875rem;
  }
}

@media (prefers-reduced-motion: reduce) {
  .nk-page-header__back {
    transition: none;
  }
}
</style>
