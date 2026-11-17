<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue';
import { invoke } from '@tauri-apps/api/core';
import { path } from '@tauri-apps/api';
import { listen, type UnlistenFn } from '@tauri-apps/api/event';
import GameArtwork from '@/components/GameArtwork.vue';
import { TIMER_OPTIONS, type TimerMinutes } from '@/constants/timers';
import { useGameLibrary } from '@/composables/game-library';
import { useGlobalState } from '@/composables/app-state';
import { EXECUTABLE_OS } from '@/constants/constants';
import {
    deleteGameChain,
    loadGameChain,
    saveGameChain,
    type GameChainEntry,
} from '@/services/game-chain';
import type { Game, GameExecutable } from '@/types/types';

const {
    gameDB,
    gameList,
    addGameToList: addLibraryGame,
    saveSavedGames: saveLibraryGames,
} = useGameLibrary();
const { addLog } = useGlobalState();

const chainEntries = ref<GameChainEntry[]>(loadGameChain());
const selectedGameId = ref<string | null>(null);
const selectedTimer = ref<TimerMinutes>(20);
const searchQuery = ref('');
const chainGameSearchQuery = ref('');
const openGameMenu = ref(false);
const openTimerMenu = ref(false);
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
    openTimerMenu.value = false;
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
    return Math.max(0, Math.min(100, remainingSeconds.value / (entry.timerMinutes * 60) * 100));
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
    <div class="container mx-auto px-4 py-8">
        <div class="mb-6 rounded-lg border border-app-accent/40 bg-app-accent/10 p-4 text-app-text">
            <h1 class="text-2xl font-bold">Chain</h1>
            <p class="mt-2 text-app-text-muted">
                Add games below, then choose up to 10 games to run in order. Each game is prepared automatically when its turn starts and advances when its timer expires.
            </p>
        </div>

        <div class="mb-6 rounded-lg border border-app-border bg-app-panel p-4">
            <input
                v-model="searchQuery"
                type="search"
                placeholder="Search games to add"
                class="w-full rounded-md border border-app-border bg-app-panel px-3 py-2 text-app-text outline-none focus:border-app-accent"
                aria-label="Search games to add"
            />
            <div v-if="searchQuery.trim() && catalogResults.length > 0" class="mt-2 overflow-hidden rounded-md border border-app-border">
                <div v-for="game in catalogResults" :key="game.id" class="flex items-center justify-between gap-3 border-b border-app-border p-3 last:border-b-0">
                    <div class="flex min-w-0 items-center gap-3">
                        <GameArtwork :game="game" class="h-9 w-9" />
                        <span class="truncate text-app-text">{{ game.name }}</span>
                    </div>
                    <div class="flex shrink-0 gap-2">
                        <span v-if="isGameOnList(game.id)" class="rounded-md bg-app-panel-hover px-2 py-1 text-xs text-app-text-muted">Added</span>
                        <button
                            v-else
                            class="rounded-md bg-app-accent px-3 py-1 text-sm text-white hover:bg-app-accent-hover"
                            @click="addGameToSharedList(game)"
                        >
                            Add to list
                        </button>
                    </div>
                </div>
            </div>
            <div v-else-if="searchQuery.trim()" class="mt-3 text-sm text-app-text-muted">No matching games found.</div>
        </div>

        <div class="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div class="text-app-text-muted">{{ chainEntries.length }}/10 games configured</div>
            <div class="flex gap-2">
                <button
                    class="rounded-md border border-app-danger/50 px-3 py-2 text-app-danger hover:bg-app-panel-hover disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="chainEntries.length === 0"
                    @click="deleteChain"
                >
                    Delete chain
                </button>
                <button
                    v-if="!chainRunning"
                    class="rounded-md bg-app-accent px-3 py-2 text-white hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
                    :disabled="chainEntries.length === 0"
                    @click="startChain"
                >
                    Start chain
                </button>
                <button
                    v-else
                    class="rounded-md bg-app-danger px-3 py-2 text-white hover:bg-app-danger/80"
                    @click="stopChain"
                >
                    Stop chain
                </button>
            </div>
        </div>

        <div v-if="chainGames.length === 0" class="mb-6 rounded-lg border border-app-border bg-app-panel p-6 text-center text-app-text-muted">
            No games are in the shared list yet. Search above and add a game to begin building your chain.
        </div>

        <div v-else-if="!chainRunning && chainEntries.length < 10" class="mb-6 rounded-lg border border-app-border bg-app-panel p-4">
            <h2 class="mb-3 text-lg font-semibold text-app-text">Add game</h2>
            <div class="flex flex-wrap items-center gap-3">
                <div class="relative">
                    <button
                        type="button"
                        class="inline-flex min-w-56 items-center justify-between gap-3 rounded-md border border-app-border bg-app-panel px-3 py-2 text-left text-app-text hover:bg-app-panel-hover"
                        @click="openGameMenu = !openGameMenu"
                    >
                        <span class="truncate">{{ selectedGame?.name ?? 'Select a game from your list' }}</span>
                        <span aria-hidden="true">▾</span>
                    </button>
                    <div v-if="openGameMenu" class="absolute left-0 top-full z-30 mt-1 w-72 overflow-hidden rounded-md border border-app-border bg-app-panel shadow-lg">
                        <input
                            v-model="chainGameSearchQuery"
                            type="search"
                            placeholder="Search your games"
                            class="w-full border-b border-app-border bg-app-panel px-3 py-2 text-app-text outline-none focus:border-app-accent"
                            aria-label="Search games in your list"
                            @click.stop
                        />
                        <div class="max-h-56 overflow-y-auto">
                            <button
                                v-for="game in chainGameResults"
                                :key="game.id"
                                type="button"
                                class="flex w-full items-center justify-between gap-3 px-3 py-2 text-left text-app-text hover:bg-app-panel-hover disabled:cursor-not-allowed disabled:opacity-60"
                                :disabled="chainEntries.some((entry) => entry.gameId === game.id)"
                                @click="selectChainGame(game)"
                            >
                                <span class="truncate">{{ game.name }}</span>
                                <span v-if="chainEntries.some((entry) => entry.gameId === game.id)" class="shrink-0 text-xs text-app-text-muted">Added</span>
                            </button>
                            <div v-if="chainGameResults.length === 0" class="px-3 py-2 text-sm text-app-text-muted">No matching games.</div>
                        </div>
                    </div>
                </div>

                <div class="relative">
                    <button type="button" class="inline-flex items-center gap-2 rounded-md border border-app-border bg-app-panel px-3 py-2 text-app-text hover:bg-app-panel-hover" @click="openTimerMenu = !openTimerMenu">
                        {{ TIMER_OPTIONS.find((option) => option.minutes === selectedTimer)?.label }}
                        <span aria-hidden="true">▾</span>
                    </button>
                    <div v-if="openTimerMenu" class="absolute left-0 top-full z-20 mt-1 overflow-hidden rounded-md border border-app-border bg-app-panel shadow-lg">
                        <button
                            v-for="option in TIMER_OPTIONS"
                            :key="option.minutes"
                            type="button"
                            class="block w-full whitespace-nowrap px-3 py-1.5 text-left text-app-text hover:bg-app-panel-hover"
                            :class="selectedTimer === option.minutes ? 'bg-app-accent text-white hover:bg-app-accent' : ''"
                            :aria-pressed="selectedTimer === option.minutes"
                            @click="selectedTimer = option.minutes; openTimerMenu = false"
                        >
                            {{ option.label }}
                        </button>
                    </div>
                </div>

                <button class="rounded-md bg-app-accent px-3 py-2 text-white hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-50" :disabled="!canAddGame" @click="addGameToChain">
                    Add game
                </button>
            </div>
        </div>

        <div v-if="chainEntries.length > 0" class="space-y-3">
            <div v-for="(entry, index) in chainEntries" :key="entry.gameId" class="rounded-lg border p-4" :class="activeIndex === index ? 'border-app-accent bg-app-accent/10' : 'border-app-border bg-app-panel'">
                <div class="flex flex-wrap items-center gap-3">
                    <div class="flex h-8 w-8 items-center justify-center rounded-full bg-app-panel-hover font-bold text-app-text">{{ index + 1 }}</div>
                    <GameArtwork v-if="getGame(entry)" :game="getGame(entry)!" class="h-10 w-10" />
                    <div class="min-w-40 flex-1">
                        <div class="font-medium text-app-text">{{ getGame(entry)?.name ?? 'Unavailable game' }}</div>
                        <div class="text-xs text-app-text-muted">{{ entry.executableName }}</div>
                    </div>
                    <select :value="entry.timerMinutes" class="rounded-md border border-app-border bg-app-panel px-2 py-1.5 text-app-text disabled:opacity-60" :disabled="chainRunning" @change="updateTimer(entry, Number(($event.target as HTMLSelectElement).value) as TimerMinutes)">
                        <option v-for="option in TIMER_OPTIONS" :key="option.minutes" :value="option.minutes">{{ option.label }}</option>
                    </select>
                    <button class="rounded-md border border-app-danger/50 px-3 py-1.5 text-app-danger hover:bg-app-panel-hover disabled:cursor-not-allowed disabled:opacity-50" :disabled="chainRunning" @click="removeGameFromChain(index)">
                        Remove
                    </button>
                </div>
                <div v-if="activeIndex === index && remainingSeconds !== undefined" class="mt-3 flex flex-wrap items-center gap-3 text-sm text-app-text-muted">
                    <span class="font-mono text-app-accent">Running · {{ formatRemaining(remainingSeconds) }} remaining</span>
                    <span class="h-1.5 w-32 overflow-hidden rounded-full bg-app-panel-hover" aria-hidden="true"><span class="block h-full rounded-full bg-app-accent transition-[width] duration-1000" :style="{ width: `${timerProgress(entry)}%` }"></span></span>
                </div>
            </div>
        </div>

        <div v-else class="rounded-lg border border-app-border bg-app-panel p-8 text-center text-app-text-muted">
            Add an installed game above to begin building your chain.
        </div>
    </div>
</template>
