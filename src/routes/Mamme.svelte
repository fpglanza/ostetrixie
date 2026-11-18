<script lang="ts">
  import { liveQuery } from 'dexie';
  import BackupBanner from '../components/BackupBanner.svelte';
  import StationLine from '../components/StationLine.svelte';
  import { formatShort, todayISO, weekdayIT } from '../lib/dates';
  import { getImpostazioni } from '../lib/db';
  import { buildRighe, ordinaRighe, serveBackup, type OverviewData, type RigaMamma } from '../lib/overview';
  import { descriviProssimo, filtraPerNome, rigaVicina } from '../lib/mammeView';
  import { getAllData } from '../lib/repo';

  let dati = $state<OverviewData | null>(null);
  let errore = $state(false);
  $effect(() => {
    const sub = liveQuery(() => getAllData()).subscribe({
      next: (d) => {
        dati = d;
        errore = false;
      },
      error: () => (errore = true),
    });
    return () => sub.unsubscribe();
  });

  let ultimoBackup = $state<string | undefined>(undefined);
  $effect(() => {
    const sub = liveQuery(() => getImpostazioni()).subscribe({
      next: (imp) => (ultimoBackup = imp.ultimoBackup),
      error: () => (errore = true),
    });
    return () => sub.unsubscribe();
  });

  let today = $state(todayISO());
  $effect(() => {
    const aggiorna = () => {
      if (document.visibilityState === 'visible') today = todayISO();
    };
    document.addEventListener('visibilitychange', aggiorna);
    return () => document.removeEventListener('visibilitychange', aggiorna);
  });

  let cerca = $state('');
  let archivioAperto = $state(false);

  const righe = $derived(dati ? ordinaRighe(buildRighe(dati, today)) : null);
  const filtrate = $derived(righe ? filtraPerNome(righe, cerca) : []);
  const inGravidanza = $derived(filtrate.filter((r) => r.sezione === 'in_gravidanza'));
  const dopoParto = $derived(filtrate.filter((r) => r.sezione === 'dopo_parto'));
  const archiviate = $derived(filtrate.filter((r) => r.sezione === 'archiviata'));
  /** Footer count: "4 in gravidanza · 1 dopo il parto", parts at 0 left out. */
  const conteggio = $derived.by(() => {
    if (!righe) return [];
    const n = (s: RigaMamma['sezione']) => righe.filter((r) => r.sezione === s).length;
    const parti: [number, string][] = [
      [n('in_gravidanza'), 'in gravidanza'],
      [n('dopo_parto'), 'dopo il parto'],
    ];
    return parti.filter(([k]) => k > 0).map(([k, t]) => `${k} ${t}`);
  });
  const vicina = $derived(righe ? rigaVicina(righe, today) : null);
  const vuoto = $derived(righe !== null && righe.length === 0);
  const archivioVisibile = $derived(archivioAperto || cerca.trim() !== '');
  const mostraBackup = $derived(!!dati && !errore && serveBackup(ultimoBackup, dati.mamme.length > 0, today));

  const seed = import.meta.env.DEV
    ? async () => (await import('../lib/devSeed')).seedDemo()
    : null;
</script>

