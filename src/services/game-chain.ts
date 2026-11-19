import { isValidTimerMinutes, type TimerMinutes } from '@/constants/timers';

export const GAME_CHAIN_STORAGE_KEY = 'discord-quest-completer:game-chain';

export type GameChainEntry = {
    gameId: string;
    executableName: string;
    timerMinutes: TimerMinutes;
};

export type GameChainStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

function getBrowserStorage(): GameChainStorage {
    if (typeof localStorage === 'undefined') {
        throw new Error('localStorage is unavailable');
    }

    return localStorage;
}

function isChainEntry(value: unknown): value is GameChainEntry {
    if (typeof value !== 'object' || value === null) {
        return false;
    }

    const entry = value as Record<string, unknown>;
    return typeof entry.gameId === 'string'
        && typeof entry.executableName === 'string'
        && isValidTimerMinutes(entry.timerMinutes);
}

export function loadGameChain(storage: GameChainStorage = getBrowserStorage()): GameChainEntry[] {
    const savedValue = storage.getItem(GAME_CHAIN_STORAGE_KEY);
    if (savedValue === null) {
        return [];
    }

    try {
        const parsedValue: unknown = JSON.parse(savedValue);
        if (!Array.isArray(parsedValue)) {
            return [];
        }

        const entries = parsedValue.filter(isChainEntry);
        const uniqueGameIds = new Set<string>();
        return entries.filter((entry) => {
            if (uniqueGameIds.has(entry.gameId)) {
                return false;
            }
            uniqueGameIds.add(entry.gameId);
            return true;
        }).slice(0, 10);
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.warn('Ignoring malformed game chain data.');
            return [];
        }
        throw error;
    }
}

export function saveGameChain(
    entries: readonly GameChainEntry[],
    storage: GameChainStorage = getBrowserStorage(),
): void {
    storage.setItem(GAME_CHAIN_STORAGE_KEY, JSON.stringify(entries.slice(0, 10)));
}

export function deleteGameChain(storage: GameChainStorage = getBrowserStorage()): void {
    storage.removeItem(GAME_CHAIN_STORAGE_KEY);
}
