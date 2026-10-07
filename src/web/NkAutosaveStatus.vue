<script setup lang="ts">
import { computed } from 'vue'
import { mdiCheck } from '@mdi/js'
import type { DraftAutosaveStatus } from './autosave'

/**
 * Statuslinjen for autolagringen (SIGN-971, delt i SIGN-1382): står der
 * Lagre-knappen sto, og sier bare hvor lagringen er — «Lagrer …», «Lagret»
 * eller hva som gikk galt. Tekstene kommer fra appen.
 */

export interface NkAutosaveStatusLabels {
  saving: string
  saved: string
  error: string
}

const props = defineProps<{
  status: DraftAutosaveStatus
  labels: NkAutosaveStatusLabels
  /** Serverens egen melding ved feil; tom = `labels.error`. */
  errorMessage?: string
}>()

const text = computed(() => {
  switch (props.status) {
    case 'pending':
    case 'saving':
      return props.labels.saving
    case 'saved':
      return props.labels.saved
    case 'error':
      return props.errorMessage || props.labels.error
    default:
      return ''
  }
})
</script>

<template>
  <p
    aria-live="polite"
    class="nk-autosave"
    :class="{ 'nk-autosave--error': status === 'error', 'nk-autosave--saved': status === 'saved' }"
    role="status"
  >
    <svg v-if="status === 'saved'" aria-hidden="true" class="nk-autosave__icon" viewBox="0 0 24 24">
      <path :d="mdiCheck" fill="currentColor" />
    </svg>
    {{ text }}
  </p>
</template>

<style scoped>
.nk-autosave {
  align-items: center;
  color: var(--nk-text-secondary, rgba(0, 0, 0, 0.6));
  display: flex;
  font-size: 0.85rem;
  gap: 6px;
  margin: 0;
  min-height: 24px;
}

.nk-autosave--error {
  color: var(--nk-status-error, #b3261e);
}

.nk-autosave__icon {
  flex-shrink: 0;
  height: 16px;
  width: 16px;
}
</style>
