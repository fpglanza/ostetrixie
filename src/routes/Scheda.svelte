<script lang="ts">
  import { liveQuery } from 'dexie';
  import CampiGravidanza from '../components/CampiGravidanza.svelte';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import Sheet from '../components/Sheet.svelte';
  import StationLine from '../components/StationLine.svelte';
  import { formatIT, formatShort, todayISO, weekdayIT } from '../lib/dates';
  import { descriviProssimo } from '../lib/mammeView';
  import { dppEffettiva, dppFromUpm, egAt, formatEG, postPartumAt } from '../lib/obstetrics';
  import { deleteMamma, getMammaDetail, nuovaGravidanza, updateGravidanza, updateMamma } from '../lib/repo';
  import { navigate } from '../lib/router.svelte';
  import { gravidanzeScheda, prossimoIncontro, righeIncontri, testo, type RigaIncontro } from '../lib/schedaView';
  import type { Gravidanza } from '../lib/types';

  let { id }: { id: string } = $props();

  type Dettaglio = Awaited<ReturnType<typeof getMammaDetail>>;
  let dati = $state<Dettaglio | undefined>(undefined);
  let errore = $state(false);
  $effect(() => {
    const sub = liveQuery(() => getMammaDetail(id)).subscribe({
      next: (d) => {
        dati = d;
        errore = false;
      },
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

  const mamma = $derived(dati?.mamma);
  const nome = $derived(mamma ? mamma.nome + (mamma.cognome ? ' ' + mamma.cognome : '') : '');
  const grav = $derived(dati ? gravidanzeScheda(dati.gravidanze) : { corrente: null, precedenti: [] });
  const g = $derived(grav.corrente);
  const incontri = $derived(g && dati ? dati.incontriByGravidanza[g.id] ?? [] : []);
  const righe = $derived(g ? righeIncontri(incontri, g, today) : []);
  const eg = $derived(g && !g.dataParto ? egAt(g, today) : null);
  const dpp = $derived(g ? dppEffettiva(g) : null);
  const prossimo = $derived(prossimoIncontro(incontri, today));
  const scaduti = $derived(righe.filter((r) => r.daRegistrare));
  const haAnamnesi = $derived(!!(mamma?.anamnesi || g?.anamnesiOstetrica || mamma?.note));

  // Sheets
  let menu = $state(false);
  let foglio = $state<'parto' | 'gravidanza' | 'elimina' | null>(null);
  let precedentiAperte = $state(false);
  let dataParto = $state('');
  let nuova = $state({ upm: '', dppEco: '', anamnesiOstetrica: '' });
  let lavoro = $state(false);

  function apri(f: NonNullable<typeof foglio>) {
    menu = false;
    if (f === 'parto') dataParto = g?.dataParto ?? today;
    if (f === 'gravidanza') nuova = { upm: '', dppEco: '', anamnesiOstetrica: '' };
    foglio = f;
  }
  const chiudi = () => (foglio = null);

  async function esegui(azione: () => Promise<unknown>) {
    if (lavoro) return;
    lavoro = true;
    try {
      await azione();
      foglio = null;
      menu = false;
    } finally {
      lavoro = false;
    }
  }

  const registraParto = () => esegui(() => updateGravidanza(g!.id, { dataParto }));
  const annullaParto = () => esegui(() => updateGravidanza(g!.id, { dataParto: undefined, stato: 'in_corso' }));
  const creaGravidanza = () =>
    esegui(() =>
      nuovaGravidanza(id, {
        upm: testo(nuova.upm),
        dppEco: testo(nuova.dppEco),
        anamnesiOstetrica: testo(nuova.anamnesiOstetrica),
      }),
    );
  const archivia = (archiviata: boolean) => esegui(() => updateMamma(id, { archiviata }));
  const elimina = () =>
    esegui(async () => {
      await deleteMamma(id);
      navigate('#/', { replace: true });
    });

  function intestazione(x: Gravidanza): string {
    if (x.dataParto) return `Parto ${formatIT(x.dataParto)}`;
    const d = dppEffettiva(x);
    return d ? `DPP ${formatIT(d)}` : 'Senza date';
  }
</script>

{#snippet orario(lista: RigaIncontro[])}
  {#if lista.length === 0}
    <p class="vuoto">Nessun incontro.</p>
  {:else}
    <div class="cols" aria-hidden="true"><span>N.</span><span>Data</span><span>Epoca</span><span>Incontro</span></div>
    <ol class="incontri">
      {#each lista as r (r.incontro.id)}
        <li>
          <a class="riga" class:alert={r.daRegistrare} href="#/incontro/{encodeURIComponent(r.incontro.id)}">
            <span class="n num">{r.n}</span>
            <span class="quando num">
              <b>{formatShort(r.incontro.data)}</b>
              <small>{weekdayIT(r.incontro.data, true)}{r.incontro.ora ? ' ' + r.incontro.ora : ''}</small>
            </span>
            <span class="epoca num" class:fuori={r.fuoriRange}>{r.epoca ?? '—'}</span>
            <span class="cosa">
              <b>{r.tipo}</b>
              <small>
                {#if r.daRegistrare}
                  da registrare
                {:else if r.programmato}
                  in programma
                {:else}
                  {#if r.sf}<span>{r.sf}</span>{/if}
                  {#if r.sf && r.partner}<span aria-hidden="true"> · </span>{/if}
                  {#if r.partner}
                    <span class="partner">
                      partner
                      <svg viewBox="0 0 14 14" aria-label="presente" role="img">
                        <path d="M2.5 7.5l3 3 6-7" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" />
                      </svg>
                    </span>
                  {/if}
                  {#if !r.sf && !r.partner}fatto{/if}
                {/if}
              </small>
            </span>
          </a>
        </li>
      {/each}
    </ol>
  {/if}
{/snippet}

<header>
  <a class="icona" href="#/" aria-label="Torna alle mamme">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </a>
  <h1>{nome || 'Scheda mamma'}</h1>
  {#if mamma}
    <button type="button" class="icona" aria-label="Azioni" aria-haspopup="dialog" onclick={() => (menu = true)}>
      <svg viewBox="0 0 24 24" aria-hidden="true" fill="currentColor">
        <circle cx="12" cy="5" r="2.2" /><circle cx="12" cy="12" r="2.2" /><circle cx="12" cy="19" r="2.2" />
      </svg>
    </button>
  {/if}
</header>

<main>
  {#if errore}
    <p class="msg">Impossibile leggere i dati su questo dispositivo.</p>
  {:else if dati === null}
    <p class="msg">Mamma non trovata. <a href="#/">Torna alle mamme</a></p>
  {:else if mamma}
    {#if mamma.archiviata || mamma.telefono || mamma.dataNascita}
      <p class="dati">
        {#if mamma.archiviata}<b>Archiviata</b>{/if}
        {#if mamma.telefono}<a href="tel:{mamma.telefono.replace(/\s+/g, '')}" class="num">{mamma.telefono}</a>{/if}
        {#if mamma.dataNascita}<span>nata il <span class="num">{formatIT(mamma.dataNascita)}</span></span>{/if}
      </p>
    {/if}

    <section class="quadro" aria-label="Gravidanza in corso">
      {#if g?.dataParto}
        {@const pp = postPartumAt(g.dataParto, today)}
        <div class="grande num post">{pp ? pp.replace(/^parto /, '') : '—'}<small>dal parto</small></div>
        <div class="arrivo num"><b>{formatIT(g.dataParto)}</b><span>parto</span></div>
      {:else if eg && dpp}
        <div class="grande num" class:fuori={eg.fuoriRange}>
          {formatEG(eg)}<small>{eg.fuoriRange ? 'fuori range: controlla le date' : 'settimane oggi'}</small>
        </div>
        <div class="arrivo num">
          <b>{formatIT(dpp)}</b><span>DPP{g?.dppEco ? ' corretta da eco' : ''}</span>
          {#if g?.dppEco && g.upm}<span>da UPM {formatIT(dppFromUpm(g.upm))}</span>{/if}
          {#if g?.upm}<span>UPM {formatIT(g.upm)}</span>{/if}
        </div>
        <div class="linea"><StationLine totaleGiorni={eg.totaleGiorni} /></div>
      {:else}
        <div class="manca">
          UPM mancante
          <a href="#/mamma/{encodeURIComponent(id)}/modifica">Aggiungi l'UPM</a>
        </div>
      {/if}
    </section>

    <div class="prossimo">
      <span class="etichetta">Prossimo incontro</span>
      {#if scaduti.length}
        <span class="alert">Incontro del <span class="num">{formatShort(scaduti[scaduti.length - 1].incontro.data)}</span> da registrare</span>
      {/if}
      <span>{prossimo ? descriviProssimo(prossimo, today) : 'Nessuno in programma'}</span>
    </div>

    <details class="anamnesi">
      <summary>
        Anamnesi
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </summary>
      {#if !haAnamnesi}
        <p class="vuoto">Nessuna anamnesi registrata.</p>
      {/if}
      {#if mamma.anamnesi}<h3>Generale</h3><p class="testo">{mamma.anamnesi}</p>{/if}
      {#if g?.anamnesiOstetrica}<h3>Ostetrica</h3><p class="testo">{g.anamnesiOstetrica}</p>{/if}
      {#if mamma.note}<h3>Note</h3><p class="testo">{mamma.note}</p>{/if}
    </details>

    <div class="testa-incontri">
      <h2>Incontri</h2>
      {#if g}
        <a class="btn primario piccolo" href="#/gravidanza/{encodeURIComponent(g.id)}/incontro/nuovo">
          <svg width="16" height="16" viewBox="0 0 18 18" aria-hidden="true">
            <path d="M9 2v14M2 9h14" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" />
          </svg>
          Incontro
        </a>
      {/if}
    </div>
    {@render orario(righe)}

    {#if grav.precedenti.length}
      <h2 class="sez">
        <button type="button" class="toggle" aria-expanded={precedentiAperte} onclick={() => (precedentiAperte = !precedentiAperte)}>
          Gravidanze precedenti <span class="num">{grav.precedenti.length}</span>
          <svg viewBox="0 0 12 12" aria-hidden="true" class:aperto={precedentiAperte}>
            <path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </h2>
      {#if precedentiAperte}
        {#each grav.precedenti as p (p.id)}
          <section class="precedente">
            <h3 class="num">{intestazione(p)}</h3>
            {#if p.anamnesiOstetrica}<p class="testo">{p.anamnesiOstetrica}</p>{/if}
            {@render orario(righeIncontri(dati?.incontriByGravidanza[p.id] ?? [], p, today))}
          </section>
        {/each}
      {/if}
    {/if}
  {/if}
</main>

{#if mamma}
  <Sheet open={menu} titolo={nome} onclose={() => (menu = false)}>
    <div class="menu">
      <a href="#/mamma/{encodeURIComponent(id)}/modifica" onclick={() => (menu = false)}>Modifica dati</a>
      {#if g && g.stato === 'in_corso'}
        <button type="button" onclick={() => apri('parto')}>Registra parto</button>
      {:else if g?.dataParto}
        <button type="button" onclick={() => apri('parto')}>Data del parto</button>
      {/if}
      <button type="button" onclick={() => apri('gravidanza')}>Nuova gravidanza</button>
      <button type="button" onclick={() => archivia(!mamma.archiviata)}>{mamma.archiviata ? 'Riattiva' : 'Archivia'}</button>
      <button type="button" class="rosso" onclick={() => apri('elimina')}>Elimina</button>
      <button type="button" class="chiudi" onclick={() => (menu = false)}>Chiudi</button>
    </div>
  </Sheet>

  <Sheet open={foglio === 'parto'} titolo={g?.stato === 'in_corso' ? 'Registra parto' : 'Data del parto'} onclose={chiudi}>
    <label class="campo">
      <span>Data del parto</span>
      <input type="date" bind:value={dataParto} max={today} />
    </label>
    <div class="azioni">
      <button type="button" class="btn primario pieno" disabled={!dataParto || lavoro} onclick={registraParto}>
        {g?.stato === 'in_corso' ? 'Registra parto' : 'Salva'}
      </button>
      {#if g?.dataParto}
        <button type="button" class="btn pieno" disabled={lavoro} onclick={annullaParto}>Annulla parto</button>
      {/if}
      <button type="button" class="btn piano pieno" onclick={chiudi}>Chiudi</button>
    </div>
  </Sheet>

  <Sheet open={foglio === 'gravidanza'} titolo="Nuova gravidanza" onclose={chiudi}>
    {#if g && !g.dataParto}
      <p class="nota">La gravidanza attuale passerà tra le precedenti.</p>
    {/if}
    <CampiGravidanza bind:upm={nuova.upm} bind:dppEco={nuova.dppEco} bind:anamnesiOstetrica={nuova.anamnesiOstetrica} {today} />
    <div class="azioni">
      <button type="button" class="btn primario pieno" disabled={lavoro} onclick={creaGravidanza}>Crea gravidanza</button>
      <button type="button" class="btn piano pieno" onclick={chiudi}>Annulla</button>
    </div>
  </Sheet>

  <ConfirmDialog
    open={foglio === 'elimina'}
    titolo="Eliminare {nome}?"
    testo="Verranno eliminate per sempre anche tutte le sue gravidanze e tutti gli incontri. Se vuoi solo toglierla dall'elenco, archiviala."
    conferma="Elimina tutto"
    pericoloso
    alternativa={mamma.archiviata ? undefined : 'Archivia'}
    onconferma={elimina}
    onalternativa={() => archivia(true)}
    onannulla={chiudi}
  />
{/if}

<style>
  header {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--giallo);
    padding: calc(12px + env(safe-area-inset-top)) 6px 12px;
    border-bottom: 2px solid var(--ink);
  }
  h1 {
    flex: 1;
    min-width: 0;
    margin: 0;
    font-size: 34px;
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.02em;
    font-stretch: 75%;
    font-variation-settings: 'wdth' 75;
    overflow-wrap: anywhere;
  }
  .icona {
    flex: none;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: none;
    color: var(--ink);
    cursor: pointer;
  }
  .icona svg {
    width: 26px;
    height: 26px;
  }

  main {
    padding-bottom: calc(var(--tabbar-h) + 32px);
  }
  .msg {
    margin: 0;
    padding: 20px 18px;
    color: var(--grigio);
  }
  .msg a,
  .manca a {
    color: var(--ink);
    font-weight: 700;
  }
  .dati {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0 14px;
    margin: 0;
    padding: 4px 18px;
    font-size: 14px;
    color: var(--grigio);
    border-bottom: 1px solid var(--filo);
  }
  .dati a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    color: var(--ink);
    font-size: 16px;
    font-weight: 700;
  }
  .dati b {
    color: var(--ink);
    text-transform: uppercase;
    font-size: 12px;
    letter-spacing: 0.06em;
  }

  .quadro {
    display: grid;
    grid-template-columns: 1fr auto;
    gap: 6px 12px;
    align-items: start;
    padding: 16px 18px 14px;
    border-bottom: 2px solid var(--ink);
  }
  .grande {
    font-size: 72px;
    font-weight: 800;
    line-height: 0.9;
    letter-spacing: -0.02em;
  }
  .grande.post {
    font-size: 48px;
  }
  .grande small,
  .arrivo span {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--grigio);
    letter-spacing: 0.02em;
    margin-top: 4px;
    font-stretch: 100%;
    font-variation-settings: 'wdth' 100;
  }
  .grande.fuori {
    color: var(--rosso);
  }
  .grande.fuori small {
    color: var(--rosso);
  }
  .arrivo {
    text-align: right;
  }
  .arrivo b {
    display: block;
    font-size: 28px;
    font-weight: 800;
    line-height: 1;
  }
  .arrivo span + span {
    margin-top: 2px;
  }
  .linea {
    grid-column: 1 / 3;
    margin-top: 8px;
  }
  .manca {
    grid-column: 1 / 3;
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    font-size: 22px;
    font-weight: 800;
    color: var(--grigio);
  }
  .manca a {
    display: inline-flex;
    align-items: center;
    min-height: 44px;
    font-size: 15px;
  }

  .prossimo {
    display: flex;
    flex-direction: column;
    padding: 10px 18px 11px;
    border-bottom: 1px solid var(--filo);
    font-size: 16px;
    font-weight: 600;
  }
  .etichetta,
  .sez,
  .cols,
  .anamnesi summary,
  .testa-incontri h2 {
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  .etichetta {
    color: var(--grigio);
    margin-bottom: 2px;
  }
  .alert {
    color: var(--rosso);
    font-weight: 700;
  }

  .anamnesi {
    border-bottom: 1px solid var(--filo);
  }
  .anamnesi summary {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 48px;
    padding: 0 18px;
    color: var(--grigio);
    cursor: pointer;
    list-style: none;
  }
  .anamnesi summary::-webkit-details-marker {
    display: none;
  }
  .anamnesi summary:focus-visible {
    outline-offset: -2px;
  }
  .anamnesi svg,
  .toggle svg {
    width: 12px;
    height: 12px;
    transition: transform 0.15s;
  }
  .anamnesi[open] summary svg,
  .toggle svg.aperto {
    transform: rotate(180deg);
  }
  .anamnesi h3,
  .precedente h3 {
    margin: 0;
    padding: 0 18px 2px;
    font-size: 13px;
    font-weight: 700;
  }
  .testo {
    margin: 0;
    padding: 0 18px 12px;
    font-size: 15px;
    white-space: pre-wrap;
  }

  .testa-incontri {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 14px 18px 8px;
  }
  .testa-incontri h2 {
    margin: 0;
    font-size: 14px;
    color: var(--ink);
  }
  .btn.piccolo {
    min-height: 44px;
    padding: 0 16px;
    font-size: 15px;
  }

  .cols,
  .riga {
    display: grid;
    grid-template-columns: 26px 52px 58px 1fr;
    gap: 8px;
  }
  .cols {
    padding: 7px 18px;
    border-top: 2px solid var(--ink);
    border-bottom: 1px solid var(--filo);
  }
  .incontri {
    margin: 0;
    padding: 0;
    list-style: none;
  }
  .riga {
    padding: 11px 18px 10px;
    min-height: 56px;
    border-bottom: 1px solid var(--filo);
    align-items: start;
    color: inherit;
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
  }
  .riga:active {
    background: var(--premuto);
  }
  .riga:focus-visible {
    outline-offset: -2px;
  }
  .n {
    font-size: 15px;
    font-weight: 700;
    color: var(--grigio);
    line-height: 22px;
  }
  .quando b,
  .epoca {
    font-size: 20px;
    font-weight: 800;
    line-height: 22px;
  }
  .quando b {
    display: block;
  }
  .quando small,
  .cosa small {
    display: block;
    font-size: 12px;
    color: var(--grigio);
    margin-top: 2px;
  }
  .quando small {
    white-space: nowrap;
  }
  .epoca.fuori {
    color: var(--rosso);
  }
  .cosa {
    min-width: 0;
  }
  .cosa b {
    display: block;
    font-size: 16px;
    font-weight: 700;
    line-height: 22px;
  }
  .cosa small {
    font-size: 13px;
  }
  .partner {
    display: inline-flex;
    align-items: center;
    gap: 2px;
    color: var(--ink);
    font-weight: 600;
  }
  .partner svg {
    width: 14px;
    height: 14px;
  }
  .riga.alert .quando b,
  .riga.alert .quando small,
  .riga.alert .cosa small {
    color: var(--rosso);
  }
  .riga.alert .cosa small {
    font-weight: 700;
  }
  .vuoto {
    margin: 0;
    padding: 4px 18px 14px;
    font-size: 15px;
    color: var(--grigio);
  }

  .sez {
    margin: 0;
    padding: 16px 18px 6px;
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
  .precedente {
    padding-top: 10px;
  }
  .precedente h3 {
    font-size: 16px;
    padding-bottom: 6px;
  }

  .menu {
    display: flex;
    flex-direction: column;
    margin: 0 -18px;
    border-top: 1px solid var(--filo);
  }
  .menu a,
  .menu button {
    display: flex;
    align-items: center;
    min-height: 52px;
    padding: 0 18px;
    border: 0;
    border-bottom: 1px solid var(--filo);
    background: none;
    font-size: 17px;
    font-weight: 700;
    text-align: left;
    color: var(--ink);
    text-decoration: none;
    cursor: pointer;
  }
  .menu a:active,
  .menu button:active {
    background: var(--premuto);
  }
  .menu :focus-visible {
    outline-offset: -2px;
  }
  .menu .rosso {
    color: var(--rosso);
  }
  .menu .chiudi {
    justify-content: center;
    border-bottom: 0;
    color: var(--grigio);
    font-weight: 600;
  }
  .azioni {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .nota {
    margin: 0 0 14px;
    font-size: 15px;
    color: var(--grigio);
  }
</style>
