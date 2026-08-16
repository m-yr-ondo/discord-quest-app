<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Game } from '@/types/types';
import { getGameInitials } from '@/services/game-artwork';

const props = withDefaults(defineProps<{
  game: Pick<Game, 'name' | 'icon_url' | 'cover_image_url'>;
  variant?: 'icon' | 'cover';
}>(), {
  variant: 'icon',
});

const imageFailed = ref(false);

const imageUrl = computed(() => props.variant === 'cover'
  ? props.game.cover_image_url
  : props.game.icon_url);

const initials = computed(() => getGameInitials(props.game.name));

watch(imageUrl, () => {
  imageFailed.value = false;
});
</script>

<template>
  <div class="relative overflow-hidden rounded-lg bg-app-panel-hover shrink-0" :aria-label="`${game.name} artwork`">
    <img
      v-if="imageUrl && !imageFailed"
      :src="imageUrl"
      :alt="`${game.name} artwork`"
      class="w-full h-full object-cover"
      @error="imageFailed = true"
    />
    <div
      v-else
      class="w-full h-full min-w-10 min-h-10 flex items-center justify-center bg-gradient-to-br from-app-accent/80 to-app-panel text-white font-bold tracking-wide"
      :class="variant === 'cover' ? 'text-2xl' : 'text-sm'"
    >
      {{ initials }}
    </div>
  </div>
</template>
