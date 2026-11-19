<script setup lang="ts">
import { Pages, useGlobalState } from '@/composables/app-state';

const { page, setPage } = useGlobalState();

const navigation = [
  { page: Pages.HOME, label: 'Home' },
  { page: Pages.GAME_CHAIN, label: 'Game Chain' },
  { page: Pages.PLAYGROUND, label: 'Playground' },
  { page: Pages.SETTINGS, label: 'Settings' },
] as const;
</script>

<template>
  <div class="flex h-dvh flex-col overflow-hidden bg-app-bg font-sans text-app-text">
    <header class="mx-4 mt-4 shrink-0 rounded-[22px] bg-app-panel px-5 py-3.5 shadow-raised">
      <div class="mx-auto flex max-w-[1600px] flex-wrap items-center justify-between gap-4">
        <div class="flex items-center gap-3">
          <div class="grid size-11 place-items-center rounded-[14px] bg-app-panel shadow-inset" aria-hidden="true">
            <svg viewBox="0 0 24 24" class="size-5 text-app-accent" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="m12 3 2.3 5 5.2.5-3.9 3.5 1.1 5.1-4.7-2.7-4.7 2.7 1.1-5.1-3.9-3.5L9.7 8 12 3Z" /></svg>
          </div>
          <h1 class="text-base font-bold tracking-[-0.01em]">Discord Quest App</h1>
        </div>
        <nav aria-label="Primary navigation">
          <ul class="flex flex-wrap justify-end gap-2">
            <li v-for="item in navigation" :key="item.page">
              <button
                type="button"
                class="neu-motion h-11 rounded-[14px] bg-app-panel px-5 text-[13px] font-medium"
                :class="page === item.page ? 'shadow-inset font-semibold text-app-accent' : 'shadow-raised-sm text-app-text-muted hover:shadow-raised hover:text-app-text active:shadow-inset'"
                :aria-current="page === item.page ? 'page' : undefined"
                @click="setPage(item.page)"
              >{{ item.label }}</button>
            </li>
          </ul>
        </nav>
      </div>
    </header>
    <main class="flex-1 overflow-y-auto px-4 pb-4 pt-6 hide-scrollbar"><slot /></main>
    <footer class="shrink-0 px-6 pb-4 text-center text-xs text-app-text-muted">&copy; 2026</footer>
  </div>
</template>
