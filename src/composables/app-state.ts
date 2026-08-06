import { createGlobalState } from '@vueuse/core'
import { computed, ComputedRef, ShallowRef, shallowRef } from 'vue'
import { loadSettings, saveSettings, type Theme } from '@/services/settings'

export const Pages = {
    HOME: 'home',
    PLAYGROUND: 'playground',
    SETTINGS: 'settings',
} as const
export type Pages = typeof Pages[keyof typeof Pages]
export interface AppLogObject {
    type: 'info' | 'error' | 'warning' | 'debug';
    message: string;
    timestamp: Date;
}
export interface UseGlobalStateReturn {
    page: ShallowRef<Pages>,
    count: ShallowRef<number>,
    doubleCount: ComputedRef<number>,
    setPage: (newPage: Pages) => void,
    increment: () => void,
    logs: ShallowRef<AppLogObject[]>,
    addLog: {
        (type: 'info' | 'error' | 'warning' | 'debug', newLog: string): void;
        (newLog: string): void;
    };
    clearLogs: () => void,
    theme: ShallowRef<Theme>,
    setTheme: (newTheme: Theme) => void,
}
export const useGlobalState = createGlobalState(
  () => {
    // state
    const page = shallowRef<Pages>(Pages.HOME)

    const logs = shallowRef<AppLogObject[]>([])

    const count = shallowRef(0)

    const theme = shallowRef<Theme>(loadSettings().theme)

    // getters
    const doubleCount = computed(() => count.value * 2)

    // actions
    function increment() {
      count.value++
    }

    function setPage(newPage: Pages) {
      page.value = newPage
    }

    function applyThemeToDocument(newTheme: Theme) {
      if (typeof document === 'undefined') {
        return
      }
      document.documentElement.dataset.theme = newTheme
    }

    function setTheme(newTheme: Theme) {
      theme.value = newTheme
      applyThemeToDocument(newTheme)
      saveSettings({ version: 1, theme: newTheme })
    }

    // Apply theme at startup
    applyThemeToDocument(theme.value)

    function addLog(type: string | 'info' | 'error' | 'warning' | 'debug' , newLog?: string) {
      if (!newLog) {
        newLog = type;
        type = 'info';
      }
      const formattedLog = `${newLog}`;
      logs.value.push({ type: type as 'info' | 'error' | 'warning' | 'debug', message: formattedLog, timestamp: new Date() });
    }

    function clearLogs() {
      logs.value = []
    }

    return {
        page,
        count, 
        doubleCount,
        setPage, 
        increment,
        logs,
        addLog,
        clearLogs,
        theme,
        setTheme,
    } as UseGlobalStateReturn
  }
)

