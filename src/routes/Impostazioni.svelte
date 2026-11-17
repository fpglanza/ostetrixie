<script lang="ts">
  import { liveQuery } from 'dexie';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import Sheet from '../components/Sheet.svelte';
  import {
    backupFilename,
    buildBackup,
    condividiOScarica,
    descriviUltimoBackup,
    restoreBackup,
    segnaBackupFatto,
    validateBackup,
    type Backup,
    type Riepilogo,
  } from '../lib/backup';
  import { formatIT, todayISO } from '../lib/dates';
  import { db, getImpostazioni } from '../lib/db';
  import { serveBackup } from '../lib/overview';

  let ultimoBackup = $state<string | undefined>(undefined);
  let haDati = $state(false);
  $effect(() => {
    const sub = liveQuery(async () => ({
      imp: await getImpostazioni(),
      mamme: await db.mamme.count(),
    })).subscribe({
      next: ({ imp, mamme }) => {
        ultimoBackup = imp.ultimoBackup;
        haDati = mamme > 0;
      },
    });
    return () => sub.unsubscribe();
  });

  const today = todayISO();
  const giornoDi = (iso: string) => formatIT(todayISO(new Date(iso)));
  const piu = (n: number, uno: string, molti: string) => `${n} ${n === 1 ? uno : molti}`;
  const contenuto = (r: { mamme: number; incontri: number }) =>
    `${piu(r.mamme, 'mamma', 'mamme')}, ${piu(r.incontri, 'incontro', 'incontri')}`;

  let messaggio = $state('');
  let errore = $state('');
  const avvisa = (m: string, e = '') => {
    messaggio = m;
    errore = e;
  };

  // --- Export: the backup is built when the warning opens, so the tap on "Esporta"
  // can start the share sheet immediately (iOS requires it inside the gesture).
  let esportaAperto = $state(false);
  let pronto = $state.raw<Backup | null>(null);

  function apriEsporta() {
    avvisa('');
    pronto = null;
    esportaAperto = true;
    buildBackup().then(
      (b) => (pronto = b),
      () => {
        chiudiEsporta();
        avvisa('', 'Impossibile leggere i dati da esportare.');
      },
    );
  }

  function chiudiEsporta() {
    esportaAperto = false;
    pronto = null;
    // Coming from "Esporta prima i dati attuali": go back to the pending import.
    if (inAttesa) confermaAperta = true;
  }

  function esporta() {
    if (!pronto) return;
    const condivisione = condividiOScarica(pronto, backupFilename(todayISO()));
    chiudiEsporta();
    condivisione
      .then(async (fatto) => {
        if (!fatto) return;
        await segnaBackupFatto(new Date());
        avvisa('Backup esportato.');
      })
      .catch(() => avvisa('', 'Esportazione non riuscita.'));
  }

  // --- Import
  let fileInput: HTMLInputElement;
  // Raw: a deep $state proxy could not be stored by IndexedDB (DataCloneError).
  let inAttesa = $state.raw<{ backup: Backup; riepilogo: Riepilogo } | null>(null);
  let confermaAperta = $state(false);

  async function fileScelto() {
    const file = fileInput.files?.[0];
    fileInput.value = '';
    if (!file) return;
    avvisa('');
    let raw: unknown;
    try {
      raw = JSON.parse(await file.text());
    } catch {
      avvisa('', 'Questo file non è leggibile: non è un backup di Ostetrixie.');
      return;
    }
    const r = validateBackup(raw);
    if (!r.ok) {
      avvisa('', r.errore);
      return;
    }
    inAttesa = { backup: r.backup, riepilogo: r.riepilogo };
    confermaAperta = true;
  }

  function annullaImport() {
    confermaAperta = false;
    inAttesa = null;
  }

  async function importa() {
    const p = inAttesa;
    annullaImport();
    if (!p) return;
    try {
      await restoreBackup(p.backup);
      avvisa(`Dati importati: ${contenuto(p.riepilogo)}.`);
    } catch {
      avvisa('', 'Importazione non riuscita: i dati attuali non sono stati modificati.');
    }
  }

  function esportaPrima() {
    confermaAperta = false;
    apriEsporta();
  }
</script>

<header>
  <h1>Impostazioni</h1>
</header>

