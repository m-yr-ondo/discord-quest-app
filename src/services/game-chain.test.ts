import { describe, expect, it } from 'vitest';
import {
    deleteGameChain,
    loadGameChain,
    saveGameChain,
    type GameChainStorage,
} from './game-chain';

class MemoryStorage implements GameChainStorage {
    private readonly values = new Map<string, string>();

    getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        this.values.set(key, value);
    }

    removeItem(key: string): void {
        this.values.delete(key);
    }
}

describe('game chain persistence', () => {
    it('round-trips chain entries and limits the chain to ten unique games', () => {
        const storage = new MemoryStorage();
        const entries = Array.from({ length: 11 }, (_, index) => ({
            gameId: `game-${index}`,
            executableName: `game-${index}.exe`,
            timerMinutes: 20 as const,
        }));

        saveGameChain(entries, storage);

        expect(loadGameChain(storage)).toHaveLength(10);
        expect(loadGameChain(storage)[0]).toEqual(entries[0]);
    });

    it('rejects duplicate game entries', () => {
        const storage = new MemoryStorage();

        saveGameChain([
            { gameId: 'one', executableName: 'one.exe', timerMinutes: 2 },
            { gameId: 'one', executableName: 'other.exe', timerMinutes: 60 },
        ], storage);

        expect(loadGameChain(storage)).toEqual([
            { gameId: 'one', executableName: 'one.exe', timerMinutes: 2 },
        ]);
    });

    it('deletes the saved chain', () => {
        const storage = new MemoryStorage();
        saveGameChain([{ gameId: 'one', executableName: 'one.exe', timerMinutes: 2 }], storage);

        deleteGameChain(storage);

        expect(loadGameChain(storage)).toEqual([]);
    });
});
