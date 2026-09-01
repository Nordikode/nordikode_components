<script setup lang="ts">
import { computed } from 'vue'
import IdentityAvatar from './IdentityAvatar.vue'
import type { SharedLocale } from '../types/SharedLocale'

/**
 * Identitetsmenyen (avataren) for Vuetify-appene — én komponent for
 * toppbarer og railene i produktappene, så innholdet er identisk overalt:
 * navn/e-post, «Kontoinnstillinger» (konto-appen), valgfritt «Avslutt»
 * (tilbake til portalen) og «Logg ut».
 *
 * Appen eier bare sesjonen: utlogging går ut som event; kontolenken
 * navigerer selv til konto-appen (`accountBaseUrl` + /settings).
 */
interface Props {
  userName: string
  userEmail?: string | null
  avatarUrl?: string | null
  /** Kun avataren som utløser (railene); ellers pille med navn/e-post. */
  compact?: boolean
  locale?: SharedLocale | string | null
  /** Konto-appens origin (account.nordikode.com) — «Kontoinnstillinger» går til /settings der. */
  accountBaseUrl: string
  /** Valgfritt «Avslutt»-mål (portalen). Uten verdi vises ikke innslaget. */
  exitUrl?: string | null
  /** v-menu-posisjon; railene bruker 'end bottom'. */
  location?: string
  menuMinWidth?: number
  /**
   * 'avatar' (den stille toppbaren, jf. SIGN-94): kun en 36px avatar på
   * inverse-flate som utløser — navn/e-post vises bare inne i menyen.
   */
  variant?: 'default' | 'avatar'
}

const props = withDefaults(defineProps<Props>(), {
  userEmail: null,
  avatarUrl: null,
  compact: false,
  locale: 'en',
  exitUrl: null,
  location: 'bottom end',
  menuMinWidth: 220,
  variant: 'default',
})

const emit = defineEmits<{
  logout: []
}>()

const translations: Record<SharedLocale, { accountSettings: string, exitApp: string, logout: string }> = {
  en: { accountSettings: 'Account settings', exitApp: 'Exit', logout: 'Log out' },
  no: { accountSettings: 'Kontoinnstillinger', exitApp: 'Avslutt', logout: 'Logg ut' },
  sv: { accountSettings: 'Kontoinställningar', exitApp: 'Avsluta', logout: 'Logga ut' },
  fr: { accountSettings: 'Paramètres du compte', exitApp: 'Quitter', logout: 'Se déconnecter' },
  pl: { accountSettings: 'Ustawienia konta', exitApp: 'Zakończ', logout: 'Wyloguj się' },
}

const resolvedLocale = computed<SharedLocale>(() => {
  const candidate = String(props.locale ?? 'en').toLowerCase()
  return candidate in translations ? candidate as SharedLocale : 'en'
})

const labels = computed(() => translations[resolvedLocale.value])

/** Kontoinnstillingene bor i konto-appen — alltid full navigasjon dit. */
const navigateToAccount = (): void => {
  window.location.assign(new URL('/settings', props.accountBaseUrl).toString())
}

const navigateToExit = (): void => {
  if (props.exitUrl) {
    window.location.assign(props.exitUrl)
  }
}
</script>

<template>
  <v-menu :location="location" offset="8">
    <template #activator="{ props: activatorProps }">
      <button
        :aria-label="userName"
        :class="[
          'user-menu-trigger',
          {
            'user-menu-trigger--compact': compact || variant === 'avatar',
            'user-menu-trigger--avatar': variant === 'avatar',
          },
        ]"
        type="button"
        v-bind="activatorProps"
      >
        <IdentityAvatar
          :image-url="avatarUrl"
          :name="userName"
          class="user-avatar"
          :color="variant === 'avatar' ? 'var(--nk-surface-inverse)' : 'primary'"
          :size="variant === 'avatar' ? 36 : 34"
        />
        <span v-if="!compact && variant !== 'avatar'" class="user-meta">
          <span class="user-name">{{ userName }}</span>
          <span v-if="userEmail" class="user-email">{{ userEmail }}</span>
        </span>
      </button>
    </template>

    <v-list class="user-menu-list" density="compact" :min-width="menuMinWidth">
      <v-list-item :subtitle="userEmail ?? undefined" :title="userName" />
      <v-divider class="my-1" />
      <v-list-item prepend-icon="mdi-account-outline" :title="labels.accountSettings" @click="navigateToAccount" />
      <v-list-item v-if="exitUrl" prepend-icon="mdi-exit-to-app" :title="labels.exitApp" @click="navigateToExit" />
      <v-list-item prepend-icon="mdi-logout" :title="labels.logout" @click="emit('logout')" />
    </v-list>
  </v-menu>
</template>

<style scoped>
.user-menu-trigger {
  appearance: none;
  align-items: center;
  background: color-mix(in srgb, rgb(var(--v-theme-surface)) 90%, white 10%);
  border: 1px solid color-mix(in srgb, rgb(var(--v-theme-primary)) 16%, white 84%);
  border-radius: 999px;
  box-shadow: 0 6px 18px color-mix(in srgb, rgb(var(--v-theme-primary)) 12%, transparent);
  cursor: pointer;
  display: inline-flex;
  gap: 10px;
  min-height: 42px;
  padding: 4px 8px 4px 4px;
}

.user-menu-trigger:hover {
  border-color: color-mix(in srgb, rgb(var(--v-theme-primary)) 28%, white 72%);
}

.user-meta {
  display: inline-flex;
  flex-direction: column;
  line-height: 1.1;
  text-align: left;
}

.user-name {
  color: rgb(var(--v-theme-on-surface));
  font-size: 0.86rem;
  font-weight: 600;
}

.user-email {
  color: color-mix(in srgb, rgb(var(--v-theme-on-surface)) 64%, white 36%);
  font-size: 0.74rem;
}

.user-menu-list {
  border: 1px solid color-mix(in srgb, rgb(var(--v-theme-primary)) 16%, white 84%);
  border-radius: 14px;
}

.user-menu-trigger--compact {
  background: transparent;
  border: 0;
  border-radius: 0;
  box-shadow: none;
  min-height: auto;
  padding: 0;
}

.user-menu-trigger--compact .user-avatar {
  border: 0;
  box-shadow: none;
  outline: 0;
}

.user-menu-trigger--compact:hover {
  border-color: transparent;
}

.user-menu-trigger--compact:focus,
.user-menu-trigger--compact:focus-visible,
.user-menu-trigger--compact:active {
  outline: 0;
}

/* Avatar-varianten (den stille toppbaren, SIGN-94): initialene på
   inverse-flaten — identiteten bor inne i menyen, ikke i baren. */
.user-menu-trigger--avatar .user-avatar :deep(.avatar-fallback) {
  color: var(--nk-on-surface-inverse);
  font-size: 0.82rem;
}

.user-menu-trigger--avatar:focus-visible {
  border-radius: 999px;
  outline: 2px solid var(--nk-action-primary);
  outline-offset: 2px;
}

@media (max-width: 1024px) {
  .user-menu-trigger:not(.user-menu-trigger--compact) {
    gap: 8px;
    padding-right: 8px;
  }

  .user-meta {
    display: none;
  }
}
</style>
