import { Game } from '@/types/types';
import { fetch, ClientOptions } from '@tauri-apps/plugin-http';
import { tryOnMounted, useAsyncState } from '@vueuse/core';
import { ref, watch } from 'vue';
import { message } from '@tauri-apps/plugin-dialog'; 
import { invoke } from '@tauri-apps/api/core';
import { useGlobalState } from './app-state';
import { normalizeGameCatalogEntry } from '@/services/game-executables';
import { withGameArtwork } from '@/services/game-artwork';

function parseGameListResponse(response: unknown): unknown {
    if (typeof response === 'string') {
        return JSON.parse(response);
    }

    if (response instanceof ArrayBuffer) {
        return JSON.parse(new TextDecoder().decode(response));
    }

    if (response instanceof Uint8Array) {
        return JSON.parse(new TextDecoder().decode(response));
    }

    if (Array.isArray(response) && response.every((value) => typeof value === 'number')) {
        return JSON.parse(new TextDecoder().decode(new Uint8Array(response)));
    }

    return response;
}

function getErrorMessage(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}

function getGameListValidationError(data: unknown): string | null {
    if (!Array.isArray(data)) {
        return `expected an array but received ${data === null ? 'null' : typeof data}`;
    }

    if (data.length === 0) {
        return 'received an empty array';
    }

    const firstEntry = data[0];
    if (!firstEntry || typeof firstEntry !== 'object') {
        return 'the first array entry is not a game object';
    }

    const requiredFields = ['aliases', 'name', 'executables'];
    const missingFields = requiredFields.filter((field) => !(field in firstEntry));
    return missingFields.length === 0 ? null : `the first entry is missing ${missingFields.join(', ')}`;
}

export function useFetchGameList() {
    const { addLog } = useGlobalState();
    async function fetchGameListGHMirror() {
        addLog('Fetching game list from GitHub mirror...'); 
        const response = await invoke('fetch_gamelist_gh_mirror');
        return parseGameListResponse(response) as Game[] | unknown[] | undefined;
    }
    async function fetchGameListFromDiscord (){
        addLog('Fetching game list directly from discord...'); 
        const response = await invoke('fetch_gamelist_from_discord');
        return parseGameListResponse(response) as Game[] | unknown[] | undefined;
    };


    const { 
        state: gameListGHMirror,
        error: errorGH,
        isReady: isReadyGH,
        execute: executeGH,
        isLoading: isLoadingGH
    } = useAsyncState<Game[] | unknown[] | undefined>(fetchGameListGHMirror, [], {
            immediate: false,
            resetOnExecute: true,
        });
    const { 
        state: gameListFromDiscord, 
        error: errorDiscord,
        isReady: isReadyDiscord,
        execute: executeDiscord,
        isLoading: isLoadingDiscord
    } = useAsyncState(fetchGameListFromDiscord, [], {
        immediate: false,
        resetOnExecute: true,
    });
    const { 
        state: bundledGameList,
        error: errorBundled,
        isReady: isReadyBundled,
        execute: executeBundled,
        isLoading: isLoadingBundled
    } = useAsyncState(() => {
        const result = import('../assets/gamelist.json').then(res=>res.default);
        addLog('Fetching bundled game list for fallback...');
        return result;
    }, [], {
        immediate: false,
        resetOnExecute: true,
    });

    const fetchError = ref<string | null>(null);

    const gameDB = ref<Game[]>([]);

    const allFetchDone = ref(false);
    const bundledReady = ref(false);
    const remoteRefreshed = ref(false);

    function isValidGameList(data: unknown): data is Game[] {
        return getGameListValidationError(data) === null;
    }

    watch(() => isReadyGH.value, async (newVal) => {
        addLog('debug','isReadyGH: ' + newVal); 
    });

    watch(() => isReadyDiscord.value, async (newVal) => {
        addLog('debug','isReadyDiscord: ' + newVal);
    })
    
    watch(() => isReadyBundled.value, async (newVal) => {
        addLog('debug','isReadyBundled: ' + newVal); 
    });

    async function refreshRemoteGameList() {
        try {
            await executeGH();
        } catch (error) {
            addLog('error', 'Error fetching game list from GitHub mirror: ' + getErrorMessage(error));
        }

        if (errorGH.value) {
            addLog('error', 'Error fetching game list from GitHub mirror: ' + getErrorMessage(errorGH.value));
        } else if (isValidGameList(gameListGHMirror.value)) {
            gameDB.value = gameListGHMirror.value.map(normalizeGameCatalogEntry).map(withGameArtwork);
            remoteRefreshed.value = true;
            addLog('Using refreshed game list from GitHub mirror. ' + gameListGHMirror.value.length + ' entries.');
            return;
        } else {
            addLog('warning', 'GitHub mirror returned an invalid game list: ' + getGameListValidationError(gameListGHMirror.value));
        }

        try {
            await executeDiscord();
        } catch (error) {
            addLog('error', 'Error fetching game list from Discord: ' + getErrorMessage(error));
        }

        if (errorDiscord.value) {
            addLog('error', 'Error fetching game list from Discord: ' + getErrorMessage(errorDiscord.value));
        } else if (isValidGameList(gameListFromDiscord.value)) {
            gameDB.value = gameListFromDiscord.value.map(normalizeGameCatalogEntry).map(withGameArtwork);
            remoteRefreshed.value = true;
            addLog('Using refreshed game list from Discord. ' + gameListFromDiscord.value.length + ' entries.');
            return;
        } else {
            addLog('warning', 'Discord returned an invalid game list: ' + getGameListValidationError(gameListFromDiscord.value));
        }

        addLog('warning', 'Remote game list refresh failed; keeping the bundled game list.');
    }

    async function fetchGameList() {
        allFetchDone.value = false;
        bundledReady.value = false;
        remoteRefreshed.value = false;
        fetchError.value = null;
        addLog('Fetching bundled game list...');

        try {
            await executeBundled();
        } catch (error) {
            addLog('error', 'Error fetching bundled game list: ' + getErrorMessage(error));
        }

        if (isValidGameList(bundledGameList.value)) {
            gameDB.value = bundledGameList.value.map(normalizeGameCatalogEntry).map(withGameArtwork);
            addLog('Using bundled game list. ' + bundledGameList.value.length + ' entries.');
        }

        bundledReady.value = true;
        allFetchDone.value = true;
        void refreshRemoteGameList();
    }

    tryOnMounted(async () => {
        await fetchGameList();
    });


    return {
        gameListGHMirror,
        gameListFromDiscord,
        bundledGameList,
        fetchError,
        isReadyGH,
        isReadyDiscord,
        isReadyBundled,
        gameDB,
        fetchGameList,
        isLoadingGH,
        isLoadingDiscord,
        isLoadingBundled,
        allFetchDone,
        bundledReady,
        remoteRefreshed
    }
}
