<script setup lang="ts">
import { ref, computed, useTemplateRef, shallowRef, provide, onMounted, onUnmounted } from 'vue';
import { onClickOutside, refDebounced } from '@vueuse/core';
import { useFuse } from '@vueuse/integrations/useFuse'
import { invoke } from '@tauri-apps/api/core';
import { GameActionsProvider, GameExecutable, type Game } from '@/types/types';
import { isEmpty } from 'lodash-es';
import GameExecutables from '@/components/GameExecutables.vue';
import GameArtwork from '@/components/GameArtwork.vue';
import { GameActionsKey } from '@/constants/constants';
import { path } from '@tauri-apps/api';
import { emit, listen, type UnlistenFn } from '@tauri-apps/api/event';
import { UseFuseOptions } from '@vueuse/integrations';
import Fuse from 'fuse.js';
import { useGlobalState } from '@/composables/app-state';
import TimedNotification from '@/components/TimedNotification.vue';
import { useGameLibrary } from '@/composables/game-library';
 

type DialogKey = 
    'none' | 
    'rpc_message_1'|
    'no_game_selected';;


const {
    gameDB,
    isLoadingBundled,
    isLoadingDiscord,
    isLoadingGH,
    fetchGameList,
    isReadyGH,
    isReadyBundled,
    isReadyDiscord,
    allFetchDone,
    gameList,
    addGameToList: addLibraryGame,
    removeGameFromList: removeLibraryGame,
    saveSavedGames: saveLibraryGames,
} = useGameLibrary()
const { addLog, logs } = useGlobalState();
const shouldShowNotificationContainer = computed(() => {
    return isLoadingGH.value || isLoadingDiscord.value || isLoadingBundled.value ||
           (isReadyGH.value || isReadyDiscord.value || isReadyBundled.value);
});

const dialogRef = useTemplateRef<HTMLDialogElement>('dialogRef');
const searchResultContainerRef = useTemplateRef<HTMLElement>('searchResultContainerRef')
const dialogMessage = ref('');
const isDialogOpen = ref(false);
const dialogKey = ref<DialogKey>('none')
const isConnectedToRPC = ref(false);
const isConnecting = ref(false);

const searchQuery = shallowRef('');
const debouncedSearchQuery = refDebounced(searchQuery, 300)

const searchResultsIsOpen = ref(false);
const isOnSearchResults = ref(false);
const isGameListSearchOpen = ref(false);
const gameListSearchQuery = ref('');

const currentlyPlaying = ref<string | null>(null);
const timerIntervals = new Map<number, ReturnType<typeof setInterval>>();
let unlistenProcessStopped: UnlistenFn | undefined;

function clearTimerCountdown(processId?: number) {
    if (processId === undefined) {
        return;
    }
    const interval = timerIntervals.get(processId);
    if (interval !== undefined) {
        clearInterval(interval);
        timerIntervals.delete(processId);
    }
}

function startTimerCountdown(executable: GameExecutable) {
    if (executable.process_id === undefined || executable.timer_remaining_seconds === undefined) {
        return;
    }
    clearTimerCountdown(executable.process_id);
    const interval = setInterval(() => {
        if (executable.timer_paused || executable.timer_remaining_seconds === undefined) {
            return;
        }
        executable.timer_remaining_seconds = Math.max(0, executable.timer_remaining_seconds - 1);
    }, 1000);
    timerIntervals.set(executable.process_id, interval);
}

onMounted(async () => {
    unlistenProcessStopped = await listen<number>('game_process_stopped', ({ payload }) => {
        for (const game of gameList.value) {
            for (const executable of game.executables) {
                if (executable.process_id === payload) {
                    clearTimerCountdown(payload);
                    executable.is_running = false;
                    executable.process_id = undefined;
                    executable.timer_minutes = null;
                    executable.timer_remaining_seconds = undefined;
                    executable.timer_paused = false;
                    if (!game.executables.some((item) => item.is_running)) {
                        game.is_running = false;
                    }
                    if (currentlyPlaying.value === game.id) {
                        currentlyPlaying.value = null;
                    }
                    addLog('info', `Timer expired for game: ${game.name}`);
                }
            }
        }
    });
});

onUnmounted(() => {
    unlistenProcessStopped?.();
    timerIntervals.forEach((interval) => clearInterval(interval));
    timerIntervals.clear();
});


