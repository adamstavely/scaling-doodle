import '@fontsource-variable/inter';
// Trench Coat elements used in the app. Importing a module registers its tc-* tag.
import '@adamstavely/trenchcoat/look-provider';
import '@adamstavely/trenchcoat/button';
import '@adamstavely/trenchcoat/dialog';
import '@adamstavely/trenchcoat/number-field';
import '@adamstavely/trenchcoat/progress-bar';
import '@adamstavely/trenchcoat/segmented-control';
import '@adamstavely/trenchcoat/slider-field';
import '@adamstavely/trenchcoat/switch';
import { createApp } from 'vue';
import App from './App.vue';
import './styles/base.css';

createApp(App).mount('#app');
