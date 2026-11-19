<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import type { Game } from '@/types/types';
import { getGameInitials } from '@/services/game-artwork';

const props = withDefaults(defineProps<{ game: Pick<Game, 'name' | 'icon_url' | 'cover_image_url'>; variant?: 'icon' | 'cover' }>(), { variant: 'icon' });
const imageFailed = ref(false);
const imageUrl = computed(() => props.variant === 'cover' ? props.game.cover_image_url : props.game.icon_url);
const initials = computed(() => getGameInitials(props.game.name));
watch(imageUrl, () => { imageFailed.value = false; });
</script>

<template>
  <div class="relative shrink-0 overflow-hidden rounded-2xl bg-app-panel shadow-inset" :aria-label="`${game.name} artwork`">
    <img v-if="imageUrl && !imageFailed" :src="imageUrl" :alt="`${game.name} artwork`" class="size-full object-cover" @error="imageFailed = true" />
    <div v-else class="flex size-full min-h-10 min-w-10 items-center justify-center bg-app-panel font-bold tracking-wide text-app-decor" :class="variant === 'cover' ? 'text-4xl' : 'text-lg'">{{ initials }}</div>
  </div>
</template>
