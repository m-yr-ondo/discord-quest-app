import { describe, expect, it } from 'vitest';
import {
    loadSettings,
    saveSettings,
    SETTINGS_STORAGE_KEY,
    type SavedSettings,
} from './settings';

class MemoryStorage {
    private readonly values = new Map<string, string>();

    getItem(key: string): string | null {
        return this.values.get(key) ?? null;
    }

    setItem(key: string, value: string): void {
        this.values.set(key, value);
    }
}

describe('settings persistence', () => {
    it('returns Original by default when storage is empty', () => {
        expect(loadSettings(new MemoryStorage())).toEqual({ version: 1, theme: 'original' });
    });

    it('round-trips the Neon theme through storage', () => {
        const storage = new MemoryStorage();
        const settings: SavedSettings = { version: 1, theme: 'neon' };

        saveSettings(settings, storage);

        expect(loadSettings(storage)).toEqual(settings);
    });

    it('loads the Ember theme from storage', () => {
        const storage = new MemoryStorage();
        storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ version: 1, theme: 'ember' }));

        expect(loadSettings(storage)).toEqual({ version: 1, theme: 'ember' });
    });

    it('loads the Obsidian theme from storage', () => {
        const storage = new MemoryStorage();
        storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ version: 1, theme: 'obsidian' }));

        expect(loadSettings(storage)).toEqual({ version: 1, theme: 'obsidian' });
    });

    it('returns Original when stored JSON is malformed', () => {
        const storage = new MemoryStorage();
        storage.setItem(SETTINGS_STORAGE_KEY, '{bad json');

        expect(loadSettings(storage)).toEqual({ version: 1, theme: 'original' });
    });

    it('returns Original when the stored theme is invalid', () => {
        const storage = new MemoryStorage();
        storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ version: 1, theme: 'cyberpunk' }));

        expect(loadSettings(storage)).toEqual({ version: 1, theme: 'original' });
    });

    it('returns Original when the stored version is unsupported', () => {
        const storage = new MemoryStorage();
        storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify({ version: 2, theme: 'neon' }));

        expect(loadSettings(storage)).toEqual({ version: 1, theme: 'original' });
    });
});
