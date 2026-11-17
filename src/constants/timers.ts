export const TIMER_OPTIONS = [
    { minutes: 2, label: '2 min' },
    { minutes: 20, label: '20 min' },
    { minutes: 45, label: '45 min' },
    { minutes: 60, label: '60 min' },
    { minutes: 120, label: '120 min' },
    { minutes: 180, label: '180 min' },
    { minutes: 300, label: '300 min' },
] as const;

export type TimerMinutes = typeof TIMER_OPTIONS[number]['minutes'];
