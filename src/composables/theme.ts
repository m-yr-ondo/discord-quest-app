import { ref } from 'vue';

export const THEME_STORAGE_KEY = 'discord-quest-completer:theme';
const LEGACY_SETTINGS_STORAGE_KEY = 'discord-quest-completer:settings';

export const Themes = {
  OBSIDIAN: 'obsidian',
  SAKUGA: 'sakuga',
} as const;

export type Theme = typeof Themes[keyof typeof Themes];

function normalizeTheme(value: string | null): Theme | null {
  if (value === 'anime') {
    return Themes.SAKUGA;
  }

  return value === Themes.OBSIDIAN || value === Themes.SAKUGA ? value : null;
}

function storedTheme(): Theme {
  try {
    const value = window.localStorage.getItem(THEME_STORAGE_KEY);
    const savedTheme = normalizeTheme(value);
    if (savedTheme) {
      return savedTheme;
    }

    const legacySettings = JSON.parse(window.localStorage.getItem(LEGACY_SETTINGS_STORAGE_KEY) ?? 'null') as { theme?: string } | null;
    const legacyTheme = legacySettings?.theme ?? null;
    return normalizeTheme(legacyTheme) ?? Themes.OBSIDIAN;
  } catch {
    return Themes.OBSIDIAN;
  }
}

const theme = ref<Theme>(storedTheme());

export function applyTheme(nextTheme: Theme, persist = true) {
  theme.value = nextTheme;
  document.documentElement.dataset.theme = nextTheme;

  if (persist) {
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
    } catch {
      // The app remains usable if local storage is unavailable.
    }
  }
}

export function initializeTheme() {
  applyTheme(storedTheme(), false);
}

export function useTheme() {
  return { theme, setTheme: applyTheme };
}
