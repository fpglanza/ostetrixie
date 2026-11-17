import '@fontsource-variable/archivo/wdth.css';
import './styles/tokens.css';
import './styles/ui.css';
import { mount } from 'svelte';
import App from './App.svelte';

// Ask the browser not to evict the data under storage pressure. Best effort only.
try {
  void navigator.storage?.persist?.().catch(() => {});
} catch {
  /* unsupported */
}

const app = mount(App, { target: document.getElementById('app')! });

export default app;
