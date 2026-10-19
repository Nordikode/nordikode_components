<script setup lang="ts">
import type { NkInvoiceRow, NkInvoiceTableLabels } from '../types/NkLicensingLabels'
import NkStatusChip from './NkStatusChip.vue'

/**
 * Fakturatabellen (SIGN-1790): nummer, dato, status (chip + forfall for
 * ubetalte), total og PDF-lenke. Radene kommer ferdig formatert fra appen
 * (dato, beløp, status i brukerens språk); tabellen eier bare utformingen.
 * Ligger rett i innholdsflaten med egen ramme — aldri i kort.
 */
interface Props {
  invoices: NkInvoiceRow[]
  labels: NkInvoiceTableLabels
  /** Fakturaen som hentes akkurat nå (knappen viser lasting). */
  busyId?: string | null
}

const props = withDefaults(defineProps<Props>(), { busyId: null })

/** Rader uten lenke (`pdfHref` null) kan be eieren hente PDF-en: `download`. */
const emit = defineEmits<{ download: [invoice: NkInvoiceRow] }>()
</script>

<template>
  <p v-if="props.invoices.length === 0" class="nk-invoice-table__empty">{{ props.labels.empty }}</p>

  <div v-else class="nk-invoice-table">
    <v-table density="comfortable">
      <thead>
        <tr>
          <th>{{ props.labels.number }}</th>
          <th>{{ props.labels.date }}</th>
          <th>{{ props.labels.status }}</th>
          <th class="text-right">{{ props.labels.total }}</th>
          <th><span class="nk-invoice-table__sr-only">{{ props.labels.pdf }}</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="invoice in props.invoices" :key="invoice.id" data-test="invoice">
          <td class="nk-invoice-table__number">{{ invoice.number }}</td>
          <td class="nk-invoice-table__muted">{{ invoice.dateLabel }}</td>
          <td>
            <NkStatusChip size="sm" :tone="invoice.statusTone" :label="invoice.statusLabel" />
            <span v-if="invoice.dueLabel" class="nk-invoice-table__due">{{ invoice.dueLabel }}</span>
          </td>
          <td class="text-right nk-invoice-table__amount">{{ invoice.totalLabel }}</td>
          <td class="text-right">
            <a v-if="invoice.pdfHref" class="nk-invoice-table__pdf" :href="invoice.pdfHref" rel="noopener noreferrer" target="_blank">
              {{ props.labels.pdf }}
            </a>
            <v-btn
              v-else-if="invoice.downloadable"
              class="nk-invoice-table__pdf"
              data-test="invoice-pdf"
              :disabled="props.busyId !== null"
              :loading="props.busyId === invoice.id"
              size="small"
              variant="text"
              @click="emit('download', invoice)"
            >
              {{ props.labels.pdf }}
            </v-btn>
          </td>
        </tr>
      </tbody>
    </v-table>
  </div>
</template>

<style scoped>
.nk-invoice-table__empty {
  color: var(--nk-text-secondary);
  font-size: calc(var(--nk-text-body) * 0.9);
  margin: 0;
}

/* Rammen er posisjonert: skjermleser-teksten i cellene hører til rammens
   rulleflate og gjør ikke hele siden bredere enn skjermen (SIGN-1187). */
.nk-invoice-table {
  border: 1px solid var(--nk-surface-border);
  border-radius: var(--nk-radius-md);
  overflow-x: auto;
  position: relative;
}

.nk-invoice-table__number {
  font-weight: 500;
}

.nk-invoice-table__muted {
  color: var(--nk-text-secondary);
}

.nk-invoice-table__due {
  color: var(--nk-text-secondary);
  font-size: calc(var(--nk-text-body) * 0.78);
  margin-inline-start: var(--nk-space-unit);
}

.nk-invoice-table__amount {
  font-variant-numeric: tabular-nums;
}

.nk-invoice-table__pdf {
  color: var(--nk-link);
  font-size: calc(var(--nk-text-body) * 0.8);
}

.nk-invoice-table__sr-only {
  clip: rect(0 0 0 0);
  height: 1px;
  overflow: hidden;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}
</style>
