<script setup lang="ts">
import { useGlobalState } from '@/composables/app-state';
import type { Theme } from '@/services/settings';

const { theme, setTheme } = useGlobalState();

function handleThemeChange(newTheme: Theme) {
  setTheme(newTheme);
}
</script>

<template>
  <div class="container mx-auto px-4 py-8 max-w-2xl">
    <h1 class="text-3xl font-bold text-app-text mb-6 text-center">
      Settings
    </h1>

    <div class="bg-app-panel p-6 rounded-lg shadow">
      <h2 class="text-xl font-semibold text-app-text mb-4">
        Theme
      </h2>

      <fieldset class="space-y-3">
        <legend class="sr-only">Select theme</legend>

        <label class="flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors"
               :class="[
                 theme === 'original'
                   ? 'border-app-accent bg-app-panel-hover'
                   : 'border-app-border hover:border-app-border-strong'
               ]">
          <input
            type="radio"
            name="theme"
            value="original"
            :checked="theme === 'original'"
            @change="handleThemeChange('original')"
            class="mt-1 h-4 w-4 accent-app-accent focus:ring-2 focus:ring-app-accent focus:ring-offset-2 focus:ring-offset-app-panel"
          />
          <div class="flex-1">
            <div class="font-medium text-app-text">Original</div>
          </div>
        </label>

        <label class="flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors"
               :class="[
                 theme === 'neon'
                   ? 'border-app-accent bg-app-panel-hover'
                   : 'border-app-border hover:border-app-border-strong'
               ]">
          <input
            type="radio"
            name="theme"
            value="neon"
            :checked="theme === 'neon'"
            @change="handleThemeChange('neon')"
            class="mt-1 h-4 w-4 accent-app-accent focus:ring-2 focus:ring-app-accent focus:ring-offset-2 focus:ring-offset-app-panel"
          />
          <div class="flex-1">
            <div class="font-medium text-app-text">Neon</div>
          </div>
        </label>

        <label class="flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors"
               :class="[
                 theme === 'ember'
                   ? 'border-app-accent bg-app-panel-hover'
                   : 'border-app-border hover:border-app-border-strong'
               ]">
          <input
            type="radio"
            name="theme"
            value="ember"
            :checked="theme === 'ember'"
            @change="handleThemeChange('ember')"
            class="mt-1 h-4 w-4 accent-app-accent focus:ring-2 focus:ring-app-accent focus:ring-offset-2 focus:ring-offset-app-panel"
          />
          <div class="flex-1">
            <div class="font-medium text-app-text">Ember</div>
          </div>
        </label>

        <label class="flex items-start gap-3 p-4 rounded-lg border-2 cursor-pointer transition-colors"
               :class="[
                 theme === 'obsidian'
                   ? 'border-app-accent bg-app-panel-hover'
                   : 'border-app-border hover:border-app-border-strong'
               ]">
          <input
            type="radio"
            name="theme"
            value="obsidian"
            :checked="theme === 'obsidian'"
            @change="handleThemeChange('obsidian')"
            class="mt-1 h-4 w-4 accent-app-accent focus:ring-2 focus:ring-app-accent focus:ring-offset-2 focus:ring-offset-app-panel"
          />
          <div class="flex-1">
            <div class="font-medium text-app-text">Obsidian</div>
            <div class="text-sm text-app-text-muted">Black glass panels with purple arcade accents</div>
          </div>
        </label>
      </fieldset>
    </div>
  </div>
</template>
