import type { Game } from '@/types/types';

export const SAVED_GAME_IDS_STORAGE_KEY = 'discord-quest-completer:saved-game-ids';

export type SavedGamesStorage = Pick<Storage, 'getItem' | 'setItem'>;

export type SavedGameSnapshot = {
    readonly id: string;
    readonly icon_url?: string;
    readonly cover_image_url?: string;
};

type SavedGamesRecordV1 = {
    readonly version: 1;
    readonly gameIds: readonly string[];
};

type SavedGamesRecordV2 = {
    readonly version: 2;
    readonly games: readonly SavedGameSnapshot[];
};

type SavedGamesRecord = SavedGamesRecordV1 | SavedGamesRecordV2;

function getBrowserStorage(): SavedGamesStorage {
    if (typeof localStorage === 'undefined') {
        throw new Error('localStorage is unavailable');
    }

    return localStorage;
}

function isSavedGamesRecord(value: unknown): value is SavedGamesRecord {
    if (typeof value !== 'object' || value === null || !('version' in value) || !('gameIds' in value)) {
        if (typeof value !== 'object' || value === null || !('version' in value) || !('games' in value)) {
            return false;
        }

        const games = value.games;
        return value.version === 2
            && Array.isArray(games)
            && games.every((game) => {
                if (typeof game !== 'object' || game === null || !('id' in game)) {
                    return false;
                }

                return typeof game.id === 'string'
                    && (!('icon_url' in game) || typeof game.icon_url === 'string')
                    && (!('cover_image_url' in game) || typeof game.cover_image_url === 'string');
            });
    }

    return value.version === 1
        && Array.isArray(value.gameIds)
        && value.gameIds.every((gameId) => typeof gameId === 'string');
}

export function loadSavedGames(storage: SavedGamesStorage = getBrowserStorage()): SavedGameSnapshot[] {
    const savedValue = storage.getItem(SAVED_GAME_IDS_STORAGE_KEY);
    if (savedValue === null) {
        return [];
    }

    try {
        const parsedValue: unknown = JSON.parse(savedValue);
        if (!isSavedGamesRecord(parsedValue)) {
            console.warn('Ignoring invalid saved game data.');
            return [];
        }

        if (parsedValue.version === 1) {
            return [...new Set(parsedValue.gameIds)].map((id) => ({ id }));
        }

        const uniqueGames = new Map(parsedValue.games.map((game) => [game.id, game]));
        return [...uniqueGames.values()];
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.warn('Ignoring malformed saved game data.');
            return [];
        }

        throw error;
    }
}

export function loadSavedGameIds(storage: SavedGamesStorage = getBrowserStorage()): string[] {
    return loadSavedGames(storage).map((game) => game.id);
}

export function saveSavedGameIds(
    gameIds: readonly string[],
    storage: SavedGamesStorage = getBrowserStorage(),
): void {
    const savedValue: SavedGamesRecord = {
        version: 1,
        gameIds: [...new Set(gameIds)],
    };

    storage.setItem(SAVED_GAME_IDS_STORAGE_KEY, JSON.stringify(savedValue));
}

export function saveSavedGames(
    games: readonly Pick<Game, 'id' | 'icon_url' | 'cover_image_url'>[],
    storage: SavedGamesStorage = getBrowserStorage(),
): void {
    const uniqueGames = new Map<string, SavedGameSnapshot>();
    games.forEach((game) => {
        uniqueGames.set(game.id, {
            id: game.id,
            ...(game.icon_url ? { icon_url: game.icon_url } : {}),
            ...(game.cover_image_url ? { cover_image_url: game.cover_image_url } : {}),
        });
    });

    const savedValue: SavedGamesRecordV2 = {
        version: 2,
        games: [...uniqueGames.values()],
    };

    storage.setItem(SAVED_GAME_IDS_STORAGE_KEY, JSON.stringify(savedValue));
}

export function rehydrateSavedGames(
    savedGames: readonly (string | SavedGameSnapshot)[],
    catalog: readonly Game[],
    createUid: () => string,
): Game[] {
    return savedGames.flatMap((savedGame) => {
        const gameId = typeof savedGame === 'string' ? savedGame : savedGame.id;
        const catalogGame = catalog.find((game) => game.id === gameId);
        if (!catalogGame) {
            return [];
        }

        const savedArtwork = typeof savedGame === 'string' ? {} : {
            icon_url: savedGame.icon_url,
            cover_image_url: savedGame.cover_image_url,
        };

        return [{
            ...catalogGame,
            icon_url: catalogGame.icon_url ?? savedArtwork.icon_url,
            cover_image_url: catalogGame.cover_image_url ?? savedArtwork.cover_image_url,
            uid: createUid(),
            is_running: false,
            executables: catalogGame.executables.map((executable) => ({
                ...executable,
                is_running: false,
            })),
        }];
    });
}

export function mergeGameCatalogEntry(currentGame: Game, refreshedGame: Game): Game {
    const currentExecutables = new Map(
        currentGame.executables.map((executable) => [executable.name, executable]),
    );

    return {
        ...refreshedGame,
        icon_url: refreshedGame.icon_url ?? currentGame.icon_url,
        cover_image_url: refreshedGame.cover_image_url ?? currentGame.cover_image_url,
        uid: currentGame.uid,
        is_running: currentGame.is_running,
        is_installed: currentGame.is_installed,
        executables: refreshedGame.executables.map((executable) => {
            const currentExecutable = currentExecutables.get(executable.name);
            if (!currentExecutable) {
                return {
                    ...executable,
                    is_running: false,
                };
            }

            return {
                ...executable,
                is_running: currentExecutable.is_running,
                is_installed: currentExecutable.is_installed,
            };
        }),
    };
}
