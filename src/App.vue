<script setup lang="ts">
import { onMounted, ref, shallowRef } from 'vue';
import { check, type Update } from '@tauri-apps/plugin-updater';
import { relaunch } from '@tauri-apps/plugin-process';
import MainLayout from './components/MainLayout.vue';
import { Pages, useGlobalState } from './composables/app-state';
import HomeView from './pages/HomeView.vue';
import Playground from './pages/Playground.vue';
import SettingsView from './pages/SettingsView.vue';
import UpdatePrompt from './components/UpdatePrompt.vue';

const appState = useGlobalState();
const { page } = appState;
const availableUpdate = shallowRef<Update | null>(null);
const checkingForUpdate = ref(false);
const installingUpdate = ref(false);
const updateProgress = ref<number | null>(null);
const updateContentLength = ref<number | null>(null);
const updateError = ref<string | null>(null);

async function checkForUpdates() {
  if (checkingForUpdate.value || availableUpdate.value) {
    return;
  }

  checkingForUpdate.value = true;
  updateError.value = null;
  try {
    availableUpdate.value = await check();
  } catch (error) {
    console.warn('Unable to check for application updates:', error);
  } finally {
    checkingForUpdate.value = false;
  }
}

async function installUpdate() {
  const update = availableUpdate.value;
  if (!update || installingUpdate.value) {
    return;
  }

  installingUpdate.value = true;
  updateError.value = null;
  updateProgress.value = 0;
  updateContentLength.value = null;

  try {
    let downloaded = 0;
    await update.downloadAndInstall((event) => {
      if (event.event === 'Started') {
        updateProgress.value = 0;
        updateContentLength.value = event.data.contentLength ?? null;
        return;
      }

      if (event.event === 'Progress') {
        downloaded += event.data.chunkLength;
        if (updateContentLength.value) {
          updateProgress.value = Math.min(
            100,
            Math.round((downloaded / updateContentLength.value) * 100),
          );
        }
        return;
      }

      if (event.event === 'Finished') {
        updateProgress.value = 100;
      }
    });

    await relaunch();
  } catch (error) {
    installingUpdate.value = false;
    updateProgress.value = null;
    updateContentLength.value = null;
    updateError.value = error instanceof Error ? error.message : String(error);
  }
}

function dismissUpdate() {
  availableUpdate.value = null;
  updateError.value = null;
}

onMounted(checkForUpdates);

</script>

<template>
  <UpdatePrompt
    v-if="availableUpdate"
    :version="availableUpdate.version"
    :progress="updateProgress"
    :installing="installingUpdate"
    :error="updateError"
    @install="installUpdate"
    @dismiss="dismissUpdate"
  />
  <MainLayout>
    <HomeView v-show="page === Pages.HOME"/>
    <Playground v-show="page === Pages.PLAYGROUND"/>
    <SettingsView v-show="page === Pages.SETTINGS"/>
  </MainLayout>
</template>

<style>
</style>
