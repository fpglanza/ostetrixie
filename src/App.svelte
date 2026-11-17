<script lang="ts">
  import TabBar from './components/TabBar.svelte';
  import Mamme from './routes/Mamme.svelte';
  import { router } from './lib/router.svelte';
  import type { RouteName } from './lib/routes';

  // Placeholder titles for screens built by later tasks.
  const TITOLI: Record<Exclude<RouteName, 'mamme'>, string> = {
    mammaNuova: 'Nuova mamma',
    scheda: 'Scheda mamma',
    mammaModifica: 'Modifica mamma',
    incontroNuovo: 'Nuovo incontro',
    incontro: 'Incontro',
    calendario: 'Calendario',
    impostazioni: 'Impostazioni',
    aiuto: 'Aiuto',
  };
</script>

<div class="statusbar" aria-hidden="true"></div>

{#if router.name === 'mamme'}
  <Mamme />
{:else}
  <header class="ph">
    <h1>{TITOLI[router.name]}</h1>
  </header>
  <p class="ph-testo">In costruzione.</p>
{/if}

<TabBar />

<style>
  .statusbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 20;
    height: env(safe-area-inset-top);
    background: var(--giallo);
  }
  .ph {
    background: var(--giallo);
    padding: calc(18px + env(safe-area-inset-top)) 18px 14px;
    border-bottom: 2px solid var(--ink);
  }
  .ph h1 {
    margin: 0;
    font-size: 40px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
    font-stretch: 75%;
    font-variation-settings: 'wdth' 75;
  }
  .ph-testo {
    margin: 0;
    padding: 20px 18px;
    color: var(--grigio);
  }
</style>
