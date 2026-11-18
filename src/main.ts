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

// Date and time fields draw their own icon (ui.css): a tap anywhere on one opens the native picker.
document.addEventListener('click', (e) => {
  const el = e.target;
  if (!(el instanceof HTMLInputElement) || (el.type !== 'date' && el.type !== 'time')) return;
  try {
    el.showPicker();
  } catch {
    /* unsupported or already open: the native control still works */
  }
});

const app = mount(App, { target: document.getElementById('app')! });

export default app;
