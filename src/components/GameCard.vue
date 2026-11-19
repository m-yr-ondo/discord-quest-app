<script setup lang="ts">
const props = defineProps<{ title: string; description?: string; imageUrl?: string; launchId?: string }>();
const emit = defineEmits(['launch']);
function launchGame() { emit('launch', props.launchId); }
</script>

<template>
  <article class="neu-motion overflow-hidden rounded-[22px] bg-app-panel p-3.5 text-left shadow-raised hover:shadow-raised-sm">
    <div class="flex h-[104px] items-center justify-center overflow-hidden rounded-2xl bg-app-panel shadow-inset">
      <img v-if="imageUrl" :src="imageUrl" :alt="`${title} cover`" class="size-full object-cover" />
      <span v-else class="text-app-decor">No image</span>
    </div>
    <div class="pt-3">
      <h3 class="text-[15px] font-semibold">{{ title }}</h3>
      <p v-if="description" class="mt-1 text-sm text-app-text-muted">{{ description }}</p>
      <button type="button" class="neu-motion neu-convex mt-3 h-11 w-full rounded-[14px] bg-app-panel text-[13px] font-semibold text-app-accent shadow-raised-sm hover:shadow-raised hover:text-app-accent-hover active:shadow-inset" @click="launchGame">Launch</button>
    </div>
  </article>
</template>
