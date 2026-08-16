export const SETTINGS_STORAGE_KEY = 'discord-quest-completer:settings';

export type Theme = 'original' | 'neon' | 'ember' | 'obsidian';

export type SavedSettings = {
    readonly version: 1;
    readonly theme: Theme;
};

export type SettingsStorage = Pick<Storage, 'getItem' | 'setItem'>;

const DEFAULT_SETTINGS: SavedSettings = {
    version: 1,
    theme: 'original',
};

function getBrowserStorage(): SettingsStorage {
    if (typeof localStorage === 'undefined') {
        throw new Error('localStorage is unavailable');
    }

    return localStorage;
}

function isTheme(value: unknown): value is Theme {
    return value === 'original' || value === 'neon' || value === 'ember' || value === 'obsidian';
}

function isSavedSettings(value: unknown): value is SavedSettings {
    if (typeof value !== 'object' || value === null || !('version' in value) || !('theme' in value)) {
        return false;
    }

    return value.version === 1 && isTheme(value.theme);
}

export function loadSettings(storage: SettingsStorage = getBrowserStorage()): SavedSettings {
    const savedValue = storage.getItem(SETTINGS_STORAGE_KEY);
    if (savedValue === null) {
        return DEFAULT_SETTINGS;
    }

    try {
        const parsedValue: unknown = JSON.parse(savedValue);
        if (!isSavedSettings(parsedValue)) {
            console.warn('Ignoring invalid settings data.');
            return DEFAULT_SETTINGS;
        }

        return parsedValue;
    } catch (error) {
        if (error instanceof SyntaxError) {
            console.warn('Ignoring malformed settings data.');
            return DEFAULT_SETTINGS;
        }

        throw error;
    }
}

export function saveSettings(
    settings: SavedSettings,
    storage: SettingsStorage = getBrowserStorage(),
): void {
    storage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
}
