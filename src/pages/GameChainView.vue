<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { path } from '@tauri-apps/api';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import GameArtwork from '@/components/GameArtwork.vue';
import SearchField from '@/components/SearchField.vue';
import type { TimerMinutes } from '@/constants/timers';
import { useGameLibrary } from '@/composables/game-library';
import { useGlobalState } from '@/composables/app-state';
import { useTheme } from '@/composables/theme';
import { EXECUTABLE_OS } from '@/constants/constants';
import {
    deleteGameChain,
    loadGameChain,
    saveGameChain,
    type GameChainEntry,
} from '@/services/game-chain';
import type { Game, GameExecutable } from '@/types/types';
import MinutePicker from '@/components/MinutePicker.vue';
import SakugaTimerProgress from '@/components/SakugaTimerProgress.vue';

const {
    gameDB,
    gameList,
    addGameToList: addLibraryGame,
    saveSavedGames: saveLibraryGames,
} = useGameLibrary();
const { addLog } = useGlobalState();
const { theme } = useTheme();

const chainEntries = ref<GameChainEntry[]>(loadGameChain());
const selectedGameId = ref<string | null>(null);
const selectedTimer = ref<TimerMinutes>(20);
const searchQuery = ref('');
const chainGameSearchQuery = ref('');
const openGameMenu = ref(false);
const showChainHelp = ref(false);
const hasOpenedChainHelp = ref(false);
const chainRunning = ref(false);
const activeIndex = ref(-1);
const activeProcessId = ref<number | undefined>();
const remainingSeconds = ref<number | undefined>();
let countdownInterval: ReturnType<typeof setInterval> | undefined;
let unlistenProcessStopped: UnlistenFn | undefined;

const chainGames = computed(() => [...gameList.value].sort((first, second) => first.name.localeCompare(second.name)));
const selectedGame = computed(() => chainGames.value.find((game) => game.id === selectedGameId.value));
const chainGameResults = computed(() => {
    const query = chainGameSearchQuery.value.trim().toLocaleLowerCase();
    return chainGames.value.filter((game) => !query
        || game.name.toLocaleLowerCase().includes(query)
        || game.aliases?.some((alias) => alias.toLocaleLowerCase().includes(query)));
});
const catalogResults = computed(() => {
    const query = searchQuery.value.trim().toLocaleLowerCase();
    if (!query) {
        return [];
    }

    return gameDB.value
        .filter((game) => game.name.toLocaleLowerCase().includes(query)
            || game.aliases?.some((alias) => alias.toLocaleLowerCase().includes(query)))
        .sort((first, second) => first.name.localeCompare(second.name))
        .slice(0, 8);
});
const canAddGame = computed(() => Boolean(selectedGame.value)
    && !chainEntries.value.some((entry) => entry.gameId === selectedGameId.value)
    && chainEntries.value.length < 10
    && !chainRunning.value);

function updateChainTimer(entry: GameChainEntry, minutes: number | null) {
    if (minutes !== null) {
        updateTimer(entry, minutes);
    }
}

function toggleChainHelp() {
    showChainHelp.value = !showChainHelp.value;

    if (showChainHelp.value) {
        hasOpenedChainHelp.value = true;
    }
}

function saveChain() {
    saveGameChain(chainEntries.value);
}

function isGameOnList(gameId: string) {
    return gameList.value.some((game) => game.id === gameId);
}

function isValidExecutablePath(name: string) {
    return !['>', '<', ':', '"', '|', '?', '*'].some((character) => name.includes(character));
}

function getChainExecutable(game: Game) {
    return game.executables.find((executable) => executable.os === EXECUTABLE_OS.WINDOWS
        && isValidExecutablePath(executable.name));
}

function addGameToSharedList(game: Game) {
    if (!isGameOnList(game.id)) {
        addLibraryGame(game);
    }
}

function selectCatalogGame(game: Game) {
    const libraryGame = gameList.value.find((item) => item.id === game.id);
    if (!libraryGame) {
        return;
    }

    selectChainGame(libraryGame);
    searchQuery.value = '';
}

function addGameToChain() {
    if (!canAddGame.value || !selectedGame.value) {
        return;
    }

    const executable = getChainExecutable(selectedGame.value);
    if (!executable) {
        return;
    }

    chainEntries.value.push({
        gameId: selectedGame.value.id,
        executableName: executable.name,
        timerMinutes: selectedTimer.value,
    });
    saveChain();
    selectedGameId.value = null;
    chainGameSearchQuery.value = '';
    openGameMenu.value = false;
}

function selectChainGame(game: Game) {
    selectedGameId.value = game.id;
    chainGameSearchQuery.value = '';
    openGameMenu.value = false;
}