onClickOutside(searchResultContainerRef, () => {
    searchResultsIsOpen.value = false;
})


const COPYRIGHT_SYMBOL = '\u00A9';
const TRADEMARK_SYMBOL = '\u2122';
const REGISTERED_SYMBOL = '\u00AE';
const ignoredSymbols = [COPYRIGHT_SYMBOL, TRADEMARK_SYMBOL, REGISTERED_SYMBOL];
const ignoredSymbolsRegex = new RegExp(`[${ignoredSymbols.join('')}]`, 'g');
const fuseOptions = computed<UseFuseOptions<Game>>(() => ({
    fuseOptions: {
        keys: [
            { name: 'name', weight: 0.7 },
            { name: 'aliases', weight: 0.2 },
            { name: 'executables.name', weight: 0.1 },
        ],
        getFn: (obj: any, path: string[] | string) => {
            const value = Fuse.config.getFn(obj, path);
            return typeof value === "string"
            ? value.replace(ignoredSymbolsRegex, "")
            : value;
        },
        isCaseSensitive: false,
        threshold: 0.5,        
        includeScore: true,
        includeMatches: false
    },
    resultLimit: 12,
    matchAllWhenSearchEmpty: false,
}));

const { results: searchResults } = useFuse(debouncedSearchQuery, gameDB, fuseOptions)

const selectedGameId = ref<string | null | undefined>(null);

const visibleGameList = computed(() => {
    const query = gameListSearchQuery.value.trim().toLocaleLowerCase();
    return [...gameList.value]
        .filter((game) => !query
            || game.name.toLocaleLowerCase().includes(query)
            || game.aliases?.some((alias) => alias.toLocaleLowerCase().includes(query)))
        .sort((first, second) => first.name.localeCompare(second.name));
});

const selectedGame = computed(() => {
    if (!selectedGameId.value) return null;
    const found = gameList.value.find(g => g.uid === selectedGameId.value);
    console.log('selectedGame computed - selectedGameId:', selectedGameId.value, 'found:', found);
    return found || null;
});

function closeSearchResults() {
    searchResultsIsOpen.value = false;
}
function openSearchResults() {
    searchResultsIsOpen.value = true;
}

function addGameToList(game: Game) {
    addLibraryGame(game);

    closeSearchResults();
}

function isGameOnList(gameId: string) {
    return gameList.value.some((game) => game.id === gameId);
}

function openSavedGameFromSearch(game: Game) {
    const savedGame = gameList.value.find((item) => item.id === game.id);
    if (savedGame) {
        selectGame(savedGame);
    }
}

function toggleGameListSearch() {
    isGameListSearchOpen.value = !isGameListSearchOpen.value;
    if (!isGameListSearchOpen.value) {
        gameListSearchQuery.value = '';
    }
}

const forceRerenderKey = ref(0); 
function removeGameFromList(game: Game) {
    const gameId = game.uid;
    removeLibraryGame(game);
    if (selectedGame.value?.uid === gameId) {
        selectedGameId.value = null;
        forceRerenderKey.value++; 
    }
}

function selectGame(game: Game) {
    selectedGameId.value = game?.uid;
    searchResultsIsOpen.value = false;
}

function returnToLibrary() {
    selectedGameId.value = null;
}

function canCreateDummyGame(game: Game | null) {
    if (!game) {
        return false;
    }
    return !game.is_installed
}

function canPlayGame(game: Game | null) {
    if (!game) {
        return false;
    }
    return (game.is_installed && !game.is_running) ?? false;
}

function isExecutableRunning(executable: GameExecutable) {
    return executable.is_running ?? false;
}
function isGameExecutableInstalled(executable: GameExecutable) {
    return executable.is_installed ?? false;
}

function isGameInstalled(game: Game | null) {
    if (!game) {
        return false;
    }
    return game.is_installed ?? false;
}


async function createDummyGame(game: Game | null, executable: GameExecutable) {
    if (!game) {
        return;
    }
    const gameUid = game.uid;
    const gameToInstall = gameList.value.find(g => g.uid === gameUid);
    const executableItem = gameToInstall?.executables.find(exe => exe.name === executable.name);
    if (gameToInstall && executableItem) {
        const payload =  { 
            path: executable.path,
            executable_name: executable.filename,
            path_len: executable.segments,
            app_id: Number(gameToInstall.id),
        }
        console.log(payload);
        const result = await invoke('create_fake_game', payload)
        console.log('Game created:', result);
        gameToInstall.is_installed = true;
        executableItem.is_installed = true;
        saveLibraryGames();
        return true;
    }
}


