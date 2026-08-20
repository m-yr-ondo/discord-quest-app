<script setup lang="ts">
import { ref, computed, useTemplateRef, shallowRef, provide, nextTick, triggerRef, watch } from 'vue';
import { onClickOutside, refDebounced, tryOnMounted } from '@vueuse/core';
import { useFuse } from '@vueuse/integrations/useFuse'
import { invoke } from '@tauri-apps/api/core';
import { randomString } from '@/utils/random-string';
import { GameActionsProvider, GameExecutable, type Game } from '@/types/types';
import IconVerified from '@/components/IconVerified.vue';
import { isEmpty } from 'lodash-es';
import GameExecutables from '@/components/GameExecutables.vue';
import GameArtwork from '@/components/GameArtwork.vue';
import { GameActionsKey } from '@/constants/constants';
import { path } from '@tauri-apps/api';
import { emit } from '@tauri-apps/api/event';
import { useFetchGameList } from '@/composables/fetch-gamelist';
import { UseFuseOptions } from '@vueuse/integrations';
import Fuse from 'fuse.js';
import { useGlobalState } from '@/composables/app-state';
import TimedNotification from '@/components/TimedNotification.vue';
import { loadSavedGames, mergeGameCatalogEntry, rehydrateSavedGames, saveSavedGames } from '@/services/saved-games';


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
    bundledReady,
    remoteRefreshed,
} = useFetchGameList()
const { addLog } = useGlobalState();
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

const currentlyPlaying = ref<string | null>(null);


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

const gameList = ref<Game[]>([]);
const selectedGameId = ref<string | null | undefined>(null);

function hydrateSavedGames() {
    const savedGames = loadSavedGames();
    const savedGameIds = savedGames.map((game) => game.id);
    const currentGames = new Map(gameList.value.map((game) => [game.id, game]));
    const restoredGames = rehydrateSavedGames(savedGames, gameDB.value, randomString);
    const restoredById = new Map(restoredGames.map((game) => [game.id, game]));

    gameList.value = savedGameIds.flatMap((gameId) => {
        const restoredGame = restoredById.get(gameId);
        const currentGame = currentGames.get(gameId);

        if (restoredGame && currentGame) {
            return [mergeGameCatalogEntry(currentGame, restoredGame)];
        }
        if (restoredGame) {
            return [restoredGame];
        }
        if (currentGame) {
            return [currentGame];
        }

        return [];
    });
}

watch(bundledReady, (isReady) => {
    if (!isReady) {
        return;
    }

    hydrateSavedGames();
});

