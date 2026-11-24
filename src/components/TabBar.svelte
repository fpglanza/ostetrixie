<script lang="ts">
  import { router } from '../lib/router.svelte';

  const attiva = $derived(
    router.name === 'calendario'
      ? 'calendario'
      : router.name === 'impostazioni' || router.name === 'aiuto'
        ? 'impostazioni'
        : 'mamme'
  );
</script>

<nav aria-label="Sezioni">
  <a href="#/" class:on={attiva === 'mamme'} aria-current={attiva === 'mamme' ? 'page' : undefined}>
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <circle cx="11" cy="7" r="4" /><path d="M3 20c1-4.5 4.5-6.5 8-6.5s7 2 8 6.5" />
    </svg>
    Mamme
  </a>
  <a href="#/calendario" class:on={attiva === 'calendario'} aria-current={attiva === 'calendario' ? 'page' : undefined}>
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <rect x="3" y="4" width="16" height="15" rx="2" /><path d="M3 9h16M7 2v4M15 2v4" />
    </svg>
    Calendario
  </a>
  <a href="#/impostazioni" class:on={attiva === 'impostazioni'} aria-current={attiva === 'impostazioni' ? 'page' : undefined}>
    <svg viewBox="0 0 22 22" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <circle cx="11" cy="11" r="3" />
      <path d="M11 2v3M11 17v3M2 11h3M17 11h3M4.6 4.6l2.1 2.1M15.3 15.3l2.1 2.1M4.6 17.4l2.1-2.1M15.3 6.7l2.1-2.1" />
    </svg>
    Impostazioni
  </a>
</nav>

<style>
  nav {
    position: fixed;
    left: 0;
    right: 0;
    bottom: 0;
    max-width: var(--col);
    margin: 0 auto;
    z-index: 10;
    height: var(--tabbar-base);
    padding: 6px max(env(safe-area-inset-right), 0px) env(safe-area-inset-bottom) max(env(safe-area-inset-left), 0px);
    border-top: 2px solid var(--ink);
    background: var(--carta);
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    align-items: start;
  }
  a {
    min-height: 44px;
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    font-size: 12px;
    line-height: 14px;
    font-weight: 700;
    color: var(--grigio);
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
  }
  a.on {
    color: var(--ink);
  }
  svg {
    width: 40px;
    height: 28px;
    padding: 3px 9px;
    border-radius: 8px;
  }
  a.on svg {
    background: var(--verde);
  }
  a:focus-visible {
    outline-offset: -2px;
  }
</style>
