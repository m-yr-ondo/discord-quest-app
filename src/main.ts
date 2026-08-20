import { createApp } from "vue";
import '@/theme/style.css'
import App from "./App.vue";
import { loadSettings } from "./services/settings";

const initialTheme = loadSettings().theme;
if (typeof document !== 'undefined') {
  document.documentElement.dataset.theme = initialTheme;
}

createApp(App).mount("#app");
