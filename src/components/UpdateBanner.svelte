<script lang="ts">
  import { useRegisterSW } from 'virtual:pwa-register/svelte';
  import { lock } from '../lib/lock.svelte';
  import { confermaUscita } from '../lib/unsaved.svelte';

  const ORA = 60 * 60 * 1000;

  // registerType 'prompt': a new version waits until the user taps "Aggiorna".
  // An installed app can stay open for days, so look for a new version every hour too.
  const { needRefresh, updateServiceWorker } = useRegisterSW({
    onRegisteredSW(_url, reg) {
      if (reg) setInterval(() => reg.update().catch(() => {}), ORA);
    },
  });

  let chiuso = $state(false);
  // Never over the lock screen or the background cover: only while the content is visible.
  const mostra = $derived($needRefresh && !chiuso && lock.visibile);

  // Lifts the tab-bar offset (--tabbar-h) so the banner never covers save bars or "Nuova mamma".
  $effect(() => {
    document.documentElement.classList.toggle('con-aggiornamento', mostra);
    return () => document.documentElement.classList.remove('con-aggiornamento');
  });

  let inCorso = false;
  async function aggiorna() {
    if (inCorso) return;
    inCorso = true;
    try {
      // A half-filled form asks "Uscire senza salvare?" first, like any other exit.
      if (await confermaUscita()) await updateServiceWorker(true);
    } finally {
      inCorso = false;
    }
  }
</script>

{#if mostra}
  <section class="aggiornamento" aria-label="Aggiornamento">
    <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
      <path d="M16 10a6 6 0 1 1-1.8-4.3M16 3.5v3.2h-3.2" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
    <p>Nuova versione disponibile</p>
    <button type="button" class="aggiorna" onclick={aggiorna}>Aggiorna</button>
    <button type="button" class="chiudi" aria-label="Più tardi" onclick={() => (chiuso = true)}>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
        <path d="M5 5l10 10M15 5L5 15" stroke-linecap="round" />
      </svg>
    </button>
  </section>
{/if}

<style>
  .aggiornamento {
    position: fixed;
    left: 0;
    right: 0;
    max-width: var(--col);
    margin: 0 auto;
    bottom: var(--tabbar-base);
    z-index: 10;
    height: var(--banner-h);
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 0 max(4px, env(safe-area-inset-right)) 0 calc(18px + env(safe-area-inset-left));
    border-top: 2px solid var(--ink);
    background: var(--carta);
  }
  svg {
    flex: none;
    width: 18px;
    height: 18px;
  }
  p {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    line-height: 1.2;
  }
  button {
    flex: none;
    min-height: 44px;
    border: 0;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .aggiorna {
    padding: 0 16px;
    border-radius: 22px;
    background: var(--ink);
    color: var(--giallo);
    font-size: 15px;
    font-weight: 800;
  }
  .chiudi {
    display: grid;
    place-items: center;
    width: 44px;
    padding: 0;
    background: none;
    color: var(--ink);
  }
  .chiudi:active {
    background: var(--premuto);
    border-radius: 22px;
  }
</style>