{#snippet riga(r: RigaMamma)}
  {@const post = r.sezione === 'dopo_parto' || (r.sezione === 'archiviata' && !!r.dataParto)}
  <a class="row" class:vicina={r.mammaId === vicina} class:post href="#/mamma/{encodeURIComponent(r.mammaId)}">
    <div class="eg num">
      {#if post}
        {r.postParto ? r.postParto.replace(/^parto /, '') : '—'}<small>dal parto</small>
      {:else if r.upmMancante}
        <span class="manca">UPM mancante</span>
      {:else if r.eg}
        <span class:fuori={r.fuoriRange}>{r.eg}</span><small>settimane</small>
      {/if}
    </div>
    <div class="chi">
      <div class="nome">{r.nome}</div>
      {#if r.daRegistrare.length}
        <div class="info alert">Incontro del {formatShort(r.daRegistrare[0].data)} da registrare</div>
      {:else if r.prossimo}
        <div class="info">{descriviProssimo(r.prossimo, today)}</div>
      {:else}
        <div class="info">Nessun incontro in programma</div>
      {/if}
    </div>
    <div class="arrivo num">
      {#if r.dataParto}
        <b>{formatShort(r.dataParto)}</b><span>parto</span>
      {:else if r.dpp}
        <b>{formatShort(r.dpp)}</b><span>DPP</span>
      {/if}
    </div>
    {#if r.sezione === 'in_gravidanza' && r.egTotaleGiorni !== null}
      <div class="linea"><StationLine totaleGiorni={r.egTotaleGiorni} /></div>
    {/if}
  </a>
{/snippet}

{#snippet nuovaMamma(cls: string)}
  <a class={cls} href="#/mamma/nuova">
    <svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true">
      <path d="M9 2v14M2 9h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
    </svg>
    Nuova mamma
  </a>
{/snippet}

<header>
  <div class="top">
    <h1>Mamme</h1>
    <div class="data">{weekdayIT(today)}<b class="num">{formatShort(today)}</b></div>
  </div>
  {#if mostraBackup}
    <BackupBanner {ultimoBackup} {today} />
  {/if}
  {#if !vuoto && !errore}
    <label class="cerca">
      <span class="sr">Cerca per nome</span>
      <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
        <circle cx="8.5" cy="8.5" r="5.5" /><path d="M13 13l4.5 4.5" stroke-linecap="round" />
      </svg>
      <input type="search" bind:value={cerca} placeholder="Cerca per nome" autocomplete="off" enterkeyhint="search" />
    </label>
    <div class="cols" aria-hidden="true"><span>Epoca</span><span>Mamma · prossimo</span><span>Arrivo</span></div>
  {/if}
</header>

<main>
  {#if errore}
    <p class="nessuno">Impossibile leggere i dati su questo dispositivo.</p>
  {:else if vuoto}
    <div class="vuoto">
      <p>Nessuna mamma ancora: aggiungi la prima.</p>
      {@render nuovaMamma('pill')}
      {#if seed}
        <button type="button" class="seed" onclick={seed}>Carica dati di prova (dev)</button>
      {/if}
    </div>
  {:else if righe}
    {#if filtrate.length === 0}
      <p class="nessuno">Nessuna mamma con questo nome.</p>
    {/if}

    {#each inGravidanza as r (r.mammaId)}
      {@render riga(r)}
    {/each}

    {#if dopoParto.length}
      <h2 class="sez">Dopo il parto</h2>
      {#each dopoParto as r (r.mammaId)}
        {@render riga(r)}
      {/each}
    {/if}

    {#if archiviate.length}
      <h2 class="sez">
        <button type="button" class="toggle" aria-expanded={archivioVisibile} onclick={() => (archivioAperto = !archivioAperto)}>
          Archiviate <span class="num">{archiviate.length}</span>
          <svg viewBox="0 0 12 12" aria-hidden="true" class:aperto={archivioVisibile}>
            <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </h2>
      {#if archivioVisibile}
        {#each archiviate as r (r.mammaId)}
          {@render riga(r)}
        {/each}
      {/if}
    {/if}
  {/if}
</main>

{#if righe && !vuoto && !errore}
  <div class="dock">
    <!-- Parts stay whole; when they cannot share a line they stack without separators. -->
    <div class="conteggio">
      <p class="num">{#each conteggio as parte (parte)}<span>{parte}</span>{/each}</p>
    </div>
    {@render nuovaMamma('pill')}
  </div>
{/if}

<style>
  header {
    background: var(--giallo);
    padding: calc(18px + env(safe-area-inset-top)) 18px 0;
  }
  header:has(> .top:only-child) {
    padding-bottom: 14px;
    border-bottom: 2px solid var(--ink);
  }
  .top {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
  }
  h1 {
    margin: 0;
    font-size: 40px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
    font-stretch: 75%;
    font-variation-settings: 'wdth' 75;
  }
  .data {
    font-size: 15px;
    font-weight: 600;
    text-align: right;
    line-height: 1.15;
  }
  .data b {
    display: block;
    font-size: 22px;
    font-weight: 800;
  }

  .cerca {
    margin-top: 12px;
    display: flex;
    align-items: center;
    gap: 8px;
    height: 44px;
    padding: 0 12px;
    background: var(--carta);
    border: 2px solid var(--ink);
    border-radius: 8px;
  }
  .cerca:focus-within {
    outline: 2px solid var(--ink);
    outline-offset: 2px;
  }
  .cerca svg {
    flex: none;
    width: 20px;
    height: 20px;
  }
  .cerca input {
    flex: 1;
    min-width: 0;
    height: 100%;
    border: 0;
    background: none;
    font-size: 16px;
    outline: none;
  }
  .cerca input::placeholder {
    color: var(--grigio);
  }
  .sr {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
  }

  .cols,
  .row {
    display: grid;
    grid-template-columns: 76px 1fr 66px;
    gap: 10px;
  }
  .cols {
    margin-top: 14px;
    padding: 7px 0;
    border-top: 2px solid var(--ink);
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .cols span:last-child {
    text-align: right;
  }

  /* Exactly the docked strip (44px pill + 2×4px + 1px rule) above the tab bar. */
  main {
    padding-bottom: calc(var(--tabbar-h) + var(--dock-h));
  }
  .row {
    padding: 12px 18px 11px;
    border-bottom: 1px solid var(--filo);
    align-items: start;
    color: inherit;
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
  }
  .row:active {
    background: var(--premuto);
  }
  .row:focus-visible {
    outline-offset: -2px;
  }
  .row.vicina {
    background: var(--vicina);
  }
  .eg {
    font-size: 34px;
    font-weight: 800;
    line-height: 1;
    letter-spacing: -0.01em;
  }
  .eg small {
    display: block;
    font-size: 11px;
    font-weight: 600;
    color: var(--grigio);
    letter-spacing: 0.04em;
    margin-top: 3px;
    font-stretch: 100%;
    font-variation-settings: 'wdth' 100;
  }
  .eg .fuori {
    color: var(--rosso);
  }
  .eg .manca {
    display: block;
    font-size: 13px;
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: 0;
    color: var(--grigio);
    font-stretch: 100%;
    font-variation-settings: 'wdth' 100;
  }
  .post .eg {
    font-size: 22px;
  }
  .chi {
    min-width: 0;
  }
  .nome {
    font-size: 17px;
    font-weight: 700;
    line-height: 1.2;
  }
  .info {
    font-size: 13px;
    color: var(--grigio);
    margin-top: 2px;
    line-height: 1.3;
  }
  .info.alert {
    color: var(--rosso);
    font-weight: 700;
  }
  .arrivo {
    text-align: right;
  }
  .arrivo b {
    display: block;
    font-size: 20px;
    font-weight: 800;
    line-height: 1;
  }
  .arrivo span {
    font-size: 11px;
    color: var(--grigio);
    font-weight: 600;
  }
  .linea {
    grid-column: 2 / 4;
    margin-top: -2px;
  }

  .sez {
    margin: 0;
    padding: 16px 18px 6px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--grigio);
  }
  .toggle {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    min-height: 44px;
    margin: -12px 0 -10px;
    padding: 0;
    border: 0;
    background: none;
    font: inherit;
    letter-spacing: inherit;
    text-transform: inherit;
    color: inherit;
    cursor: pointer;
  }
  .toggle svg {
    width: 12px;
    height: 12px;
    transition: transform 0.15s;
  }
  .toggle svg.aperto {
    transform: rotate(180deg);
  }

  .nessuno,
  .vuoto p {
    margin: 0;
    padding: 20px 18px;
    font-size: 15px;
    color: var(--grigio);
  }
  .vuoto {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    gap: 4px;
  }
  .vuoto .pill {
    margin: 0 18px;
  }
  .seed {
    margin: 24px 18px 0;
    min-height: 44px;
    padding: 0 14px;
    border: 1px dashed var(--grigio);
    border-radius: 8px;
    background: none;
    font-size: 13px;
    color: var(--grigio);
  }

  .pill {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    min-height: 50px;
    padding: 0 20px;
    border-radius: 30px;
    background: var(--ink);
    color: var(--giallo);
    font-size: 16px;
    font-weight: 700;
    text-decoration: none;
  }
  /* The pill's own strip above the tab bar: the list scrolls under it, never behind the pill. */
  .dock {
    position: fixed;
    z-index: 5;
    left: 0;
    right: 0;
    bottom: var(--tabbar-h);
    max-width: var(--col);
    margin: 0 auto;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    height: var(--dock-h);
    padding: 4px calc(16px + env(safe-area-inset-right)) 4px calc(18px + env(safe-area-inset-left));
    background: var(--carta);
    border-top: 1px solid var(--filo);
  }
  .dock .pill {
    flex: none;
    min-height: 44px;
  }
  .conteggio {
    flex: 1;
    min-width: 0;
    container-type: inline-size;
  }
  .conteggio p {
    display: flex;
    flex-wrap: wrap;
    column-gap: 0.3em;
    margin: 0;
    font-size: 16px;
    font-weight: 800;
    line-height: 1.15;
  }
  .conteggio span {
    white-space: nowrap;
  }
  .conteggio span + span::before {
    content: '·';
    margin-right: 0.3em;
  }
  /* Narrower than both parts on one line: they stack, so no separator. */
  @container (max-width: 230px) {
    .conteggio span + span::before {
      content: none;
    }
    .conteggio p {
      flex-direction: column;
    }
  }
</style>
