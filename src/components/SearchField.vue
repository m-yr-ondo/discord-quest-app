<script setup lang="ts">
import { onMounted, useTemplateRef, watch } from 'vue';
import { useTheme } from '@/composables/theme';

interface SakugaInputElement extends HTMLElement {
  value: string;
}

const props = defineProps<{
  modelValue: string;
  placeholder: string;
  ariaLabel: string;
}>();

const emit = defineEmits<{
  'update:modelValue': [value: string];
  focus: [event: FocusEvent];
  blur: [event: FocusEvent];
}>();

const inputRef = useTemplateRef<SakugaInputElement>('inputRef');
const { theme } = useTheme();

function emitValue(event: Event) {
  emit('update:modelValue', (event.currentTarget as SakugaInputElement).value);
}

onMounted(() => {
  if (inputRef.value) {
    inputRef.value.value = props.modelValue;
  }
});

watch(() => props.modelValue, (value) => {
  if (inputRef.value && inputRef.value.value !== value) {
    inputRef.value.value = value;
  }
});
</script>

<template>
  <sakuga-input
    v-if="theme === 'sakuga'"
    ref="inputRef"
    class="sakuga-search-field"
    type="search"
    :value="modelValue"
    :placeholder="placeholder"
    :label="ariaLabel"
    @input="emitValue"
    @focus="emit('focus', $event)"
    @blur="emit('blur', $event)"
  />
  <div v-else class="search-field">
    <span class="search-field__glow" aria-hidden="true" />
    <span class="search-field__dark-border" aria-hidden="true" />
    <span class="search-field__white" aria-hidden="true" />
    <span class="search-field__border" aria-hidden="true" />
    <div class="search-field__main">
      <span class="search-field__pink" aria-hidden="true" />
      <input
        :value="modelValue"
        type="search"
        :placeholder="placeholder"
        :aria-label="ariaLabel"
        @input="emit('update:modelValue', ($event.target as HTMLInputElement).value)"
        @focus="emit('focus', $event)"
        @blur="emit('blur', $event)"
      />
      <svg class="search-field__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="11" cy="11" r="7" />
        <path d="m20 20-4-4" />
      </svg>
      <div class="search-field__action">
        <slot>
          <svg class="search-field__filter" viewBox="4.8 4.56 14.832 15.408" fill="none" aria-hidden="true">
            <path d="M8.16 6.65h7.67c.64 0 1.16.52 1.16 1.16v1.28c0 .47-.29 1.05-.58 1.34l-2.5 2.21c-.35.29-.58.87-.58 1.34v2.5c0 .35-.23.81-.52.99l-.81.51c-.76.47-1.8-.06-1.8-.99v-3.08c0-.41-.23-.93-.47-1.22L7.52 10.36c-.29-.28-.52-.81-.52-1.16V7.87c0-.7.52-1.22 1.16-1.22Z" stroke="currentColor" stroke-width="1" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </slot>
      </div>
    </div>
  </div>
</template>

<style scoped>
.sakuga-search-field {
  display: block;
  width: 100%;
}

/* Adapted from Uiverse.io by Lakshay-art. MIT License, Copyright 2026 Lakshay-art (Lakshay Gupta). */
.search-field {
  position: relative;
  isolation: isolate;
  width: 100%;
  min-width: 0;
  height: 52px;
}

.search-field__glow,
.search-field__dark-border,
.search-field__white,
.search-field__border {
  display: none;
}

.search-field__glow {
  inset: -7px;
  z-index: -4;
  opacity: 0.38;
  filter: blur(15px);
}

.search-field__dark-border {
  inset: -3px;
  z-index: -3;
  filter: blur(3px);
}

.search-field__white {
  inset: -1px;
  z-index: -2;
  filter: blur(1.5px);
}

.search-field__border {
  z-index: -1;
  border-radius: 10px;
  filter: blur(0.4px);
}

.search-field__glow::before,
.search-field__dark-border::before,
.search-field__white::before,
.search-field__border::before {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 600px;
  height: 600px;
  content: "";
  background-repeat: no-repeat;
  background-position: center;
  transition: transform 700ms ease;
}

.search-field__glow::before {
  background-image: conic-gradient(#000, #402fb5 5%, #000 38%, #000 50%, #cf30aa 60%, #000 87%);
  transform: translate(-50%, -50%) rotate(60deg);
}

.search-field__dark-border::before {
  background-image: conic-gradient(transparent, #18116a, transparent 10%, transparent 50%, #6e1b60, transparent 60%);
  transform: translate(-50%, -50%) rotate(82deg);
}

.search-field__white::before {
  filter: brightness(1.4);
  background-image: conic-gradient(transparent 0%, #a099d8, transparent 8%, transparent 50%, #dfa2da, transparent 58%);
  transform: translate(-50%, -50%) rotate(83deg);
}

.search-field__border::before {
  filter: brightness(1.3);
  background-image: conic-gradient(#1c191c, #402fb5 5%, #1c191c 14%, #1c191c 50%, #cf30aa 60%, #1c191c 64%);
  transform: translate(-50%, -50%) rotate(70deg);
}

.search-field:hover .search-field__dark-border::before { transform: translate(-50%, -50%) rotate(262deg); }
.search-field:hover .search-field__glow::before { transform: translate(-50%, -50%) rotate(240deg); }
.search-field:hover .search-field__white::before { transform: translate(-50%, -50%) rotate(263deg); }
.search-field:hover .search-field__border::before { transform: translate(-50%, -50%) rotate(250deg); }
.search-field:focus-within .search-field__dark-border::before { transform: translate(-50%, -50%) rotate(442deg); transition-duration: 4s; }
.search-field:focus-within .search-field__glow::before { transform: translate(-50%, -50%) rotate(420deg); transition-duration: 4s; }
.search-field:focus-within .search-field__white::before { transform: translate(-50%, -50%) rotate(443deg); transition-duration: 4s; }
.search-field:focus-within .search-field__border::before { transform: translate(-50%, -50%) rotate(430deg); }

.search-field__main {
  position: relative;
  display: flex;
  align-items: center;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: 14px;
  background: var(--app-panel);
  box-shadow: var(--app-shadow-inset);
}

.search-field__main input {
  width: 100%;
  min-width: 0;
  height: 100%;
  padding: 0 12px 0 46px;
  border: 0;
  outline: none;
  background: transparent;
  color: #e6e8ee;
  font: inherit;
  font-size: 14px;
}

.search-field__main input::placeholder { color: #9aa3b2; opacity: 1; }
.search-field__main input::-webkit-search-cancel-button { cursor: pointer; }
.search-field__pink { display: none; }
.search-field__icon {
  position: absolute;
  left: 15px;
  width: 16px;
  height: 16px;
  color: #b6a9b7;
  pointer-events: none;
}
.search-field__filter { width: 19px; height: 19px; color: #d6d6e6; }
.search-field__action {
  display: flex;
  flex: none;
  align-items: center;
  height: 100%;
  padding: 0 12px 0 4px;
}

@media (prefers-reduced-motion: reduce) {
  .search-field__glow::before,
  .search-field__dark-border::before,
  .search-field__white::before,
  .search-field__border::before { transition: none; }
}
</style>
