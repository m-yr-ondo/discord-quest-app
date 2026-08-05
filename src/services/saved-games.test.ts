import { describe, expect, it } from 'vitest';
import type { Game } from '@/types/types';
import {
    loadSavedGameIds,
    mergeGameCatalogEntry,
    rehydrateSavedGames,
    saveSavedGameIds,
} from './saved-games';

class MemoryStorage {
    private readonly values = new Map<string, string>();

    getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        this.values.set(key, value);
    }
}

function makeGame(id: string, name: string): Game {
    return {
        id,
        name,
        executables: [
            {
                is_launcher: true,
                name: `${name}.exe`,
                os: 'win32',
                is_running: false,
            },
        ],
    };
}

describe('saved games persistence', () => {
    it('returns no IDs when storage is empty', () => {
        const storage = new MemoryStorage();

        expect(loadSavedGameIds(storage)).toEqual([]);
    });

    it('round-trips unique game IDs through storage', () => {
        const storage = new MemoryStorage();

        saveSavedGameIds(['one', 'one', 'two'], storage);

        expect(loadSavedGameIds(storage)).toEqual(['one', 'two']);
    });

    it('rejects malformed saved data', () => {
        const storage = new MemoryStorage();
        storage.setItem('discord-quest-completer:saved-game-ids', '{bad json');

        expect(loadSavedGameIds(storage)).toEqual([]);
    });

    it('rehydrates current catalog entries in saved order with fresh UIDs', () => {
        const catalog = [makeGame('one', 'One'), makeGame('two', 'Two')];

        const restored = rehydrateSavedGames(
            ['two', 'missing', 'one'],
            catalog,
            (() => {
                let nextUid = 1;
                return () => `uid-${nextUid++}`;
            })(),
        );

        expect(restored.map((game) => game.id)).toEqual(['two', 'one']);
        expect(restored.map((game) => game.uid)).toEqual(['uid-1', 'uid-2']);
        expect(restored.every((game) => !game.is_running)).toBe(true);
        expect(restored.every((game) => game.executables.every((executable) => !executable.is_running))).toBe(true);
    });

    it('preserves runtime state when the catalog is refreshed', () => {
        const currentGame: Game = {
            ...makeGame('one', 'Old Name'),
            uid: 'uid-1',
            is_installed: true,
            is_running: true,
            executables: [{
                is_launcher: true,
                name: 'Old Name.exe',
                os: 'win32',
                is_installed: true,
                is_running: true,
            }],
        };
        const refreshedGame: Game = {
            ...makeGame('one', 'New Name'),
            executables: [
                {
                    is_launcher: true,
                    name: 'Old Name.exe',
                    os: 'win32',
                },
                {
                    is_launcher: false,
                    name: 'New Launcher.exe',
                    os: 'win32',
                },
            ],
        };

        const merged = mergeGameCatalogEntry(currentGame, refreshedGame);

        expect(merged.name).toBe('New Name');
        expect(merged.uid).toBe('uid-1');
        expect(merged.is_installed).toBe(true);
        expect(merged.is_running).toBe(true);
        expect(merged.executables[0]?.is_installed).toBe(true);
        expect(merged.executables[0]?.is_running).toBe(true);
        expect(merged.executables[1]?.is_running).toBe(false);
    });
});
