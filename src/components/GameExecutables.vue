<template>
    <div class="text-app-text-muted">
        <h3>
            Select an executable to launch:
        </h3>

        <div class="text-xs mt-2">
            <div v-for="(executable) in filteredExecutables" :key="executable.name"
                class="grid grid-cols-[auto_1fr_auto] gap-2 items-center mb-2 w-full">
                <div class="w-14 max-w-[80px]">
                    <div class="bg-app-panel-hover rounded-full px-2 py-1 w-fit">
                        {{ executable.os }}
                    </div>
                </div>

                <div class="relative overflow-hidden ">
                    <div class="flex flex-nowrap overflow-x-auto scrollbar-none max-w-full pr-4 fade-right">
                        <div v-for="(section, i) in splitExecutableName(executable)" :key="i"
                            class="text-center border border-app-border rounded-md px-2 py-1 mr-1 whitespace-nowrap">
                            <span>{{ section }}</span>
                        </div>
                    </div>
                </div>

                <div class="flex items-center gap-2 justify-self-end">
                    <div class="relative">
                        <button
                            type="button"
                            :disabled="gameActions?.isExecutableRunning(executable)"
                            class="inline-flex items-center gap-2 rounded-md border border-app-border bg-app-panel px-3 py-1 text-app-text hover:bg-app-panel-hover disabled:cursor-not-allowed disabled:opacity-70"
                            aria-label="Timer"
                            @click.stop="toggleTimerMenu(executable)"
                        >
                            Timer
                            <span aria-hidden="true" class="text-xs">▾</span>
                        </button>
                        <div
                            v-if="openTimerMenu === executable.name"
                            class="absolute right-0 top-full z-20 mt-1 min-w-full overflow-hidden rounded-md border border-app-border bg-app-panel shadow-lg"
                            @click.stop
                        >
                            <button
                                v-for="option in timerOptions"
                                :key="option.minutes"
                                type="button"
                                class="block w-full whitespace-nowrap px-3 py-1.5 text-left text-app-text hover:bg-app-panel-hover"
                                :class="timerMinutes[executable.name] === option.minutes
                                    ? 'bg-app-accent text-white hover:bg-app-accent'
                                    : ''"
                                :aria-pressed="timerMinutes[executable.name] === option.minutes"
                                @click="selectTimer(executable, option.minutes)"
                            >
                                <span class="flex items-center justify-between gap-4">
                                    {{ option.label }}
                                    <span v-if="timerMinutes[executable.name] === option.minutes" aria-hidden="true">✓</span>
                                </span>
                            </button>
                        </div>
                    </div>
                    <button class="text-white rounded-md px-3 py-1"
                    :class="[
                        {
                            'bg-blue-500 hover:bg-blue-600': !gameActions?.isExecutableRunning(executable),
                            'bg-red-500 hover:bg-red-600': gameActions?.isExecutableRunning(executable),
                        },
                    ]"
                        @click="handleLaunch(executable)"
                    >
                        {{ gameActions?.isExecutableRunning(executable) ? 'Stop' : 'Play' }}
                    </button>
                </div>

                <div v-if="executable.is_running && executable.timer_minutes != null"
                    class="col-start-2 flex flex-wrap items-center gap-2 text-app-text-muted">
                    <span class="inline-flex items-center gap-1 rounded-md border border-app-border bg-app-panel px-2 py-1 font-mono"
                        :class="executable.timer_paused ? 'text-app-text-muted' : 'text-app-accent'">
                        <span aria-hidden="true">{{ executable.timer_paused ? 'Paused' : 'Ends in' }}</span>
                        <span>{{ formatRemaining(executable.timer_remaining_seconds) }}</span>
                    </span>
                    <span class="h-1.5 w-20 overflow-hidden rounded-full bg-app-panel-hover" aria-hidden="true">
                        <span class="block h-full rounded-full bg-app-accent transition-[width] duration-1000"
                            :style="{ width: `${timerProgress(executable)}%` }"></span>
                    </span>
                    <button
                        class="rounded-md border border-app-border px-2 py-1 text-app-text hover:bg-app-panel-hover"
                        @click="handleTimerToggle(executable)">
                        {{ executable.timer_paused ? 'Resume' : 'Pause' }}
                    </button>
                    <button
                        class="rounded-md border border-app-danger/50 px-2 py-1 text-app-danger hover:bg-app-panel-hover"
                        @click="handleCancelTimer(executable)">
                        Cancel timer
                    </button>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { EXECUTABLE_OS, GameActionsKey } from '@/constants/constants';
import { TIMER_OPTIONS } from '@/constants/timers';
import { GameActionsProvider, type Game, type GameExecutable } from '@/types/types';
import { path, app } from '@tauri-apps/api';
import { computed, inject, ref } from 'vue';

const props = defineProps<{
    game: Game
}>();

