<script lang="ts">
  import ConfirmDialog from './components/ConfirmDialog.svelte';
  import LockScreen from './components/LockScreen.svelte';
  import TabBar from './components/TabBar.svelte';
  import UpdateBanner from './components/UpdateBanner.svelte';
  import Aiuto from './routes/Aiuto.svelte';
  import Calendario from './routes/Calendario.svelte';
  import Impostazioni from './routes/Impostazioni.svelte';
  import IncontroForm from './routes/IncontroForm.svelte';
  import MammaForm from './routes/MammaForm.svelte';
  import Mamme from './routes/Mamme.svelte';
  import Scheda from './routes/Scheda.svelte';
  import { lock } from './lib/lock.svelte';
  import { router } from './lib/router.svelte';
  import { rispondiUscita, uscita } from './lib/unsaved.svelte';

  // A new screen starts at the top.
  $effect(() => {
    void router.path;
    window.scrollTo(0, 0);
  });
</script>

<!--
  Cold start with a PIN: the routed content is not mounted until the first unlock.
  Afterwards a lock, the background cover or a settings error only hide it (hidden + inert),
  so a half-filled form is still there after unlock. See lock.svelte.ts.
-->
{#if lock.contenuto}
  <div data-contenuto hidden={!lock.visibile} inert={!lock.visibile}>
    <div class="statusbar" aria-hidden="true"></div>

    {#if router.name === 'mamme'}
      <Mamme />
    {:else if router.name === 'mammaNuova'}
      <MammaForm />
    {:else if router.name === 'mammaModifica'}
      {#key router.params.id}<MammaForm id={router.params.id} />{/key}
    {:else if router.name === 'scheda'}
      {#key router.params.id}<Scheda id={router.params.id} />{/key}
    {:else if router.name === 'incontroNuovo'}
      {#key router.params.gid}<IncontroForm gid={router.params.gid} />{/key}
    {:else if router.name === 'incontro'}
      {#key router.params.id}<IncontroForm id={router.params.id} />{/key}
    {:else if router.name === 'calendario'}
      <Calendario />
    {:else if router.name === 'impostazioni'}
      <Impostazioni />
    {:else if router.name === 'aiuto'}
      <Aiuto />
    {/if}

    <TabBar />

    <ConfirmDialog
      open={uscita.chiede}
      titolo="Uscire senza salvare?"
      testo="Le modifiche non salvate andranno perse."
      conferma="Esci senza salvare"
      pericoloso
      onconferma={() => rispondiUscita(true)}
      onannulla={() => rispondiUscita(false)}
    />
  </div>
{/if}

<!-- Outside the content block so the service worker registers even before the first unlock;
     the banner itself shows only while the content is visible. -->
<UpdateBanner />

{#if lock.errore}
  <main class="errore-blocco">
    <h1>Ostetrixie</h1>
    <p role="alert">Impossibile leggere i dati. Chiudi e riapri l'app.</p>
    <button type="button" class="btn primario pieno" onclick={() => lock.avvia()}>Riprova</button>
  </main>
{:else if !lock.pronto || lock.coperto}
  <div class="attesa" aria-hidden="true"></div>
{:else if lock.locked}
  <LockScreen />
{/if}

<style>
  .attesa {
    position: fixed;
    inset: 0;
    z-index: 50;
    background: var(--giallo);
  }
  .errore-blocco {
    min-height: 100dvh;
    padding: calc(40px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom));
    background: var(--giallo);
  }
  .errore-blocco h1 {
    margin: 0 0 14px;
    padding-bottom: 14px;
    border-bottom: 2px solid var(--ink);
    font-size: 48px;
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.02em;
    font-stretch: 75%;
    font-variation-settings: 'wdth' 75;
  }
  .errore-blocco p {
    margin: 0 0 24px;
    font-size: 17px;
    font-weight: 700;
  }
  .statusbar {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 20;
    height: env(safe-area-inset-top);
    background: var(--giallo);
  }
</style>
