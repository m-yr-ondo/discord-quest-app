import { createGlobalState } from '@vueuse/core';
import { randomString } from '@/utils/random-string';
import { loadSavedGames, mergeGameCatalogEntry, rehydrateSavedGames, saveSavedGames } from '@/services/saved-games';
import { useFetchGameList } from './fetch-gamelist';
import type { Game } from '@/types/types';
import { ref, watch } from 'vue';

export const useGameLibrary = createGlobalState(() => {
    const fetchState = useFetchGameList();
    const gameList = ref<Game[]>([]);

    function hydrateSavedGames() {
        const savedGames = loadSavedGames();
        const savedGameIds = savedGames.map((game) => game.id);
        const currentGames = new Map(gameList.value.map((game) => [game.id, game]));
        const restoredGames = rehydrateSavedGames(savedGames, fetchState.gameDB.value, randomString);
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

    watch(fetchState.bundledReady, (isReady) => {
        if (isReady) {
            hydrateSavedGames();
        }
    });

    watch(fetchState.remoteRefreshed, (isRefreshed) => {
        if (isRefreshed) {
            hydrateSavedGames();
        }
    });

    function addGameToList(game: Game) {
        if (gameList.value.some((item) => item.id === game.id)) {
            return;
        }

        gameList.value.push({ uid: randomString(), ...game });
        saveSavedGames(gameList.value);
    }

    function removeGameFromList(game: Game) {
        gameList.value = gameList.value.filter((item) => item.uid !== game.uid);
        saveSavedGames(gameList.value);
    }

    return {
        ...fetchState,
        gameList,
        hydrateSavedGames,
        addGameToList,
        removeGameFromList,
        saveSavedGames: () => saveSavedGames(gameList.value),
    };
});
