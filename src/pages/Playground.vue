<template>
  <div class="mx-auto max-w-4xl space-y-6 py-6"><section class="rounded-[28px] bg-app-panel p-6 shadow-raised"><h1 class="text-[30px] font-bold tracking-[-0.02em]">Playground</h1><p class="mt-1 text-sm text-app-text-muted">Discord connection diagnostics.</p><button type="button" class="neu-motion neu-convex mt-6 h-11 rounded-[14px] bg-app-panel px-[18px] text-[13px] font-semibold text-app-accent shadow-raised-sm hover:shadow-raised hover:text-app-accent-hover active:shadow-inset" @click="discordTest">{{ isConnected ? 'Disconnect from Discord' : 'Discord test' }}</button></section><section class="rounded-[28px] bg-app-panel p-6 shadow-raised"><div class="flex items-center justify-between gap-4"><h2 class="text-xl font-bold">Logs</h2><button type="button" class="neu-motion h-11 rounded-[14px] bg-app-panel px-[18px] text-[13px] font-medium text-app-text-muted shadow-raised-sm hover:shadow-raised hover:text-app-text active:shadow-inset" @click="clearLogs">Clear logs</button></div><div class="mt-4 max-h-64 overflow-y-auto rounded-[18px] bg-app-panel p-3 font-mono text-xs leading-[1.8] text-app-text-muted shadow-inset"><p v-if="logs.length === 0">No logs available.</p><ul v-else><li v-for="(log, index) in logs" :key="index"><span>{{ new Date(log.timestamp).toLocaleString() }}</span> <span :class="log.type === 'error' ? 'text-app-danger' : log.type === 'debug' ? 'text-app-success' : 'text-app-accent'">{{ log.type.toUpperCase() }}</span> {{ log.message }}</li></ul></div></section></div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { emit } from '@tauri-apps/api/event';
import { useGlobalState } from '@/composables/app-state';
const isConnected = ref(false);
const { logs, clearLogs } = useGlobalState();
function discordTest() { if (isConnected.value) { emit('event_disconnect'); isConnected.value = false; return; } invoke('connect_to_discord_rpc_3', { activity_json: JSON.stringify({ app_id: '1361728268088381706', details: 'Jhabol', state: '/jhabol', activity_kind: 2, timestamp: Math.floor(Date.now() / 1000) }), action: 'connect' }); isConnected.value = true; }
</script>
