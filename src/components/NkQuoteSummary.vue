<script setup lang="ts">
import type { NkQuoteLine } from '../licensing/quoteLines'

/**
 * Det server-prisede sammendraget abonnementsflatene deler (SIGN-1790):
 * beløpslinjer (ferdig formatert, hver en verdi fra licensing) og
 * vilkårsrader under. Komponenten viser — den regner og formatterer
 * ingenting selv.
 */
interface Props {
  lines: NkQuoteLine[]
  terms?: string[]
  loading?: boolean
  /** «Beregner prisen …» mens en ny forhåndsvisning hentes. */
  calculatingLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  terms: () => [],
  loading: false,
  calculatingLabel: '',
})
</script>

<template>
  <div class="nk-quote" data-test="quote" aria-live="polite">
    <p v-if="props.loading && props.calculatingLabel !== ''" class="nk-quote__calculating">{{ props.calculatingLabel }}</p>
    <dl v-if="props.lines.length > 0" class="nk-quote__rows">
      <template v-for="line in props.lines" :key="line.key">
        <div v-if="line.divider" class="nk-quote__divider" role="presentation" />
        <div class="nk-quote__row" :class="{ 'nk-quote__row--emphasis': line.emphasis }" :data-line="line.key">
          <dt>{{ line.label }}</dt>
          <dd>{{ line.amount }}</dd>
        </div>
      </template>
    </dl>
    <p v-for="row in props.terms" :key="row" class="nk-quote__term">{{ row }}</p>
  </div>
</template>

<style scoped>
.nk-quote {
  background: var(--nk-surface-soft);
  border-radius: var(--nk-radius-md);
  display: flex;
  flex-direction: column;
  gap: calc(var(--nk-space-unit) * 0.75);
  padding: calc(var(--nk-space-unit) * 2);
}

.nk-quote__calculating,
.nk-quote__term {
  color: var(--nk-text-secondary);
  font-size: calc(var(--nk-text-body) * 0.8);
  margin: 0;
}

.nk-quote__rows {
  display: flex;
  flex-direction: column;
  font-size: calc(var(--nk-text-body) * 0.9);
  gap: calc(var(--nk-space-unit) * 0.75);
  margin: 0;
}

.nk-quote__row {
  display: flex;
  gap: calc(var(--nk-space-unit) * 1.5);
  justify-content: space-between;
}

.nk-quote__row dt {
  color: var(--nk-text-secondary);
}

.nk-quote__row dd {
  font-variant-numeric: tabular-nums;
  margin: 0;
  text-align: end;
}

.nk-quote__row--emphasis dt,
.nk-quote__row--emphasis dd {
  color: var(--nk-text-primary);
  font-weight: 700;
}

.nk-quote__divider {
  border-top: 1px solid var(--nk-surface-border);
  margin: calc(var(--nk-space-unit) * 0.25) 0;
}
</style>
