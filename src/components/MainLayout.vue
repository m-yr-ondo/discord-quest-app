<script setup lang="ts">
import { Pages, useGlobalState } from '@/composables/app-state';
import IconRustLang from './IconRustLang.vue';
import IconVueJs from './IconVueJs.vue';

const appState = useGlobalState();
const { page, setPage } = appState;

</script>

<template>
<div class="flex flex-col h-dvh overflow-hidden bg-app-bg">
    <header class="bg-app-panel shadow-md">
      <div class="container mx-auto px-4 py-4 flex items-center justify-between">
        <div class="flex items-center space-x-2">
          <img src="/logo.svg" alt="Logo" class="h-8 w-8" />
          <h2 class="text-xl font-bold text-app-text"></h2>
        </div>
        <nav>
          <ul class="flex space-x-6">
            <li>
              <a href="#" 
                class="text-app-text hover:text-app-accent-hover transition-colors"
                :class="{ 'text-app-accent': page === Pages.HOME }"
                @click.prevent="setPage(Pages.HOME)"
              >
                Home
              </a>
            </li> 
            <li>
              <a href="#" 
                class="text-app-text hover:text-app-accent-hover transition-colors"
                :class="{ 'text-app-accent': page === Pages.PLAYGROUND }"
                @click.prevent="setPage(Pages.PLAYGROUND)"
              >
                Playground
              </a>
            </li>
            <li>
              <a href="#" 
                class="text-app-text hover:text-app-accent-hover transition-colors"
                :class="{ 'text-app-accent': page === Pages.SETTINGS }"
                @click.prevent="setPage(Pages.SETTINGS)"
              >
                Settings
              </a>
            </li>
          </ul>
        </nav>
      </div>
    </header>
    
    <main class="flex-grow overflow-y-auto hide-scrollbar">
      <slot></slot>
    </main>
    
    <footer class="bg-app-panel border-t border-app-border mt-auto">
      <div class="container mx-auto px-4 py-4 text-center text-sm text-app-text-muted">
        &copy; 2026
      </div>
    </footer>
  </div>
</template>
