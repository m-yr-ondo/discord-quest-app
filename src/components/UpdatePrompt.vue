<script setup lang="ts">
defineProps<{
    version: string;
    progress: number | null;
    installing: boolean;
    error: string | null;
}>();

const emit = defineEmits<{
    install: [];
    dismiss: [];
}>();
</script>

<template>
    <section class="mx-auto mb-4 w-full max-w-5xl rounded-lg border border-app-accent bg-app-panel p-4 shadow-lg">
        <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
                <h2 class="font-semibold text-app-text">Update available</h2>
                <p class="text-sm text-app-text-muted">
                    Version {{ version }} is ready to install.
                </p>
                <p v-if="error" class="mt-1 text-sm text-app-danger">{{ error }}</p>
                <p v-if="installing && progress !== null" class="mt-1 text-sm text-app-text-muted">
                    Downloading {{ progress }}%
                </p>
            </div>

            <div class="flex gap-2">
                <button
                    class="rounded-md border border-app-border px-3 py-2 text-sm text-app-text-muted hover:bg-app-panel-hover disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="installing"
                    @click="emit('dismiss')"
                >
                    Later
                </button>
                <button
                    class="rounded-md bg-app-accent px-3 py-2 text-sm text-white hover:bg-app-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
                    :disabled="installing"
                    @click="emit('install')"
                >
                    {{ installing ? 'Installing...' : 'Install update' }}
                </button>
            </div>
        </div>
    </section>
</template>
