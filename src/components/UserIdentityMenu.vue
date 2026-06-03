<script setup lang="ts">
import { computed } from 'vue'
import IdentityAvatar from './IdentityAvatar.vue'
import type { SharedLocale } from '../types/SharedLocale'

interface Props {
  userName: string
  userEmail?: string | null
  avatarUrl?: string | null
  compact?: boolean
  locale?: SharedLocale | string | null
  accountBaseUrl: string
  sourceApp?: string | null
  menuMinWidth?: number
}

const props = withDefaults(defineProps<Props>(), {
  userEmail: null,
  avatarUrl: null,
  compact: false,
  locale: 'en',
  sourceApp: null,
  menuMinWidth: 220,
})

const emit = defineEmits<{
  logout: []
}>()

const translations: Record<SharedLocale, { editProfile: string, logout: string }> = {
  en: { editProfile: 'Edit profile', logout: 'Log out' },
  no: { editProfile: 'Rediger profil', logout: 'Logg ut' },
  sv: { editProfile: 'Redigera profil', logout: 'Logga ut' },
  fr: { editProfile: 'Modifier le profil', logout: 'Se déconnecter' },
  pl: { editProfile: 'Edytuj profil', logout: 'Wyloguj się' },
}

const resolvedLocale = computed<SharedLocale>(() => {
  const candidate = String(props.locale ?? 'en').toLowerCase()
  return candidate in translations ? candidate as SharedLocale : 'en'
})

const labels = computed(() => translations[resolvedLocale.value])

const navigateToAccount = (): void => {
  const accountUrl = new URL('/account', props.accountBaseUrl)
  const currentUrl = window.location.href

  if (props.sourceApp) {
    accountUrl.searchParams.set('fromApp', props.sourceApp)
  }

  accountUrl.searchParams.set('returnTo', currentUrl)
  window.location.assign(accountUrl.toString())
}

const handleSelect = (key: 'edit-profile' | 'logout'): void => {
  if (key === 'edit-profile') {
    navigateToAccount()
    return
  }

  emit('logout')
}
</script>

<template>
  <v-menu location="bottom end" offset="8">
    <template #activator="{ props: activatorProps }">
      <button :class="['user-menu-trigger', { 'user-menu-trigger--compact': compact }]" type="button" v-bind="activatorProps">
        <IdentityAvatar :image-url="avatarUrl" :name="userName" color="primary" :size="34" />
        <span v-if="!compact" class="user-meta">
          <span class="user-name">{{ userName }}</span>
          <span v-if="userEmail" class="user-email">{{ userEmail }}</span>
        </span>
      </button>
    </template>

    <v-list class="user-menu-list" density="comfortable" :min-width="menuMinWidth">
      <v-list-item :title="labels.editProfile" @click="handleSelect('edit-profile')" />
      <v-list-item :title="labels.logout" @click="handleSelect('logout')" />
    </v-list>
  </v-menu>
</template>

<style scoped>
.user-menu-trigger {
  align-items: center;
  background: rgba(255, 255, 255, 0.86);
  border: 1px solid rgba(84, 109, 121, 0.18);
  border-radius: 999px;
  cursor: pointer;
  display: inline-flex;
  gap: 10px;
  min-height: 42px;
  padding: 4px 8px 4px 4px;
}

.user-menu-trigger:hover {
  border-color: rgba(42, 96, 114, 0.34);
}

.user-meta {
  display: inline-flex;
  flex-direction: column;
  line-height: 1.1;
  text-align: left;
}

.user-name {
  color: var(--nk-text-primary, #19323f);
  font-size: 0.86rem;
  font-weight: 600;
}

.user-email {
  color: var(--nk-text-secondary, #617680);
  font-size: 0.74rem;
}

.user-menu-list {
  border: 1px solid rgba(84, 109, 121, 0.18);
  border-radius: 14px;
}

.user-menu-trigger--compact {
  border-radius: 999px;
  min-height: 40px;
  padding: 2px;
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
