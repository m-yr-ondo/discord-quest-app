import { createApp } from "vue";
import '@/theme/style.css'
import App from "./App.vue";
import { initializeTheme } from '@/composables/theme';

initializeTheme();
createApp(App).mount("#app");
