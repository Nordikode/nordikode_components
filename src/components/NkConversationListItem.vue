<script setup lang="ts">
import { computed } from 'vue'
import { formatConversationListTime } from '../conversation'

/**
 * Delt rad i en samtaleliste (SIGN-1313): emne, utdrag av siste melding,
 * tid, ulest-merke og plass til et statusmerke.
 *
 * - Bygger på `v-list-item`: `to`, `href`, `active` og klikk sendes rett
 *   videre, så raden er en lenke med egen adresse.
 * - Ulest vises både som tall og som fet tittel — aldri bare som farge.
 * - Appen eier all tekst. `unreadLabel` er det skjermleseren sier om
 *   tallet, f.eks. «2 uleste meldinger».
 */
defineOptions({ inheritAttrs: false })

interface Props {
  title: string
  /** Utdrag av siste melding, på én linje. */
  preview?: string
  /** Hvem eller hva samtalen gjelder, f.eks. «Kari Nordmann · Bakken Bygg AS». */
  meta?: string
  /** Tidspunktet for siste melding som ISO 8601. */
  at?: string
  /** Brukerens UI-språk. Tiden formateres av Intl. */
  locale: string
  /** Tidssonen dagen regnes i. Uten verdi brukes nettleserens. */
  timeZone?: string
  unreadCount?: number
  unreadLabel?: string
}

const props = withDefaults(defineProps<Props>(), {
  preview: '',
  meta: '',
  at: '',
  timeZone: undefined,
  unreadCount: 0,
  unreadLabel: '',
})

const time = computed(() => (props.at === '' ? '' : formatConversationListTime(props.at, props.locale, new Date(), props.timeZone)))
const unread = computed(() => props.unreadCount > 0)
</script>

<template>
  <v-list-item
    v-bind="$attrs"
    class="nk-conversation-item"
    :class="{ 'nk-conversation-item--unread': unread }"
  >
    <div class="nk-conversation-item__head">
      <v-list-item-title class="nk-conversation-item__title">{{ props.title }}</v-list-item-title>
      <time v-if="time !== ''" class="nk-conversation-item__time" :datetime="props.at">{{ time }}</time>
    </div>

    <p v-if="props.meta !== ''" class="nk-conversation-item__meta">{{ props.meta }}</p>

    <div class="nk-conversation-item__body">
      <p class="nk-conversation-item__preview">{{ props.preview }}</p>

      <div class="nk-conversation-item__marks">
        <slot name="status" />
        <span v-if="unread" class="nk-conversation-item__unread">
          <span aria-hidden="true">{{ props.unreadCount }}</span>
          <span class="nk-conversation-item__sr">{{ props.unreadLabel !== '' ? props.unreadLabel : props.unreadCount }}</span>
        </span>
      </div>
    </div>
  </v-list-item>
</template>

<style scoped>
.nk-conversation-item {
  padding-block: calc(var(--nk-space-unit) * 1.5);
}

/* Tittel og tid på første linje, tekstene og merkene på den neste. */
.nk-conversation-item__head,
.nk-conversation-item__body {
  align-items: baseline;
  display: flex;
  gap: calc(var(--nk-space-unit) * 1.5);
  justify-content: space-between;
  min-width: 0;
}

.nk-conversation-item__body {
  align-items: center;
  margin-top: calc(var(--nk-space-unit) * 0.25);
}

.nk-conversation-item__title {
  color: var(--nk-text-primary);
  font-size: var(--nk-text-body);
  font-weight: 500;
  min-width: 0;
}

.nk-conversation-item--unread .nk-conversation-item__title {
  font-weight: 700;
}

/* Én linje hver: listen skal kunne skumleses. */
.nk-conversation-item__meta,
.nk-conversation-item__preview {
  color: var(--nk-text-secondary);
  font-size: calc(var(--nk-text-body) * 0.875);
  line-height: 1.4;
  margin: 0;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.nk-conversation-item--unread .nk-conversation-item__preview {
  color: var(--nk-text-primary);
}

.nk-conversation-item__time {
  color: var(--nk-text-secondary);
  flex: none;
  font-size: var(--nk-text-label);
  font-variant-numeric: tabular-nums;
  white-space: nowrap;
}

.nk-conversation-item__marks {
  align-items: center;
  display: flex;
  flex: none;
  gap: var(--nk-gap-inline);
}

/* Ulest-merket: gold er fargen for «venter på noen» og meldingsvarsler. */
.nk-conversation-item__unread {
  align-items: center;
  background: var(--nk-attention);
  border-radius: var(--nk-radius-pill);
  color: var(--nk-on-attention);
  display: inline-flex;
  font-size: var(--nk-text-label);
  font-variant-numeric: tabular-nums;
  font-weight: 700;
  justify-content: center;
  line-height: 1;
  min-width: calc(var(--nk-space-unit) * 2.75);
  padding: calc(var(--nk-space-unit) * 0.5) calc(var(--nk-space-unit) * 0.75);
}

.nk-conversation-item__sr {
  border: 0;
  clip: rect(0 0 0 0);
  height: 1px;
  margin: -1px;
  overflow: hidden;
  padding: 0;
  position: absolute;
  white-space: nowrap;
  width: 1px;
}
</style>
