import { Game } from '@/types/types';
import { fetch, ClientOptions } from '@tauri-apps/plugin-http';
import { tryOnMounted, useAsyncState } from '@vueuse/core';
import { ref, watch } from 'vue';
import { message } from '@tauri-apps/plugin-dialog'; 
import { invoke } from '@tauri-apps/api/core';
import { useGlobalState } from './app-state';
import { normalizeGameCatalogEntry } from '@/services/game-executables';

export function useFetchGameList() {
    const { addLog } = useGlobalState();
    async function fetchGameListGHMirror() {
        addLog('Fetching game list from GitHub mirror...'); 
        const response = await invoke('fetch_gamelist_gh_mirror');
        return response as Game[] | unknown[] | undefined;
    }
    async function fetchGameListFromDiscord (){
        addLog('Fetching game list directly from discord...'); 
        const response = await invoke('fetch_gamelist_from_discord');
        return response as Game[] | unknown[] | undefined;
    };

    // const fetchBundledGameList = fetch(window.location.origin+'/gamelist.json', { method: 'GET' });

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

    function isValidGameList(data: any): boolean {
        return Array.isArray(data) && data[0] && 'aliases' in data[0] && 'name' in data[0] && 'executables' in data[0];
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
            const message = error instanceof Error ? error.message : String(error);
            addLog('error', 'Error fetching game list from GitHub mirror: ' + message);
        }

        if (gameListGHMirror.value && gameListGHMirror.value.length > 0 && isValidGameList(gameListGHMirror.value)) {
            gameDB.value = (gameListGHMirror.value as Game[]).map(normalizeGameCatalogEntry);
            remoteRefreshed.value = true;
            addLog('Using refreshed game list from GitHub mirror. ' + gameListGHMirror.value.length + ' entries.');
            return;
        }

        try {
            await executeDiscord();
        } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            addLog('error', 'Error fetching game list from Discord: ' + message);
        }

        if (gameListFromDiscord.value && gameListFromDiscord.value.length > 0 && isValidGameList(gameListFromDiscord.value)) {
            gameDB.value = (gameListFromDiscord.value as Game[]).map(normalizeGameCatalogEntry);
            remoteRefreshed.value = true;
            addLog('Using refreshed game list from Discord. ' + gameListFromDiscord.value.length + ' entries.');
            return;
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
            const message = error instanceof Error ? error.message : String(error);
            addLog('error', 'Error fetching bundled game list: ' + message);
        }

        if (bundledGameList.value.length > 0 && isValidGameList(bundledGameList.value)) {
            gameDB.value = (bundledGameList.value as Game[]).map(normalizeGameCatalogEntry);
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
