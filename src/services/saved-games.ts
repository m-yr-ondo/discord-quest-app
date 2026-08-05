import type { Game } from '@/types/types';

export const SAVED_GAME_IDS_STORAGE_KEY = 'discord-quest-completer:saved-game-ids';

export type SavedGamesStorage = Pick<Storage, 'getItem' | 'setItem'>;

type SavedGamesRecord = {
    readonly version: 1;
    readonly gameIds: readonly string[];
};

function getBrowserStorage(): SavedGamesStorage {
    if (typeof localStorage === 'undefined') {
        throw new Error('localStorage is unavailable');
    }

    return localStorage;
}

function isSavedGamesRecord(value: unknown): value is SavedGamesRecord {
    if (typeof value !== 'object' || value === null || !('version' in value) || !('gameIds' in value)) {
        return false;
    }

    return value.version === 1
        && Array.isArray(value.gameIds)
        && value.gameIds.every((gameId) => typeof gameId === 'string');
}

export function loadSavedGameIds(storage: SavedGamesStorage = getBrowserStorage()): string[] {
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

        return [...new Set(parsedValue.gameIds)];
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.warn('Ignoring malformed saved game data.');
            return [];
        }

        throw error;
    }
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

export function rehydrateSavedGames(
    savedGameIds: readonly string[],
    catalog: readonly Game[],
    createUid: () => string,
): Game[] {
    return savedGameIds.flatMap((gameId) => {
        const catalogGame = catalog.find((game) => game.id === gameId);
        if (!catalogGame) {
            return [];
        }

        return [{
            ...catalogGame,
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