async function installAndPlay({game, executable}: {game: Game, executable: GameExecutable}) {
    if (!game) {
        return;
    }
    const gameCreated = await createDummyGame(game, executable);
    if (gameCreated) {
        playGame({game, executable});
    } else {
        console.error('Failed to create game');
        addLog('error', 'Failed to create game');
    }
}
async function playGame({game, executable}: {game: Game, executable: GameExecutable}) {
    if (!game) {
        return;
    }
    const gameUid = game.uid;
    try {
        console.log(`Playing game: ${gameUid}`);
        addLog('info', `Playing game: ${game.name}`);
        addLog('info', `Executable: ${executable.name}`);
        currentlyPlaying.value = game.id;
        const gameToPlay = gameList.value.find(g => g.uid === gameUid);
        const executableItem = gameToPlay?.executables.find(exe => exe.name === executable.name);
        if (gameToPlay && executableItem) {
            const payload =  { 
                name: game.name,
                path: executable.path,
                executable_name: executable.filename,
                path_len: executable.segments,
                app_id: Number(gameToPlay.id),
                exec_path: path.join(executable.path!, executable.filename!),
                timer_minutes: executable.timer_minutes ?? null,
            } 
            const processId = await invoke<number>('run_background_process', payload);
            executableItem.process_id = processId;
            executableItem.timer_minutes = executable.timer_minutes ?? null;
            executableItem.timer_remaining_seconds = executable.timer_minutes
                ? executable.timer_minutes * 60
                : undefined;
            executableItem.timer_paused = false;
            gameToPlay.is_running = true;
            executableItem.is_running = true; 
            startTimerCountdown(executableItem);
        }
       
    } catch (error) {
        console.error('Failed to launch game:', error);
    }
}

async function stopPlaying({game, executable}: {game: Game, executable: GameExecutable}) {
    if (!game) {
        return;
    }
    console.log('Stopped playing game');
    const gameUid = game.uid;
    
    currentlyPlaying.value = null;

    const gameToPlay = gameList.value.find(g => g.uid === gameUid);
    const executableItem = gameToPlay?.executables.find(exe => exe.name === executable.name);
    if (gameToPlay && executableItem) {
        if (executableItem.process_id === undefined) {
            gameToPlay.is_running = false;
            executableItem.is_running = false;
            return;
        }
        try {
            clearTimerCountdown(executableItem.process_id);
            await invoke('stop_process', {
                process_id: executableItem.process_id,
            })
            addLog('info', `Stopped game process: ${game.name}`);
            addLog('info', `Stopped Executable: ${executable.name}`);
        } catch (error) {
            console.error('Failed to stop game process:', error);
            const errorMessage = (error instanceof Error) ? error.message : String(error);
            addLog('error', 'Failed to stop game process' + errorMessage);
            gameToPlay.is_running = false;
            executableItem.is_running = false;
            executableItem.process_id = undefined;
            executableItem.timer_minutes = null;
            executableItem.timer_remaining_seconds = undefined;
            executableItem.timer_paused = false;
        } finally {
            gameToPlay.is_running = false;
            executableItem.is_running = false;
            executableItem.process_id = undefined;
            executableItem.timer_minutes = null;
            executableItem.timer_remaining_seconds = undefined;
            executableItem.timer_paused = false;
        }
    }
}

async function pauseTimer({ executable }: { game: Game; executable: GameExecutable }) {
    if (executable.process_id === undefined) {
        return;
    }
    try {
        executable.timer_remaining_seconds = await invoke<number>('pause_process_timer', {
            process_id: executable.process_id,
        });
        executable.timer_paused = true;
        clearTimerCountdown(executable.process_id);
    } catch (error) {
        addLog('error', `Failed to pause timer: ${String(error)}`);
    }
}

async function resumeTimer({ executable }: { game: Game; executable: GameExecutable }) {
    if (executable.process_id === undefined) {
        return;
    }
    try {
        executable.timer_remaining_seconds = await invoke<number>('resume_process_timer', {
            process_id: executable.process_id,
        });
        executable.timer_paused = false;
        startTimerCountdown(executable);
    } catch (error) {
        addLog('error', `Failed to resume timer: ${String(error)}`);
    }
}

