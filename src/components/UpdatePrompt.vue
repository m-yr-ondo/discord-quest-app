<script setup lang="ts">
defineProps<{ version: string; progress: number | null; installing: boolean; error: string | null }>();
const emit = defineEmits<{ install: []; dismiss: [] }>();
</script>

<template>
  <section class="mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-5xl flex-col gap-4 rounded-[22px] bg-app-panel p-5 shadow-raised sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-start gap-3"><span class="mt-1.5 size-2 rounded-full bg-app-accent shadow-[0_0_8px_var(--app-accent)]" aria-hidden="true" /><div><h2 class="font-semibold">Update available</h2><p class="text-sm text-app-text-muted">Version {{ version }} is ready to install.</p><p v-if="error" class="mt-1 text-sm text-app-danger">{{ error }}</p><p v-if="installing && progress !== null" class="mt-2 text-sm text-app-text-muted">Downloading {{ progress }}%</p><div v-if="installing && progress !== null" class="mt-2 h-2.5 w-48 rounded-[5px] bg-app-panel shadow-inset"><div class="h-full rounded-[5px] bg-app-accent" :style="{ width: `${progress}%` }" /></div></div></div>
    <div class="flex gap-2"><button type="button" class="neu-motion h-11 rounded-[14px] bg-app-panel px-[18px] text-[13px] font-medium text-app-text-muted shadow-raised-sm hover:shadow-raised hover:text-app-text active:shadow-inset disabled:opacity-45" :disabled="installing" @click="emit('dismiss')">Later</button><button type="button" class="neu-motion neu-convex h-11 rounded-[14px] bg-app-panel px-[18px] text-[13px] font-semibold text-app-accent shadow-raised-sm hover:shadow-raised hover:text-app-accent-hover active:shadow-inset disabled:opacity-45" :disabled="installing" @click="emit('install')">{{ installing ? 'Installing...' : 'Install update' }}</button></div>
  </section>
</template>
