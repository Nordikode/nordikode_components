<script setup lang="ts">
import { computed } from 'vue'
import { initialsOf } from '../initials'

interface Props {
  name: string
  imageUrl?: string | null
  size?: number
  color?: string
}

const props = withDefaults(defineProps<Props>(), {
  imageUrl: null,
  size: 40,
  color: 'primary',
})

// Samme regel som konto- og firmamenyen (SIGN-1668): de to første ordene.
const fallbackInitials = computed(() => initialsOf(props.name))
</script>

<template>
  <v-avatar :color="props.color" :size="props.size">
    <v-img v-if="props.imageUrl" :src="props.imageUrl" cover />
    <span v-else class="avatar-fallback">{{ fallbackInitials }}</span>
  </v-avatar>
</template>

<style scoped>
.avatar-fallback {
  /* Initialen følger temaets on-farge for avatarens fyll (v-avatar setter den),
     så en lys `secondary` gir mørk initial og en mørk `primary` gir lys. */
  color: inherit;
  font-weight: 700;
}
</style>
