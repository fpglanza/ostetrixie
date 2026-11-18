<script lang="ts">
  import { liveQuery } from 'dexie';
  import CancellaDati from '../components/CancellaDati.svelte';
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
  import { aggiornaImpostazioni, db, getImpostazioni } from '../lib/db';
  import { lock } from '../lib/lock.svelte';
  import { hashPin, isValidPin } from '../lib/pin';
  import { serveBackup } from '../lib/overview';

  let ultimoBackup = $state<string | undefined>(undefined);
  let haDati = $state(false);
  let timeoutMinuti = $state(5);
  $effect(() => {
    const sub = liveQuery(async () => ({
      imp: await getImpostazioni(),
      mamme: await db.mamme.count(),
    })).subscribe({
      next: ({ imp, mamme }) => {
        ultimoBackup = imp.ultimoBackup;
        timeoutMinuti = imp.timeoutMinuti;
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

  // --- PIN
  type ModoPin = 'imposta' | 'cambia' | 'disattiva';
  const TITOLI_PIN: Record<ModoPin, string> = {
    imposta: 'Imposta PIN',
    cambia: 'Cambia PIN',
    disattiva: 'Disattiva PIN',
  };
  let modoPin = $state<ModoPin | null>(null);
  let pinAttuale = $state('');
  let pinNuovo = $state('');
  let pinRipeti = $state('');
  let erronePin = $state('');
  let salvaPin = $state(false);
  let esitoPin = $state('');

  function apriPin(m: ModoPin) {
    pinAttuale = pinNuovo = pinRipeti = erronePin = esitoPin = '';
    modoPin = m;
  }
  const chiudiPin = () => (modoPin = null);

  async function confermaPin(e: SubmitEvent) {
    e.preventDefault();
    const m = modoPin;
    if (!m || salvaPin) return;
    erronePin = '';
    if (m !== 'disattiva') {
      if (!isValidPin(pinNuovo)) return void (erronePin = 'Il PIN deve avere da 4 a 6 cifre.');
      if (pinNuovo !== pinRipeti) return void (erronePin = 'I due PIN non coincidono.');
    }
    salvaPin = true;
    try {
      if (m !== 'imposta') {
        const esito = await lock.verifica(pinAttuale);
        if (esito !== 'ok') {
          pinAttuale = '';
          erronePin =
            esito === 'attendi' || lock.attesaFino > Date.now()
              ? 'Troppi tentativi: riprova tra 30 secondi.'
              : 'PIN attuale errato.';
          return;
        }
      }
      if (m === 'disattiva') {
        await aggiornaImpostazioni({ pinHash: undefined, pinSalt: undefined });
        esitoPin = 'PIN disattivato.';
      } else {
        const { hash, salt } = await hashPin(pinNuovo);
        await aggiornaImpostazioni({ pinHash: hash, pinSalt: salt });
        esitoPin = m === 'imposta' ? 'PIN impostato.' : 'PIN cambiato.';
      }
      modoPin = null;
    } catch {
      erronePin = 'Salvataggio non riuscito.';
    } finally {
      salvaPin = false;
    }
  }

  async function cambiaTimeout(e: Event) {
    const v = Number((e.currentTarget as HTMLSelectElement).value);
    await aggiornaImpostazioni({ timeoutMinuti: v });
  }

  // --- Cancella tutti i dati
  let passoReset = $state<0 | 1 | 2>(0);
  function cancellato() {
    lock.unlock();
    avvisa('Tutti i dati sono stati cancellati.');
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

  <section aria-labelledby="sez-blocco">
    <h2 class="sez" id="sez-blocco">Blocco</h2>
    <div class="riga">
      <span class="etichetta">PIN</span>
      <span class="valore"><b class="parola">{lock.haPin ? 'attivo' : 'non impostato'}</b></span>
    </div>
    <div class="corpo">
      <p class="nota">Il PIN protegge l'accesso all'app ma non cifra i dati.</p>
      {#if lock.haPin}
        <label class="campo scelta">
          <span>Blocca quando l'app resta chiusa per</span>
          <div class="tendina">
            <select value={String(timeoutMinuti)} onchange={cambiaTimeout}>
              <option value="1">1 minuto</option>
              <option value="5">5 minuti</option>
              <option value="15">15 minuti</option>
            </select>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.4" aria-hidden="true">
              <path d="M5 7.5l5 5 5-5" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </div>
        </label>
        <div class="azioni">
          <button type="button" class="btn pieno" onclick={() => apriPin('cambia')}>Cambia PIN</button>
          <button type="button" class="btn pieno" onclick={() => apriPin('disattiva')}>Disattiva PIN</button>
        </div>
      {:else}
        <div class="azioni">
          <button type="button" class="btn primario pieno" onclick={() => apriPin('imposta')}>
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
              <rect x="4" y="9" width="12" height="8.5" rx="1.5" /><path d="M7 9V6.5a3 3 0 0 1 6 0V9" />
            </svg>
            Imposta PIN
          </button>
        </div>
      {/if}
      <p class="esito" role="status">{esitoPin}</p>
    </div>
  </section>

  <section aria-labelledby="sez-dati">
    <h2 class="sez" id="sez-dati">Dati</h2>
    <div class="corpo bordo">
      <p class="nota">
        Cancella dal telefono tutte le mamme, gli incontri e il PIN. Serve anche se hai dimenticato
        il PIN: poi puoi reimportare un backup.
      </p>
      <button type="button" class="btn pieno" onclick={() => (passoReset = 1)}>Cancella tutti i dati</button>
    </div>
  </section>
</main>

<Sheet open={modoPin !== null} titolo={modoPin ? TITOLI_PIN[modoPin] : ''} onclose={chiudiPin}>
  <form onsubmit={confermaPin}>
    {#if modoPin !== 'imposta'}
      <label class="campo">
        <span>PIN attuale</span>
        <input
          type="password"
          inputmode="numeric"
          autocomplete="off"
          maxlength="6"
          class="num"
          bind:value={pinAttuale}
        />
      </label>
    {/if}
    {#if modoPin !== 'disattiva'}
      <label class="campo">
        <span>Nuovo PIN <small>da 4 a 6 cifre</small></span>
        <input
          type="password"
          inputmode="numeric"
          autocomplete="new-password"
          maxlength="6"
          class="num"
          bind:value={pinNuovo}
        />
      </label>
      <label class="campo">
        <span>Ripeti il nuovo PIN</span>
        <input
          type="password"
          inputmode="numeric"
          autocomplete="new-password"
          maxlength="6"
          class="num"
          bind:value={pinRipeti}
        />
      </label>
    {/if}
    <p class="errore" role="alert">{erronePin}</p>
    <div class="azioni">
      <button type="submit" class="btn primario pieno" disabled={salvaPin}>
        {modoPin === 'disattiva' ? 'Disattiva PIN' : 'Salva PIN'}
      </button>
      <button type="button" class="btn piano pieno" onclick={chiudiPin}>Annulla</button>
    </div>
  </form>
</Sheet>

<CancellaDati bind:passo={passoReset} oncancellato={cancellato} />

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
  .valore b.parola {
    font-size: 17px;
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
  .corpo.bordo {
    border-top: 2px solid var(--ink);
    padding-top: 4px;
  }
  .tendina {
    position: relative;
  }
  .tendina svg {
    position: absolute;
    right: 14px;
    top: 50%;
    width: 20px;
    height: 20px;
    transform: translateY(-50%);
    pointer-events: none;
  }
  .scelta select {
    display: block;
    width: 100%;
    min-height: 48px;
    padding: 10px 44px 10px 12px;
    appearance: none;
    -webkit-appearance: none;
    border: 2px solid var(--ink);
    border-radius: 8px;
    background: var(--carta);
    font-size: 16px;
    font-weight: 700;
  }
  form .errore:not(:empty) {
    margin: 0 0 12px;
  }
  .avviso {
    margin: 0 0 20px;
    font-size: 16px;
    line-height: 1.45;
  }
</style>