watch(remoteRefreshed, (isRefreshed) => {
    if (isRefreshed) {
        hydrateSavedGames();
    }
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
    if (!gameList.value.some(g => g.id === game.id)) {
        gameList.value.push({
            uid: randomString(),
            ...game
        });
        saveSavedGames(gameList.value);
    }

    closeSearchResults();
}

const forceRerenderKey = ref(0); 
function removeGameFromList(game: Game) {
    const gameId = game.uid;
    gameList.value = gameList.value.filter(game => game.uid !== gameId);
    saveSavedGames(gameList.value);
    if (selectedGame.value?.uid === gameId) { 
        selectedGameId.value = null;
        forceRerenderKey.value++; 
    }
}

function selectGame(game: Game) {
    selectedGameId.value = game?.uid;
    searchResultsIsOpen.value = false;
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
            } 
            await invoke('run_background_process', payload);
            gameToPlay.is_running = true;
            executableItem.is_running = true; 
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
        try {
            await invoke('stop_process', {
                exec_name: executable.filename!
            })
            addLog('info', `Stopped game process: ${game.name}`);
            addLog('info', `Stopped Executable: ${executable.name}`);
        } catch (error) {
            console.error('Failed to stop game process:', error);
            const errorMessage = (error instanceof Error) ? error.message : String(error);
            addLog('error', 'Failed to stop game process' + errorMessage);
            gameToPlay.is_running = false;
            executableItem.is_running = false;
        } finally {
            gameToPlay.is_running = false;
            executableItem.is_running = false;
        }
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
    <div class="container mx-auto px-4 py-8">
        <dialog id="dialog" class="dialogStyle inset-0 bg-gray-800 bg-opacity-50
        border border-app-border rounded-lg
        transition-opacity duration-300 ease-in-out z-50
        "
        style="left: 50%; top: 50%; transform: translate(-50%, -50%)"
        ref="dialogRef">
            <div class="flex flex-col items-center justify-center p-6" >
                <div class="mb-4 text-app-text-muted">
                    <div v-if="dialogKey === 'rpc_message_1'">
                        <p>
                        This is only a feature in development.  
                        </p>
                        <p class="my-2">
                            It works but due to the nature that it tricks Discord into thinking you are playing a game
                            by sending an RPC using actual game ID rather than letting Discord detect you have a game/application running. 
                        </p>
                        <p>
                        This may flag your account as suspicious for self-botting.
                        </p>
                    </div>

                    <div v-if="dialogKey === 'no_game_selected'">
                        <p>
                            No game selected. Please select a game from the list on the left.
                        </p>
                    </div>
                </div>
                <div class="gap-2 flex">
                    <button
                    
                    class="
                text-app-text-muted hover:text-app-text 
                border border-app-border rounded-lg px-4 py-1"
                @click="hideDialog()">
                    <span  v-if="dialogKey == 'rpc_message_1'">
                        Cancel 
                    </span>
                    <span v-else>OK</span>
                </button>
                
                <button 
                v-if="dialogKey === 'rpc_message_1'"
                class="text-app-text-muted hover:text-app-text 
                border border-app-border rounded-lg px-4 py-1"
                @click="continueRPCRisk(selectedGame)">
                    Accept risk and continue
                </button>
                </div>
            </div>
        </dialog>
        <Transition 
            enter-active-class="transition-opacity duration-300 delay-100 ease-in-out"
            leave-active-class="transition-opacity duration-600 delay-100 ease-in-out"  
            enter-from-class="opacity-0 translate-y-2 ease-in-out"
            enter-to-class="opacity-100 translate-y-0 ease-in-out"
        >
            <div class="absolute top-20 left-4 z-20 " v-if="shouldShowNotificationContainer && !allFetchDone">
                <Transition 
                    enter-active-class="transition-opacity duration-300 delay-100 ease-in-out"
                    leave-active-class="transition-opacity duration-600 delay-100 ease-in-out"  
                    enter-from-class="opacity-0 translate-y-2 ease-in-out"
                    enter-to-class="opacity-100 translate-y-0 ease-in-out"
                >
                    <div v-if="isLoadingGH" class="text-sm text-app-text-muted">
                        Fetching game list from GitHub mirror... 
                      <div class="border-full h-2 w-2 bg-green-500 rounded-full inline-block ml-2 animate-pulse"></div>
                    </div>
                </Transition>
                <TimedNotification
                    :is-ready="isReadyGH" 
                    :duration="1500"
                    container-class="text-sm text-app-text-muted"
                > 
                    Game list from mirror fetched <span class="text-green-400">✓</span>
                </TimedNotification>

                <Transition 
                    enter-active-class="transition-opacity duration-300 delay-100 ease-in-out"
                    leave-active-class="transition-opacity duration-600 delay-100 ease-in-out"  
                    enter-from-class="opacity-0 translate-y-2 ease-in-out"
                    enter-to-class="opacity-100 translate-y-0 ease-in-out"
                >
                    <div v-if="isLoadingDiscord" class="text-sm text-app-text-muted">
                        Fetching game list directly from Discord...
                        <div class="border-full h-2 w-2 bg-green-500 rounded-full inline-block ml-2 animate-pulse"></div>
                    </div>
                </Transition>
                <TimedNotification
                    :is-ready="isReadyDiscord" 
                    :duration="1500"
                    container-class="text-sm text-app-text-muted"
                > 
                    Game list from Discord fetched <span class="text-green-400">✓</span>
                </TimedNotification>

                
                <Transition 
                    enter-active-class="transition-opacity duration-300 delay-100 ease-in-out"
                    leave-active-class="transition-opacity duration-600 delay-100 ease-in-out"  
                    enter-from-class="opacity-0 translate-y-2 ease-in-out"
                    enter-to-class="opacity-100 translate-y-0 ease-in-out"
                >
                    <div v-if="isLoadingBundled" class="text-sm text-app-text-muted">
                        Fetching game list from bundled game list...
                        <div class="border-full h-2 w-2 bg-green-500 rounded-full inline-block ml-2 animate-pulse"></div>
                    </div>
                </Transition>
                <TimedNotification
                    :is-ready="isReadyBundled" 
                    :duration="1500"
                    container-class="text-sm text-app-text-muted"
                > 
                    Game list from bundle pre-loaded <span class="text-green-400">✓</span>
                </TimedNotification>

            </div>
        </Transition>

        <div class="mb-8">
            <div class="relative" ref="searchResultContainerRef">
               <div>
<input v-model="searchQuery" type="text" placeholder="Search Discord Verified games..."
                     class="w-full px-4 py-2 border border-app-border rounded-lg focus:ring-2 focus:ring-app-accent focus:border-app-accent bg-app-panel text-app-text"
                     @focus="openSearchResults" @blur="handleSearchBlur" />

                <button
                    @click="fetchGameList()"
                    class="absolute right-0 top-1/2 transform -translate-y-1/2 px-3 mr-2 py-1 text-sm bg-app-panel-hover hover:bg-app-border text-app-text rounded-md">
                    <span class="wrap whitespace-nowrap text-xs">
                        Refetch Game List
                    </span>
                </button>
               </div>
                <div v-if="searchResultsIsOpen" @click="isOnSearchResults = true"
                    class="absolute z-50 mt-1 w-full bg-app-panel border border-app-border rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    <div v-if="searchResults.length > 0">
                        <div v-for="game in searchResults" :key="game.item.id"
                            class="p-3 hover:bg-app-panel-hover border-b border-app-border last:border-b-0">
                            <div class="flex justify-between items-center gap-3">
                                <div class="flex items-start gap-3 min-w-0">
                                    <GameArtwork :game="game.item" class="w-10 h-10" />
                                    <div class="min-w-0">
                                    <div class="font-medium text-app-text">
                                        {{ game.item.name }}
                                    </div>
                                    <div class="text-sm text-app-text-muted">ID: {{ game.item.id }}</div>
                                    <div class="text-xs text-app-text-muted">
                                        Executables:
                                        <ul class="list-disc list-inside">
                                            <li v-for="exe in game.item.executables" :key="exe.name"
                                                class="text-app-text-muted">
                                                <span class="font-mono">
                                                {{ exe.name }}
                                                ({{ exe.os }})</span>
                                            </li>
                                        </ul>
                                    </div>
                                    </div>
                                </div>
                                <button @click="addGameToList(game.item)"
                                    class="ml-2 px-3 py-1 text-sm bg-app-accent hover:bg-app-accent-hover text-white rounded-md">
                                    Add game to list
                                </button>
                            </div>
                        </div>
                    </div>
                    <div v-if="searchResults.length === 0"
                        class="p-3 hover:bg-app-panel-hover border-b border-app-border last:border-b-0 text-app-text-muted">
                        Search for games by name. <br>
                        Click "Add game to list" to add them to your selected games.
                    </div>
                </div>
            </div>
        </div>

        <div class="grid grid-cols-1 md:grid-cols-2 gap-6 relative">
            <div class="bg-app-panel p-4 rounded-lg shadow">
                <h2
                    class="text-xl font-bold text-app-text mb-4 sticky top-0 bg-app-panel py-2 z-10">
                    Games</h2>
                <div v-if="gameList.length === 0" class="text-app-text-muted text-center py-8">
                    No games selected. Search and add games from the search bar.
                </div>
                <div v-else class="space-y-4">
                    <div v-for="game in gameList" :key="game.id" 
                        class="p-3 border border-app-border rounded-lg
                        hover:bg-app-panel-hover transition-colors 
                        duration-200 ease-in-out" 
                        :class="[
                            {
                                'ring-1 ring-app-accent/40 shadow-[0px_0px_8px_2px_#8e51ff50] bg-app-panel-hover': selectedGame?.uid === game.uid,
                            }
                        ]" @click="selectGame(game)"
                    >
                        <div class="flex justify-between items-center">
                            <div class="flex items-center gap-3 min-w-0">
                                <GameArtwork :game="game" class="w-10 h-10" />
                                <div class="flex items-center gap-1 min-w-0">
                                <div class="font-medium text-app-text">{{ game.name }}</div>
                                <div class="relative inline-flex items-center">
                                    <div class="w-2 h-2 bg-white absolute rounded-full" style="left: 50%; top: 50%; transform: translate(-50%, -50%)"></div>
                                    <div class="relative inline-block">
                                     <IconVerified class="w-5 h-5 text-app-accent"></IconVerified>
                                    </div>
                                </div>
                                </div>
                            </div>
                            <button @click="removeGameFromList(game)" class="text-app-danger hover:text-red-400"
                                v-if="!game.is_running"> 
                                Remove
                            </button>
                        </div>
                        <div class="flex space-x-2 mt-2">
                            <div class="text-sm text-green-500 dark:text-green-400" v-if="game.is_running">
                                Running
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="bg-app-panel p-4 rounded-lg shadow md:sticky md:top-4 self-start" :key="forceRerenderKey">
                <h2 class="text-xl font-bold text-app-text mb-4">Game Actions</h2>
                <div class="space-y-4">
                    <div class="text-app-text-muted mb-2 text-sm" v-if="!selectedGame || selectedGame === null">
                        Select a game from the left to perform actions.
                    </div>
                    
                    <div v-if="selectedGame" class="text-app-text-muted mb-4 text-sm">
                        <GameArtwork :game="selectedGame" variant="cover" class="w-full h-28 mb-4" />
                        <strong>Name:</strong> {{ selectedGame.name }}<br>
                        <strong>ID:</strong> {{ selectedGame.id }}<br>
                        <strong v-if="selectedGame.aliases && selectedGame.aliases.length > 0">Aliases:</strong>
                        <ul v-if="selectedGame.aliases && selectedGame.aliases.length > 0" class="list-disc list-inside" >
                            <li v-for="alias in selectedGame.aliases" :key="alias"
                                class="text-app-text-muted">
                                <span class="font-mono">{{ alias }}</span>
                            </li>
                        </ul>
                    </div>
                    <button @click="handleTestRPC(selectedGame)"
                        class="w-full py-2 rounded-lg bg-gray-600 hover:bg-gray-700 text-white">
                        {{ isConnecting || isConnectedToRPC ? 'Disconnect to Discord Gateway' : 'Test RPC' }}
                    </button>

                    <div class="border-t border-app-border my-4"></div>

                    <GameExecutables v-if="selectedGame" :game="selectedGame" 
                        @play="playGame"
                        @stop="stopPlaying"
                        @install_and_play="installAndPlay"
                    />

                </div>

                <div class="border-t border-app-border my-5"></div>

                <div class="mt-6 p-4 border border-app-border rounded-lg">
                    <h3 class="font-medium text-app-text mb-2">Status</h3>
                    <div class="text-sm text-app-text-muted mb-2">
                        Check Discord to see if it displays that you are playing a game.
                    </div>
                    <div v-if="currentlyPlaying" class="text-app-text-muted">
                        Currently playing: <span class="text-green-600"> {{gameList.find(g => g.id ===
                            currentlyPlaying)?.name }}</span>
                    </div>
                    <div v-else class="text-app-text-muted">
                        Not playing any game
                    </div>
                </div>

                <div v-if="selectedGame" class="my-4">
                    <h3 class="font-medium text-app-text mb-2">Game Info</h3>
                </div>
            </div>
        </div>
    </div>
</template>

<style scoped>
@reference "../theme/style.css";

.dialogStyle::backdrop {
    @apply bg-black/70 backdrop-blur-xs;
}
</style>