const emit = defineEmits<{
    play: [{game: Game, executable: GameExecutable}]
    stop: [{game: Game, executable: GameExecutable}]
    install_and_play: [{game: Game, executable: GameExecutable}]
    pause_timer: [{game: Game, executable: GameExecutable}]
    resume_timer: [{game: Game, executable: GameExecutable}]
    cancel_timer: [{game: Game, executable: GameExecutable}]
}>();

const gameActions = inject<GameActionsProvider>(GameActionsKey);
const timerMinutes = ref<Record<string, number | null>>({});
const openTimerMenu = ref<string | null>(null);
const timerOptions = TIMER_OPTIONS;

function toggleTimerMenu(executable: GameExecutable) {
    if (gameActions?.isExecutableRunning(executable)) {
        return;
    }
    openTimerMenu.value = openTimerMenu.value === executable.name ? null : executable.name;
}

function selectTimer(executable: GameExecutable, minutes: number) {
    timerMinutes.value[executable.name] = minutes;
    openTimerMenu.value = null;
}

const filteredExecutables = computed(() => {
    return props.game.executables.filter(executable => {
        return executable.os !== EXECUTABLE_OS.LINUX && executable.os !== EXECUTABLE_OS.DARWIN
            && !isValidPath(executable.name);
    });
});

function splitExecutableName(executable: GameExecutable) {
    const allSections = executable.name.split(/\\|\//);
    
    const last = executable.name.split(/\\|\//).pop();
    const name = last?.split('.').slice(0, -1).join('.') || last;
    return [
        ...allSections.slice(0, -1),
        name,
    ];
}

function getExecutablePath(executable: GameExecutable) {
    const allSections = executable.name.split(/\\|\//);
    const last = executable.name.split(/\\|\//).pop();
    const name = last?.split('.').slice(0, -1).join('.') || last;
    return [
        ...allSections.slice(0, -1)
    ].join(path.sep())
}

function getFilename(executable: GameExecutable) {
    const last = executable.name.split(/\\|\//).pop();
    return last;
}

function formatRemaining(seconds = 0) {
    const safeSeconds = Math.max(0, Math.ceil(seconds));
    const hours = Math.floor(safeSeconds / 3600);
    const minutes = Math.floor((safeSeconds % 3600) / 60);
    const remainingSeconds = safeSeconds % 60;
    if (hours > 0) {
        return `${hours}:${String(minutes).padStart(2, '0')}:${String(remainingSeconds).padStart(2, '0')}`;
    }
    return `${minutes}:${String(remainingSeconds).padStart(2, '0')}`;
}

function timerProgress(executable: GameExecutable) {
    if (!executable.timer_minutes || executable.timer_remaining_seconds === undefined) {
        return 0;
    }
    return Math.min(100, Math.max(0, executable.timer_remaining_seconds / (executable.timer_minutes * 60) * 100));
}

function handleTimerToggle(executable: GameExecutable) {
    if (executable.timer_paused) {
        emit('resume_timer', { game: props.game, executable });
    } else {
        emit('pause_timer', { game: props.game, executable });
    }
}

function handleCancelTimer(executable: GameExecutable) {
    timerMinutes.value[executable.name] = null;
    emit('cancel_timer', { game: props.game, executable });
}

function isValidPath(path: string) {
    const illegalChars = ['>', '<', ':', '"', '|', '?', '*'];
    return illegalChars.some(char => path.includes(char));
}

function handleLaunch(executable: GameExecutable) {
    console.log('Launching game:', props.game);
    if(executable.is_running) {
        emit('stop', {
            game: props.game,
            executable: {
                path: getExecutablePath(executable),
                segments: splitExecutableName(executable).length,
                filename: getFilename(executable),
                ...executable
            },
        });
    } else {
        if (!gameActions?.isGameExecutableInstalled(executable)) {
            emit('install_and_play', {
                game: props.game,
                executable: {
                    path: getExecutablePath(executable),
                    segments: splitExecutableName(executable).length,
                    filename: getFilename(executable),
                    ...executable,
                    timer_minutes: timerMinutes.value[executable.name] ?? null,
                },
            });
        } else {
            emit('play', {
                game: props.game,
                executable: {
                    path: getExecutablePath(executable),
                    segments: splitExecutableName(executable).length,
                    filename: getFilename(executable),
                    ...executable,
                    timer_minutes: timerMinutes.value[executable.name] ?? null,
                },
            });
        }
     
    }
    
}

</script>

<style scoped>
.fade-right {
    -webkit-mask-image: linear-gradient(to right, black 85%, transparent 100%);
    mask-image: linear-gradient(to right, black 85%, transparent 100%);
}

.scrollbar-none {
    scrollbar-width: none;
    -ms-overflow-style: none;
}

.scrollbar-none::-webkit-scrollbar {
    display: none;
}
</style>
