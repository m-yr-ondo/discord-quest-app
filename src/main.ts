import { createApp } from "vue";
import '@/theme/style.css'
import App from "./App.vue";
import { loadSettings } from "./services/settings";

// Apply theme before Vue mounts to prevent flash
const initialTheme = loadSettings().theme;
if (typeof document !== 'undefined') {
  document.documentElement.dataset.theme = initialTheme;
}

createApp(App).mount("#app");
