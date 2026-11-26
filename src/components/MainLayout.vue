<script setup lang="ts">
import { Pages, useGlobalState } from '@/composables/app-state';
import { useTheme } from '@/composables/theme';

const { page, setPage } = useGlobalState();
const { theme } = useTheme();

const navigation = [
  { page: Pages.HOME, label: 'Home' },
  { page: Pages.GAME_CHAIN, label: 'Game Chain' },
  { page: Pages.PLAYGROUND, label: 'Playground' },
  { page: Pages.SETTINGS, label: 'Settings' },
] as const;

function selectSakugaTab(event: Event) {
  const nextPage = (event as CustomEvent<{ value: Pages }>).detail.value;
  if (navigation.some((item) => item.page === nextPage)) {
    setPage(nextPage);
  }
}
</script>

<template>
  <div class="flex h-dvh flex-col overflow-hidden bg-app-bg font-sans text-app-text">
    <header class="mx-4 mt-4 shrink-0">
      <div class="mx-auto flex max-w-[1600px] justify-end">
        <nav aria-label="Primary navigation">
          <sakuga-tabs v-if="theme === 'sakuga'" label="Primary navigation" :selected="navigation.findIndex((item) => item.page === page)" @change="selectSakugaTab">
            <option v-for="item in navigation" :key="item.page" :value="item.page">{{ item.label }}</option>
          </sakuga-tabs>
          <ul v-else class="flex flex-wrap justify-end gap-2">
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
