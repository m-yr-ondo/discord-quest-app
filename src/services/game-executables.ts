import type { Game } from '@/types/types';

// Discord's catalog currently omits this executable even though the PC game
// ships as re9.exe. Keep this correction scoped to the catalog application ID.
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
