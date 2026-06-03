<script setup lang="ts">
import { computed } from 'vue'

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

const fallbackInitial = computed(() => (props.name?.trim()[0] ?? 'U').toUpperCase())
</script>

<template>
  <v-avatar :color="props.color" :size="props.size">
    <v-img v-if="props.imageUrl" :src="props.imageUrl" cover />
    <span v-else class="avatar-fallback">{{ fallbackInitial }}</span>
  </v-avatar>
</template>

<style scoped>
.avatar-fallback {
  color: #fff;
  font-weight: 700;
}
</style>
