<script setup lang="ts">
import { useAttrs } from 'vue';
import { useTheme } from '@/composables/theme';

defineOptions({ inheritAttrs: false });

withDefaults(defineProps<{
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
  variant?: 'primary' | 'secondary';
}>(), {
  disabled: false,
  type: 'button',
  variant: 'primary',
});

defineEmits<{ click: [event: MouseEvent] }>();

const { theme } = useTheme();
const attrs: Record<string, unknown> = useAttrs();
</script>

<template>
  <sakuga-button v-if="theme === 'sakuga'" :variant="variant === 'secondary' ? 'secondary' : undefined" :disabled="disabled" @click="$emit('click', $event)"><slot /></sakuga-button>
  <button v-else v-bind="attrs" :type="type" :disabled="disabled" @click="$emit('click', $event)"><slot /></button>
</template>