async function cancelTimer({ executable }: { game: Game; executable: GameExecutable }) {
    if (executable.process_id === undefined) {
        return;
    }
    try {
        await invoke('cancel_process_timer', {
            process_id: executable.process_id,
        });
        clearTimerCountdown(executable.process_id);
        executable.timer_minutes = null;
        executable.timer_remaining_seconds = undefined;
        executable.timer_paused = false;
        addLog('info', 'Game timer canceled');
    } catch (error) {
        addLog('error', `Failed to cancel timer: ${String(error)}`);
    }
}

function getExecutables(game: Game) {
    return game.executables.map(exe => exe.name)
}

async function handleTestRPC(game: Game | null) {
    let state = isConnectedToRPC.value ? 'disconnect' : 'connect';

    console.log('Testing RPC for game:', game);
    if (!game && state === 'connect') {
        showDialog('no_game_selected');
        return;
    }
    if (state === 'disconnect' || isConnecting.value) {
        emit('event_disconnect');
        
        isConnectedToRPC.value = false;
        game!.is_running = false;
        currentlyPlaying.value = null;
        isConnecting.value = false;
        return;
    }
    showDialog('rpc_message_1');
}

async function continueRPCRisk(game: Game | null) {
    if (!game) {
        return;
    }
    const gameUid = game.uid;
    const gameToTest = gameList.value.find(g => g.uid === gameUid);
    if (gameToTest) {
        console.log('Testing RPC for game:', gameToTest);
        isConnecting.value = true;
        invoke('connect_to_discord_rpc_3', {
            activity_json: JSON.stringify({
                app_id: gameToTest.id,
            }),
            action: 'connect',
        })
        .then(() => {
            isConnectedToRPC.value = true;
            gameToTest.is_running = true;
            currentlyPlaying.value = gameToTest.id;
            isConnecting.value = false;
        })

        hideDialog();
    }
}

function handleSearchBlur() {
    setTimeout(() => {
        if (!isOnSearchResults.value) {
            searchResultsIsOpen.value = false;
        }
    }, 200);
}

function showDialog(message: DialogKey) {
    isDialogOpen.value = true;
    dialogMessage.value = message;
    dialogKey.value = message;
    if(!isEmpty(message)) {
        dialogRef.value?.showModal();
    }
}

function hideDialog() {
    dialogRef.value?.close(); 
    dialogMessage.value = '';
    isDialogOpen.value = false;
}


provide<GameActionsProvider>(GameActionsKey, {
    canPlayGame,
    isGameInstalled,
    isExecutableRunning,
    isGameExecutableInstalled,
});
</script>

