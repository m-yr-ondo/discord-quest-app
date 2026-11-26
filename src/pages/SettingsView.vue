<script setup lang="ts">
import { appLocalDataDir } from '@tauri-apps/api/path';
import { openPath, openUrl } from '@tauri-apps/plugin-opener';
import { nextTick, useTemplateRef } from 'vue';
import { type Theme, useTheme } from '@/composables/theme';
import SakugaButton from '@/components/SakugaButton.vue';
import SakugaToast from '@/components/SakugaToast.vue';

const GITHUB_REPOSITORY_URL = 'https://github.com/m-yr-ondo/discord-quest-app';
const { theme, setTheme } = useTheme();
const toastRef = useTemplateRef<InstanceType<typeof SakugaToast>>('toastRef');

async function selectTheme(event: Event) {
  const nextTheme = (event.currentTarget as HTMLElement & { value: Theme }).value;
  setTheme(nextTheme);
  if (nextTheme === 'sakuga') {
    await nextTick();
    toastRef.value?.show('Sakuga theme enabled');
  }
}

async function openAppDataFolder() {
  try { await openPath(await appLocalDataDir()); } catch (error) { console.error('Failed to open the app data folder.', error); }
}

async function openRepository() {
  try { await openUrl(GITHUB_REPOSITORY_URL); } catch (error) { console.error('Failed to open the GitHub repository.', error); }
}
</script>

<template>
  <div class="mx-auto max-w-3xl py-6">
    <SakugaToast ref="toastRef" />
    <h1 class="mb-6 text-center text-[30px] font-bold tracking-[-0.02em]">Settings</h1>
    <section class="rounded-[28px] bg-app-panel p-6 shadow-raised">
      <div class="flex items-center gap-3"><h2 class="text-xl font-bold">Appearance</h2><sakuga-tooltip v-if="theme === 'sakuga'" class="appearance-tooltip" text="Sakuga turns on Sakuga controls and their effects." label="About the Sakuga theme">?</sakuga-tooltip></div>
      <div class="mt-5">
        <sakuga-radio v-if="theme === 'sakuga'" label="Application theme" :value="theme" @change="selectTheme">
          <option value="obsidian">Obsidian</option>
          <option value="sakuga">Sakuga</option>
        </sakuga-radio>
        <select v-else :value="theme" class="h-11 rounded-[14px] bg-app-panel px-[18px] text-[13px] font-medium text-app-text shadow-raised-sm outline-none focus-visible:outline-2 focus-visible:outline-app-accent" aria-label="Application theme" @change="selectTheme">
          <option value="obsidian">Obsidian</option>
          <option value="sakuga">Sakuga</option>
        </select>
      </div>
    </section>
    <section class="mt-5 rounded-[28px] bg-app-panel p-6 shadow-raised"><h2 class="text-xl font-bold">Application data</h2><div class="mt-5 flex flex-wrap items-center justify-between gap-4"><div><p class="text-sm font-medium">Data folder</p><p class="text-xs text-app-text-muted">Saved games, chain and local app data live here.</p></div><SakugaButton class="neu-motion neu-convex h-11 rounded-[14px] bg-app-panel px-[18px] text-[13px] font-semibold text-app-accent shadow-raised-sm hover:shadow-raised hover:text-app-accent-hover active:shadow-inset" @click="openAppDataFolder">Open data folder</SakugaButton></div></section>
    <section class="mt-5 flex flex-wrap items-center justify-between gap-4 rounded-[28px] bg-app-panel p-6 shadow-raised"><h2 class="text-xl font-bold">Project</h2><button type="button" class="btn-github" @click="openRepository"><svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true"><path d="M8 1.333a6.667 6.667 0 0 0-2.107 12.992c.333.053.44-.153.44-.333v-1.127c-1.847.4-2.24-.893-2.24-.893-.307-.774-.74-.98-.74-.98-.607-.414.047-.4.047-.4.667.046 1.02.686 1.02.686.58 1.014 1.56.714 1.94.554.06-.434.233-.727.42-.894-1.48-.166-3.033-.74-3.033-3.28 0-.74.253-1.333.686-1.806-.066-.167-.3-.86.067-1.76 0 0 .56-.18 1.833.68a6.61 6.61 0 0 1 3.333 0c1.274-.86 1.834-.68 1.834-.68.366.9.133 1.593.066 1.76.434.473.687 1.066.687 1.806 0 2.547-1.56 3.107-3.047 3.274.24.206.434.613.434 1.233v1.827c0 .18.106.393.446.333A6.667 6.667 0 0 0 8 1.333Z" fill="currentColor"/></svg><span>View on Github</span></button></section>
  </div>
</template>

<style scoped>
.btn-github {
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  border: none;
  transition: all 0.5s cubic-bezier(0.165, 0.84, 0.44, 1);
  border-radius: 100px;
  font-weight: 800;
  place-content: center;
  padding: 0.75rem 1rem;
  font-size: 0.825rem;
  line-height: 1rem;
  background-color: rgba(0, 0, 0, 0.4);
  box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.04), inset 0 0 0 1px rgba(255, 255, 255, 0.04);
  color: #fff;
}

.btn-github:hover {
  box-shadow: inset 0 1px 0 0 rgba(255, 255, 255, 0.08), inset 0 0 0 1px rgba(252, 232, 3, 0.08);
  color: #fce803;
  transform: translateY(-0.25rem);
  background-color: rgba(0, 0, 0, 0.5);
}
</style>
