import type { Game } from '@/types/types';

const knownExecutables: Record<string, Game['executables']> = {
    '1456485028350656512': [
        {
            is_launcher: false,
            name: 're9.exe',
            os: 'win32',
        },
    ],
};

export function normalizeGameCatalogEntry(game: Game): Game {
    const executables = knownExecutables[game.id];
    return executables ? { ...game, executables } : game;
}