<template>
    <div class="mx-auto max-w-[1600px]">
        <dialog ref="dialogRef" class="fixed inset-0 m-auto w-[min(440px,calc(100%-2rem))] rounded-[28px] bg-app-panel p-[26px] text-app-text shadow-raised">
            <div class="text-sm leading-6 text-app-text-muted"><template v-if="dialogKey === 'rpc_message_1'"><p>This feature is still in development.</p><p class="mt-3">It sends a Discord RPC using the selected game ID instead of waiting for a detected process.</p><p class="mt-3">This may flag your account as suspicious for self-botting.</p></template><p v-else>No game selected. Select a game from your library first.</p></div>
            <div class="mt-6 flex justify-end gap-2"><button type="button" class="neu-motion h-11 rounded-[14px] bg-app-panel px-[18px] text-[13px] text-app-text-muted shadow-raised-sm hover:shadow-raised hover:text-app-text active:shadow-inset" @click="hideDialog">{{ dialogKey === 'rpc_message_1' ? 'Cancel' : 'OK' }}</button><button v-if="dialogKey === 'rpc_message_1'" type="button" class="neu-motion neu-convex h-11 rounded-[14px] bg-app-panel px-[18px] text-[13px] font-semibold text-app-accent shadow-raised-sm hover:shadow-raised hover:text-app-accent-hover active:shadow-inset" @click="continueRPCRisk(selectedGame)">Continue</button></div>
        </dialog>
        <aside v-if="shouldShowNotificationContainer && !allFetchDone" class="fixed left-8 top-28 z-20 space-y-2"><div v-if="isLoadingGH || isLoadingDiscord || isLoadingBundled" class="inline-flex h-13 items-center gap-3 rounded-[26px] bg-app-panel px-[22px] text-sm text-app-text-muted shadow-raised"><span class="size-2 rounded-full bg-app-success shadow-[0_0_8px_var(--app-success)]"/>Refreshing game list</div><TimedNotification :is-ready="isReadyGH || isReadyDiscord || isReadyBundled" :duration="1500" container-class="inline-flex h-13 items-center gap-3 rounded-[26px] bg-app-panel px-[22px] text-sm text-app-text shadow-raised"><span class="size-2 rounded-full bg-app-success shadow-[0_0_8px_var(--app-success)]"/>Game list refreshed</TimedNotification></aside>
        <section v-if="selectedGame" class="mx-auto w-full max-w-3xl rounded-[28px] bg-app-panel p-6 shadow-raised" :key="forceRerenderKey"><button type="button" class="neu-motion mb-6 h-11 rounded-[14px] bg-app-panel px-[18px] text-[13px] font-medium text-app-text-muted shadow-raised-sm hover:shadow-raised hover:text-app-text active:shadow-inset" @click="returnToLibrary">← Back to library</button><div class="flex items-center gap-4"><GameArtwork :game="selectedGame" class="size-[88px]"/><div class="min-w-0"><h1 class="truncate text-[22px] font-bold">{{ selectedGame.name }}</h1><p class="mt-1 flex items-center gap-2 text-xs text-app-text-muted"><span class="text-app-accent" aria-hidden="true">✓</span>Verified by Discord</p></div></div><button type="button" class="neu-motion mt-5 h-11 w-full rounded-[14px] bg-app-panel px-[18px] text-[13px] text-app-text-muted shadow-raised-sm hover:shadow-raised hover:text-app-text active:shadow-inset" @click="handleTestRPC(selectedGame)">{{ isConnecting || isConnectedToRPC ? 'Disconnect Discord gateway' : 'Test RPC' }}</button><div class="mt-6"><GameExecutables :game="selectedGame" @play="playGame" @stop="stopPlaying" @install_and_play="installAndPlay" @pause_timer="pauseTimer" @resume_timer="resumeTimer" @cancel_timer="cancelTimer" /></div><div class="mt-6 rounded-[18px] bg-app-panel p-4 shadow-inset"><h2 class="text-xs font-semibold uppercase tracking-[0.06em] text-app-text-muted">Status</h2><p class="mt-2 text-sm text-app-text-muted"><template v-if="currentlyPlaying"><span class="mr-2 inline-block size-2 rounded-full bg-app-success shadow-[0_0_8px_var(--app-success)]"/>Running {{ gameList.find((game) => game.id === currentlyPlaying)?.name }}</template><template v-else>Not playing any game</template></p></div></section>
        <template v-else>
        <section class="mb-6 flex flex-wrap items-end justify-between gap-5"><div><h1 class="text-[30px] font-bold tracking-[-0.02em]">Library</h1><p class="mt-1 text-sm text-app-text-muted">{{ gameList.length }} games added</p></div><div ref="searchResultContainerRef" class="relative w-full max-w-sm"><div class="flex h-12 items-center gap-2.5 rounded-3xl bg-app-panel px-[18px] shadow-inset focus-within:outline-2 focus-within:outline-app-accent focus-within:outline-offset-[3px]"><svg class="size-4 shrink-0 text-app-text-muted" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg><input v-model="searchQuery" type="search" placeholder="Search verified games" class="min-w-0 flex-1 appearance-none border-0 bg-transparent text-sm text-app-text outline-none ring-0 placeholder:text-app-text-muted focus:border-transparent focus:outline-none focus:ring-0 focus-visible:!outline-none" @focus="openSearchResults" @blur="handleSearchBlur"/><button type="button" class="text-xs text-app-accent hover:text-app-accent-hover" @click="fetchGameList">Refresh</button></div><div v-if="searchResultsIsOpen" class="absolute z-50 mt-3 max-h-80 w-full overflow-y-auto rounded-[18px] bg-app-panel p-3 shadow-inset" @click="isOnSearchResults = true"><div v-for="game in searchResults" :key="game.item.id" class="mb-2 flex items-center gap-3 rounded-[14px] bg-app-panel p-3 shadow-raised-sm last:mb-0" :class="isGameOnList(game.item.id) ? 'cursor-pointer hover:bg-app-panel-hover' : ''" :role="isGameOnList(game.item.id) ? 'button' : undefined" :tabindex="isGameOnList(game.item.id) ? 0 : undefined" @click="isGameOnList(game.item.id) && openSavedGameFromSearch(game.item)" @keydown.enter="isGameOnList(game.item.id) && openSavedGameFromSearch(game.item)" @keydown.space.prevent="isGameOnList(game.item.id) && openSavedGameFromSearch(game.item)"><GameArtwork :game="game.item" class="size-10"/><div class="min-w-0 flex-1"><p class="truncate text-sm font-medium">{{ game.item.name }}</p><p class="text-xs text-app-text-muted">{{ game.item.executables.length }} executables</p></div><button type="button" class="neu-motion neu-convex h-11 shrink-0 rounded-[14px] bg-app-panel px-3 text-[13px] font-semibold text-app-accent shadow-raised-sm disabled:opacity-45" :disabled="isGameOnList(game.item.id)" @click.stop="addGameToList(game.item)">{{ isGameOnList(game.item.id) ? 'Added' : 'Add' }}</button></div><p v-if="searchResults.length === 0" class="p-3 text-sm text-app-text-muted">Search for a game by name.</p></div></div></section>
        <div><section><div class="mb-4 flex items-center justify-between"><h2 class="text-xl font-bold">Your games</h2><button type="button" class="neu-motion grid size-11 place-items-center rounded-full bg-app-panel text-app-text-muted shadow-raised-sm hover:shadow-raised hover:text-app-text active:shadow-inset" aria-label="Search your games" @click="toggleGameListSearch"><svg class="size-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></svg></button></div><div v-if="isGameListSearchOpen" class="mb-5 flex h-12 items-center rounded-3xl bg-app-panel px-[18px] shadow-inset"><input v-model="gameListSearchQuery" type="search" placeholder="Search your library" class="w-full bg-transparent text-sm outline-none" aria-label="Search games in your list"/></div><p v-if="gameList.length === 0" class="rounded-[22px] bg-app-panel p-8 text-center text-sm text-app-text-muted shadow-raised">No games added. Search above to add one.</p><p v-else-if="visibleGameList.length === 0" class="text-center text-sm text-app-text-muted">No matching games.</p><div v-else class="grid gap-[22px] sm:grid-cols-2 md:grid-cols-3"><button v-for="game in visibleGameList" :key="game.id" type="button" class="neu-motion rounded-[22px] bg-app-panel p-3.5 text-left shadow-raised hover:shadow-raised-sm" :class="selectedGame?.uid === game.uid ? 'shadow-inset' : ''" @click="selectGame(game)"><GameArtwork :game="game" variant="cover" class="size-[88px]"/><div class="mt-3 flex items-start justify-between gap-2"><div class="min-w-0"><p class="truncate text-[15px] font-semibold" :class="selectedGame?.uid === game.uid ? 'text-app-accent' : ''">{{ game.name }}</p><p class="mt-1 flex items-center gap-2 text-xs text-app-text-muted"><span class="size-2 rounded-full" :class="game.is_running ? 'bg-app-success shadow-[0_0_8px_var(--app-success)]' : game.is_installed ? 'bg-app-dot-idle' : 'bg-app-dot-off'"/>{{ game.is_running ? 'Running' : game.is_installed ? 'Ready' : 'Not installed' }}</p></div><button v-if="!game.is_running" type="button" class="text-xs text-app-danger hover:text-app-text" @click.stop="removeGameFromList(game)">Remove</button></div></button></div></section></div>
        <section class="mt-6 rounded-[20px] bg-app-panel px-5 py-4 font-mono text-xs leading-[1.8] text-app-text-muted shadow-inset"><p v-if="!logs.length">Activity log is empty.</p><p v-for="(log, index) in logs.slice(-5)" :key="index">{{ new Date(log.timestamp).toLocaleTimeString() }} {{ log.message }}</p></section>
        </template>
    </div>
</template>


<style scoped>
dialog::backdrop { background: rgb(0 0 0 / 70%); }
</style>
