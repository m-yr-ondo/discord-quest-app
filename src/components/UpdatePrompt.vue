<script setup lang="ts">
import SakugaButton from '@/components/SakugaButton.vue';
import SakugaTimerProgress from '@/components/SakugaTimerProgress.vue';

defineProps<{ version: string; progress: number | null; installing: boolean; error: string | null }>();
const emit = defineEmits<{ install: []; dismiss: [] }>();
</script>

<template>
  <section class="mx-auto mt-4 flex w-[calc(100%-2rem)] max-w-5xl flex-col gap-4 rounded-[22px] bg-app-panel p-5 shadow-raised sm:flex-row sm:items-center sm:justify-between">
    <div class="flex items-start gap-3"><span class="mt-1.5 size-2 rounded-full bg-app-accent shadow-[0_0_8px_var(--app-accent)]" aria-hidden="true" /><div><h2 class="font-semibold">Update available</h2><p class="text-sm text-app-text-muted">Version {{ version }} is ready to install.</p><p v-if="error" class="mt-1 text-sm text-app-danger">{{ error }}</p><p v-if="installing && progress !== null" class="mt-2 text-sm text-app-text-muted">Downloading {{ progress }}%</p><SakugaTimerProgress v-if="installing && progress !== null" class="mt-2" :value="progress" label="Update download" fallback-class="h-2.5 w-48 overflow-hidden rounded-[5px] bg-app-panel shadow-inset" fallback-fill-class="block h-full rounded-[5px] bg-app-accent" /></div></div>
    <div class="flex gap-2"><SakugaButton variant="secondary" class="neu-motion h-11 rounded-[14px] bg-app-panel px-[18px] text-[13px] font-medium text-app-text-muted shadow-raised-sm hover:shadow-raised hover:text-app-text active:shadow-inset disabled:opacity-45" :disabled="installing" @click="emit('dismiss')">Later</SakugaButton><SakugaButton class="neu-motion neu-convex h-11 rounded-[14px] bg-app-panel px-[18px] text-[13px] font-semibold text-app-accent shadow-raised-sm hover:shadow-raised hover:text-app-accent-hover active:shadow-inset disabled:opacity-45" :disabled="installing" @click="emit('install')">{{ installing ? 'Installing...' : 'Install update' }}</SakugaButton></div>
  </section>
</template>