function removeGameFromChain(index: number) {
    if (chainRunning.value) {
        return;
    }
    chainEntries.value.splice(index, 1);
    saveChain();
}

function updateTimer(entry: GameChainEntry, minutes: TimerMinutes) {
    if (chainRunning.value) {
        return;
    }
    entry.timerMinutes = minutes;
    saveChain();
}

function getGame(entry: GameChainEntry) {
    return gameList.value.find((game) => game.id === entry.gameId);
}

function getExecutablePath(executable: GameExecutable) {
    const sections = executable.name.split(/\\|\//);
    sections.pop();
    return sections.join(path.sep());
}

function getFilename(executable: GameExecutable) {
    return executable.name.split(/\\|\//).pop();
}

function clearCountdown() {
    if (countdownInterval !== undefined) {
        clearInterval(countdownInterval);
        countdownInterval = undefined;
    }
}

function startCountdown(seconds: number) {
    clearCountdown();
    remainingSeconds.value = seconds;
    countdownInterval = setInterval(() => {
        if (remainingSeconds.value !== undefined) {
            remainingSeconds.value = Math.max(0, remainingSeconds.value - 1);
        }
    }, 1000);
}

function formatRemaining(seconds = 0) {
    const safeSeconds = Math.max(0, Math.ceil(seconds));
    const minutes = Math.floor(safeSeconds / 60);
    const remaining = safeSeconds % 60;
    return `${minutes}:${String(remaining).padStart(2, '0')}`;
}

function timerProgress(entry: GameChainEntry) {
    if (activeIndex.value < 0 || chainEntries.value[activeIndex.value] !== entry || remainingSeconds.value === undefined) {
        return 0;
    }
    return Math.max(0, Math.min(100, (1 - remainingSeconds.value / (entry.timerMinutes * 60)) * 100));
}

async function launchEntry(index: number) {
    const entry = chainEntries.value[index];
    const game = entry ? getGame(entry) : undefined;
    const executable = game
        ? game.executables.find((item) => item.name === entry.executableName) ?? getChainExecutable(game)
        : undefined;
    if (!entry || !game || !executable) {
        addLog('error', 'A game in the chain has no supported Windows executable.');
        chainRunning.value = false;
        activeIndex.value = -1;
        return;
    }

    if (!executable.is_installed) {
        await invoke('create_fake_game', {
            path: getExecutablePath(executable),
            executable_name: getFilename(executable),
            path_len: executable.name.split(/\\|\//).length,
            app_id: Number(game.id),
        });
        game.is_installed = true;
        executable.is_installed = true;
        saveLibraryGames();
    }

    const processId = await invoke<number>('run_background_process', {
        name: game.name,
        path: getExecutablePath(executable),
        executable_name: getFilename(executable),
        path_len: entry.executableName.split(/\\|\//).length,
        app_id: Number(game.id),
        exec_path: entry.executableName,
        timer_minutes: entry.timerMinutes,
    });

    activeIndex.value = index;
    activeProcessId.value = processId;
    executable.process_id = processId;
    executable.is_running = true;
    executable.timer_minutes = entry.timerMinutes;
    game.is_running = true;
    startCountdown(entry.timerMinutes * 60);
    addLog('info', `Chain started: ${game.name}`);
}

async function advanceChain() {
    clearCountdown();
    activeProcessId.value = undefined;
    const nextIndex = activeIndex.value + 1;
    if (nextIndex >= chainEntries.value.length) {
        chainRunning.value = false;
        activeIndex.value = -1;
        remainingSeconds.value = undefined;
        addLog('info', 'Game chain completed.');
        return;
    }

    try {
        await launchEntry(nextIndex);
    } catch (error) {
        chainRunning.value = false;
        activeIndex.value = -1;
        addLog('error', `Failed to start the next chain game: ${String(error)}`);
    }
}

async function startChain() {
    if (chainRunning.value || chainEntries.value.length === 0) {
        return;
    }

    chainRunning.value = true;
    activeIndex.value = -1;
    try {
        await launchEntry(0);
    } catch (error) {
        chainRunning.value = false;
        addLog('error', `Failed to start game chain: ${String(error)}`);
    }
}

async function stopChain() {
    const processId = activeProcessId.value;
    clearCountdown();
    try {
        if (processId !== undefined) {
            await invoke('stop_process', { process_id: processId });
        }
    } catch (error) {
        addLog('error', `Failed to stop game chain: ${String(error)}`);
    } finally {
        chainRunning.value = false;
        activeIndex.value = -1;
        activeProcessId.value = undefined;
        remainingSeconds.value = undefined;
        gameList.value.forEach((game) => {
            game.executables.forEach((executable) => {
                if (executable.process_id === processId) {
                    executable.process_id = undefined;
                    executable.is_running = false;
                    executable.timer_minutes = null;
                }
            });
            if (!game.executables.some((executable) => executable.is_running)) {
                game.is_running = false;
            }
        });
    }
    addLog('info', 'Game chain stopped.');
}

async function deleteChain() {
    if (chainRunning.value) {
        await stopChain();
    }
    deleteGameChain();
    chainEntries.value = [];
    selectedGameId.value = null;
}

onMounted(async () => {
    unlistenProcessStopped = await listen<number>('game_process_stopped', ({ payload }) => {
        if (chainRunning.value && activeProcessId.value === payload) {
            void advanceChain();
        }
    });
});

onUnmounted(() => {
    clearCountdown();
    unlistenProcessStopped?.();
});
</script>

<template>
    <div class="mx-auto grid max-w-[1600px] gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section class="rounded-[28px] bg-app-panel p-6 shadow-raised"><div class="flex flex-wrap items-start justify-between gap-4"><div><div class="flex items-center gap-2"><h1 class="text-[30px] font-bold tracking-[-0.02em]">Game Chain</h1><sakuga-tooltip v-if="theme === 'sakuga'" class="chain-help-tooltip" placement="bottom" text="Start the Quest for every game in Discord first, choose Desktop, then return here and start the chain." label="How to use chained games" @click="toggleChainHelp">?</sakuga-tooltip><button v-else type="button" class="neu-motion grid size-11 place-items-center rounded-full bg-app-panel text-app-accent shadow-raised-sm hover:shadow-raised active:shadow-inset" aria-label="How to use chained games" :aria-expanded="showChainHelp" @click="toggleChainHelp">?</button></div><p class="mt-1 text-sm text-app-text-muted">Games run back to back. Each starts when the previous timer ends.</p></div><p class="text-sm text-app-text-muted">{{ chainEntries.length }} of 10 slots used</p></div><div v-if="showChainHelp" class="mt-5 rounded-[18px] bg-app-panel p-4 text-sm leading-6 text-app-text-muted shadow-inset">Start the Quest for every game in Discord first, choose Desktop, then return here and start the chain. Discord detects each game as its timer begins.</div><div v-if="chainEntries.length" class="mt-6 rounded-[18px] bg-app-panel p-3 shadow-inset"><ol class="space-y-2"><li v-for="(entry, index) in chainEntries" :key="entry.gameId" class="rounded-[14px] bg-app-panel p-3 shadow-raised-sm"><div class="flex flex-wrap items-center gap-3"><div class="grid size-10 place-items-center rounded-full bg-app-panel text-sm font-bold shadow-inset">{{ index + 1 }}</div><GameArtwork v-if="getGame(entry)" :game="getGame(entry)!" class="size-10"/><div class="min-w-36 flex-1"><p class="text-[15px] font-semibold" :class="activeIndex === index ? 'text-app-accent' : ''">{{ getGame(entry)?.name ?? 'Unavailable game' }}</p><p class="font-mono text-xs text-app-text-muted">{{ entry.executableName }}</p></div><span class="text-xs text-app-text-muted"><span class="mr-2 inline-block size-2 rounded-full" :class="activeIndex === index ? 'bg-app-success shadow-[0_0_8px_var(--app-success)]' : 'bg-app-dot-off'"/>{{ activeIndex === index ? `Running · ${entry.timerMinutes} min` : `Queued · ${entry.timerMinutes} min` }}</span><MinutePicker :model-value="entry.timerMinutes" :disabled="chainRunning" :allow-none="false" @update:model-value="updateChainTimer(entry, $event)"/><button type="button" class="neu-motion grid size-11 place-items-center rounded-full bg-app-panel text-app-danger shadow-raised-sm hover:shadow-raised active:shadow-inset disabled:opacity-45" :disabled="chainRunning" aria-label="Remove from chain" @click="removeGameFromChain(index)">×</button></div><div v-if="activeIndex === index" class="mt-3"><SakugaTimerProgress :value="timerProgress(entry)" :label="`${getGame(entry)?.name ?? 'Game'} chain timer`" fallback-class="block h-2.5 w-48 overflow-hidden rounded-[5px] bg-app-panel shadow-inset" fallback-fill-class="block h-full rounded-[5px] bg-app-accent"/></div></li></ol></div><div v-else class="mt-6 rounded-[18px] bg-app-panel p-8 text-center text-sm text-app-text-muted shadow-inset">Add an installed game to begin building your chain.</div><div class="mt-6 flex flex-wrap items-center justify-between gap-4"><p class="text-sm text-app-text-muted">Total {{ chainEntries.reduce((total, entry) => total + entry.timerMinutes, 0) }} min<span v-if="chainRunning && activeIndex >= 0"> · running step {{ activeIndex + 1 }} of {{ chainEntries.length }}</span></p><div class="flex gap-2"><button type="button" class="neu-motion h-11 rounded-[14px] bg-app-panel px-[18px] text-[13px] text-app-danger shadow-raised-sm hover:shadow-raised active:shadow-inset disabled:opacity-45" :disabled="chainEntries.length === 0" @click="deleteChain">Delete</button><button v-if="!chainRunning" type="button" class="neu-motion neu-convex h-[52px] rounded-[26px] bg-app-panel px-7 text-[15px] font-semibold text-app-accent shadow-raised-sm hover:shadow-raised hover:text-app-accent-hover active:shadow-inset disabled:opacity-45" :disabled="chainEntries.length === 0" @click="startChain">Start chain</button><button v-else type="button" class="neu-motion h-[52px] rounded-[26px] bg-app-panel px-7 text-[15px] font-semibold text-app-danger shadow-raised-sm hover:shadow-raised active:shadow-inset" @click="stopChain">Stop chain</button></div></div></section>
        <aside class="self-start rounded-[28px] bg-app-panel p-6 shadow-raised"><div class="flex items-center justify-between gap-4"><h2 class="text-xl font-bold">Add to chain</h2><div class="w-1/2 shrink-0"><SearchField v-model="searchQuery" placeholder="Search verified games" ariaLabel="Search games to add"/></div></div><div class="mt-3"><div v-if="searchQuery.trim()" class="mt-3 rounded-[18px] bg-app-panel p-3 shadow-inset"><div v-for="game in catalogResults" :key="game.id" class="mb-2 flex items-center justify-between gap-3 rounded-[14px] bg-app-panel p-3 shadow-raised-sm last:mb-0" :class="isGameOnList(game.id) ? 'cursor-pointer hover:bg-app-panel-hover' : ''" :role="isGameOnList(game.id) ? 'button' : undefined" :tabindex="isGameOnList(game.id) ? 0 : undefined" @click="isGameOnList(game.id) && selectCatalogGame(game)" @keydown.enter="isGameOnList(game.id) && selectCatalogGame(game)" @keydown.space.prevent="isGameOnList(game.id) && selectCatalogGame(game)"><span class="truncate text-sm">{{ game.name }}</span><button v-if="!isGameOnList(game.id)" type="button" class="text-xs text-app-accent hover:text-app-accent-hover" @click.stop="addGameToSharedList(game)">Add</button><span v-else class="text-xs text-app-text-muted">Added · click to select</span></div><p v-if="catalogResults.length === 0" class="p-3 text-sm text-app-text-muted">No matching games found.</p></div></div><div v-if="chainGames.length" class="mt-6"><button type="button" class="neu-motion flex h-11 w-full items-center justify-between rounded-[14px] bg-app-panel px-[18px] text-left text-[13px] text-app-text-muted shadow-raised-sm hover:shadow-raised hover:text-app-text active:shadow-inset" @click="openGameMenu = !openGameMenu"><span class="truncate">{{ selectedGame?.name ?? 'Select a game from your library' }}</span><span aria-hidden="true">⌄</span></button><div v-if="openGameMenu" class="mt-3 rounded-[18px] bg-app-panel p-3 shadow-inset"><div @click.stop><SearchField v-model="chainGameSearchQuery" placeholder="Search your library" ariaLabel="Search games in your library"/></div><button v-for="game in chainGameResults" :key="game.id" type="button" class="mt-2 flex h-11 w-full items-center justify-between rounded-[13px] bg-app-panel px-3 text-left text-sm shadow-raised-sm disabled:opacity-45" :disabled="chainEntries.some((entry) => entry.gameId === game.id)" @click="selectChainGame(game)"><span class="truncate">{{ game.name }}</span><span v-if="chainEntries.some((entry) => entry.gameId === game.id)" class="text-xs text-app-text-muted">Added</span></button></div><p class="mt-6 text-xs font-semibold uppercase tracking-[0.06em] text-app-text-muted">Quest timer (minutes)</p><div class="mt-3"><MinutePicker v-model="selectedTimer" :allow-none="false" /></div><button type="button" class="neu-motion neu-convex mt-5 h-[52px] w-full rounded-[26px] bg-app-panel text-[15px] font-semibold text-app-accent shadow-raised-sm hover:shadow-raised hover:text-app-accent-hover active:shadow-inset disabled:opacity-45" :disabled="!canAddGame" @click="addGameToChain">Add game</button></div><p v-else class="mt-5 text-sm text-app-text-muted">Add games to your shared library before creating a chain.</p></aside>
    </div>
</template>