<main>
  <section aria-labelledby="sez-backup">
    <h2 class="sez" id="sez-backup">Backup</h2>
    <div class="riga">
      <span class="etichetta">Ultimo backup</span>
      <span class="valore" class:scaduto={serveBackup(ultimoBackup, haDati, today)}>
        {#if ultimoBackup}
          <b class="num">{giornoDi(ultimoBackup)}</b>
          <small>{descriviUltimoBackup(ultimoBackup, today)}</small>
        {:else}
          <b>mai</b>
        {/if}
      </span>
    </div>
    <div class="corpo">
      <p class="nota">
        I dati sono salvati solo su questo telefono. Esporta un backup almeno ogni due settimane e
        conservalo fuori dal telefono.
      </p>
      <div class="azioni">
        <button type="button" class="btn primario pieno" disabled={!haDati} onclick={apriEsporta}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
            <path d="M10 3v9M6 8.5l4 4 4-4M3.5 14.5v2h13v-2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Esporta backup
        </button>
        <button type="button" class="btn pieno" onclick={() => fileInput.click()}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
            <path d="M10 12.5v-9M6 7l4-4 4 4M3.5 14.5v2h13v-2" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          Importa backup
        </button>
        <input
          bind:this={fileInput}
          type="file"
          accept=".json,application/json"
          hidden
          onchange={fileScelto}
        />
      </div>
      {#if !haDati}
        <p class="nota">Nessun dato da esportare.</p>
      {/if}
      <p class="esito" role="status">{messaggio}</p>
      <p class="errore" role="alert">{errore}</p>
    </div>
  </section>
</main>

<Sheet open={esportaAperto} titolo="Esporta backup" onclose={chiudiEsporta}>
  <p class="avviso">Il file contiene dati sanitari: conservalo in un posto sicuro e non inviarlo via chat.</p>
  <div class="azioni">
    <button type="button" class="btn primario pieno" disabled={!pronto} onclick={esporta}>Esporta</button>
    <button type="button" class="btn piano pieno" onclick={chiudiEsporta}>Annulla</button>
  </div>
</Sheet>

<ConfirmDialog
  open={confermaAperta}
  titolo="Sostituire tutti i dati?"
  testo={inAttesa
    ? `Backup del ${giornoDi(inAttesa.riepilogo.esportatoIl)}: ${contenuto(inAttesa.riepilogo)}. Sostituisce tutti i dati presenti su questo telefono e non si può annullare.`
    : ''}
  conferma="Sostituisci tutti i dati"
  pericoloso
  alternativa={haDati ? 'Esporta prima i dati attuali' : undefined}
  onconferma={importa}
  onalternativa={esportaPrima}
  onannulla={annullaImport}
/>

<style>
  header {
    background: var(--giallo);
    padding: calc(18px + env(safe-area-inset-top)) 18px 14px;
    border-bottom: 2px solid var(--ink);
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
  main {
    padding-bottom: calc(var(--tabbar-h) + 24px);
  }
  section {
    border-bottom: 2px solid var(--ink);
  }
  .sez {
    margin: 0;
    padding: 18px 18px 8px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--grigio);
  }
  .riga {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    gap: 12px;
    padding: 10px 18px 12px;
    border-top: 2px solid var(--ink);
    border-bottom: 1px solid var(--filo);
  }
  .etichetta {
    font-size: 17px;
    font-weight: 700;
  }
  .valore {
    text-align: right;
    line-height: 1.1;
  }
  .valore b {
    display: block;
    font-size: 26px;
    font-weight: 800;
  }
  .valore small {
    font-size: 13px;
    font-weight: 600;
    color: var(--grigio);
  }
  .valore.scaduto b,
  .valore.scaduto small {
    color: var(--rosso);
  }
  .corpo {
    padding: 4px 18px 18px;
  }
  .nota {
    margin: 10px 0 14px;
    font-size: 14px;
    line-height: 1.4;
    color: var(--grigio);
  }
  .azioni {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .azioni svg {
    width: 20px;
    height: 20px;
  }
  .esito,
  .errore {
    margin: 0;
    font-size: 14px;
    font-weight: 700;
    line-height: 1.4;
  }
  .esito:not(:empty),
  .errore:not(:empty) {
    margin-top: 12px;
  }
  .errore {
    color: var(--rosso);
  }
  .avviso {
    margin: 0 0 20px;
    font-size: 16px;
    line-height: 1.45;
  }
</style>
