import type { Game } from '@/types/types';

const DISCORD_CDN_BASE = 'https://cdn.discordapp.com';

export function getDiscordGameIconUrl(game: Pick<Game, 'id' | 'icon_hash'>): string | undefined {
    if (!game.icon_hash) {
        return undefined;
    }

    return `${DISCORD_CDN_BASE}/app-icons/${game.id}/${game.icon_hash}.png?size=128`;
}

export function getDiscordGameCoverUrl(game: Pick<Game, 'id' | 'cover_image_hash'>): string | undefined {
    if (!game.cover_image_hash) {
        return undefined;
    }

    return `${DISCORD_CDN_BASE}/app-assets/${game.id}/${game.cover_image_hash}.png?size=512`;
}

export function withGameArtwork(game: Game): Game {
    return {
        ...game,
        icon_url: game.icon_url ?? getDiscordGameIconUrl(game),
        cover_image_url: game.cover_image_url ?? getDiscordGameCoverUrl(game),
    };
}

export function getGameInitials(name: string): string {
    const words = name
        .replace(/[^\p{L}\p{N}]+/gu, ' ')
        .trim()
        .split(/\s+/)
        .filter(Boolean);

    if (words.length === 0) {
        return '?';
    }

    if (words.length === 1) {
        return words[0].slice(0, 2).toUpperCase();
    }

    return words.slice(0, 3).map((word) => word[0]).join('').toUpperCase();
}
