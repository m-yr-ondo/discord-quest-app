export const TIMER_PRESETS = [3, 5, 10, 15, 30] as const;
export const MIN_TIMER_MINUTES = 1;

export type TimerMinutes = number;

export function isValidTimerMinutes(value: unknown): value is TimerMinutes {
    return typeof value === 'number'
        && Number.isSafeInteger(value)
        && value >= MIN_TIMER_MINUTES;
}
