<script setup lang="ts">
import { computed, ref, watch } from 'vue';
import { isValidTimerMinutes, TIMER_PRESETS } from '@/constants/timers';
const props = withDefaults(defineProps<{ modelValue: number | null | undefined; disabled?: boolean; allowNone?: boolean }>(), { disabled: false, allowNone: true });
const emit = defineEmits<{ 'update:modelValue': [value: number | null] }>();
const isOpen = ref(false);
const customMinutes = ref<number | null>(null);
const isPreset = computed(() => typeof props.modelValue === 'number' && TIMER_PRESETS.includes(props.modelValue as typeof TIMER_PRESETS[number]));
const parsedCustomMinutes = computed(() => isValidTimerMinutes(customMinutes.value) ? customMinutes.value : null);
function syncCustomValue(value: number | null | undefined) { customMinutes.value = isValidTimerMinutes(value) && !isPreset.value ? value : null; }
watch(() => props.modelValue, syncCustomValue, { immediate: true });
function togglePicker() { if (!props.disabled) isOpen.value = !isOpen.value; }
function selectPreset(minutes: number) { emit('update:modelValue', minutes); customMinutes.value = null; isOpen.value = false; }
function selectNoTimer() { emit('update:modelValue', null); customMinutes.value = null; isOpen.value = false; }
function applyCustom() { if (parsedCustomMinutes.value !== null) { emit('update:modelValue', parsedCustomMinutes.value); isOpen.value = false; } }
</script>

<template>
  <div class="relative">
    <button type="button" class="neu-motion inline-flex h-11 items-center justify-between gap-2 rounded-[14px] bg-app-panel px-[18px] text-[13px] font-medium text-app-text-muted shadow-raised-sm hover:shadow-raised hover:text-app-text active:shadow-inset disabled:pointer-events-none disabled:opacity-45" :disabled="disabled" :aria-expanded="isOpen" aria-label="Choose timer duration" @click.stop="togglePicker">{{ isValidTimerMinutes(modelValue) ? `${modelValue} min` : 'Timer' }}<span aria-hidden="true">⌄</span></button>
    <div v-if="isOpen" class="absolute right-0 top-full z-30 mt-2 w-56 rounded-[18px] bg-app-panel p-2 shadow-inset" @click.stop>
      <div class="max-h-64 overflow-y-auto" role="listbox" aria-label="Timer duration">
        <button v-if="allowNone" type="button" role="option" class="neu-motion mb-1 flex h-11 w-full items-center justify-between rounded-[13px] px-3 text-left text-[13px] text-app-text-muted hover:bg-app-panel-hover" :class="modelValue == null ? 'bg-app-panel text-app-accent shadow-raised-sm' : ''" :aria-selected="modelValue == null" @click="selectNoTimer">No timer<span v-if="modelValue == null" aria-hidden="true">Selected</span></button>
        <button v-for="minutes in TIMER_PRESETS" :key="minutes" type="button" role="option" class="neu-motion mb-1 flex h-11 w-full items-center justify-between rounded-[13px] px-3 text-left text-[13px] text-app-text-muted hover:bg-app-panel-hover" :class="modelValue === minutes ? 'bg-app-panel text-app-accent shadow-raised-sm' : ''" :aria-selected="modelValue === minutes" @click="selectPreset(minutes)">{{ minutes }} min<span v-if="modelValue === minutes" aria-hidden="true">Selected</span></button>
        <div class="mt-2 rounded-[14px] bg-app-panel p-3 shadow-inset"><label class="block text-xs text-app-text-muted" for="custom-minutes">Custom minutes</label><div class="mt-2 flex items-center gap-2"><input id="custom-minutes" v-model="customMinutes" type="number" min="1" step="1" inputmode="numeric" placeholder="7" class="h-11 min-w-0 flex-1 rounded-[13px] bg-app-panel px-3 text-sm text-app-text shadow-inset outline-none" @keydown.enter="applyCustom" /><button type="button" class="neu-motion neu-convex h-11 rounded-[13px] bg-app-panel px-3 text-[13px] font-semibold text-app-accent shadow-raised-sm disabled:opacity-45" :disabled="parsedCustomMinutes === null" @click="applyCustom">Set</button></div></div>
      </div>
    </div>
  </div>
</template>
