<script lang="ts" module>
  /** Set by "Salva e copia" on a new incontro: the edit screen it opens shows the copy sheet. */
  let copiaDopoSalvataggio: string | null = null;
</script>

<script lang="ts">
  import { tick } from 'svelte';
  import ConfirmDialog from '../components/ConfirmDialog.svelte';
  import Sheet from '../components/Sheet.svelte';
  import { formatIT, todayISO } from '../lib/dates';
  import {
    aIncontroInput,
    destinatariCopia,
    formDaIncontro,
    formNuovo,
    isDirty,
    lineaEpoca,
    statoDefault,
    tipoDefault,
    type Destinatario,
    type ErroriIncontro,
    type FormIncontro,
  } from '../lib/incontroForm';
  import {
    copiaIncontro,
    deleteIncontro,
    getAllData,
    getGravidanzaContext,
    getIncontroContext,
    saveIncontro,
  } from '../lib/repo';
  import { navigate } from '../lib/router.svelte';
  import type { Gravidanza, Incontro, Mamma } from '../lib/types';
  import { unsaved } from '../lib/unsaved.svelte';

  /** `gid` for a new incontro in that pregnancy, `id` to open an existing one. */
  let { gid, id }: { gid?: string; id?: string } = $props();

  const today = todayISO();

  let mamma = $state<Mamma | null>(null);
  let grav = $state<Gravidanza | null>(null);
  let salvatoId = $state<string | undefined>(undefined);
  /** stato of the record as loaded (or last saved); drives "Segna come fatto". */
  let statoCaricato = $state<Incontro['stato'] | null>(null);
  let form = $state<FormIncontro>(formNuovo({}, today));
  let base = $state<FormIncontro | null>(null);
  let nonTrovato = $state(false);
  let misureAperte = $state(false);
  let toccatoStato = false;
  let toccatoTipo = false;

  let errori = $state<ErroriIncontro>({});
  let errore = $state('');
  let salvando = $state(false);
  let attivitaEl = $state<HTMLTextAreaElement>();

  let destinatari = $state<Destinatario[]>([]);
  let foglio = $state<'copia' | 'elimina' | null>(null);
  let scelti = $state<string[]>([]);
  let avviso = $state('');
  let avvisoTimer: ReturnType<typeof setTimeout> | undefined;

  const haMisure = (f: FormIncontro) => !!(f.sf || f.peso || f.pressione || f.bcf);

  $effect(() => {
    (async () => {
      const inc = id ? await getIncontroContext(id) : null;
      const ctx = inc ?? (gid ? await getGravidanzaContext(gid) : null);
      if (!ctx) {
        nonTrovato = true;
        return;
      }
      mamma = ctx.mamma;
      grav = ctx.gravidanza;
      const f = inc ? formDaIncontro(inc.incontro) : formNuovo(ctx.gravidanza, today);
      if (inc) {
        salvatoId = inc.incontro.id;
        statoCaricato = inc.incontro.stato;
      }
      form = f;
      base = { ...f };
      misureAperte = f.tipo === 'controllo' || haMisure(f);
      destinatari = destinatariCopia(await getAllData(), ctx.mamma.id, today);
      if (inc && copiaDopoSalvataggio === inc.incontro.id) {
        copiaDopoSalvataggio = null;
        scelti = [];
        foglio = 'copia';
      }
    })();
  });

  $effect(() => {
    unsaved.dirty = base !== null && isDirty(form, base);
  });
  $effect(() => () => {
    unsaved.dirty = false;
    clearTimeout(avvisoTimer);
  });

  const nuovo = $derived(!salvatoId);
  const linea = $derived(grav ? lineaEpoca(grav, form.data) : null);
  const nome = $derived(mamma ? mamma.nome + (mamma.cognome ? ' ' + mamma.cognome : '') : '');
  const scheda = $derived(mamma ? `#/mamma/${encodeURIComponent(mamma.id)}` : '#/');
  const daRegistrare = $derived(statoCaricato === 'programmato' && form.data < today);

  function cambiaData(v: string) {
    form.data = v;
    if (nuovo && grav) {
      if (!toccatoStato) form.stato = statoDefault(v, today);
      if (!toccatoTipo) form.tipo = tipoDefault(grav, v);
    }
  }

  async function segnaFatto() {
    form.stato = 'fatto';
    toccatoStato = true;
    await tick();
    attivitaEl?.focus();
    attivitaEl?.scrollIntoView({ block: 'center' });
  }

  /** Validates and writes the record; the form stays open. */
  async function scrivi(): Promise<boolean> {
    if (!grav) return false;
    const r = aIncontroInput(form, grav.id);
    if (!r.ok) {
      errori = r.errori;
      errore = 'Controlla i campi in rosso.';
      return false;
    }
    errori = {};
    errore = '';
    salvando = true;
    try {
      const rec = await saveIncontro({ ...r.input, id: salvatoId });
      salvatoId = rec.id;
      statoCaricato = rec.stato;
      base = { ...form };
      unsaved.dirty = false;
      return true;
    } catch {
      errore = 'Salvataggio non riuscito. Riprova.';
      return false;
    } finally {
      salvando = false;
    }
  }

  async function salva(e: SubmitEvent) {
    e.preventDefault();
    if (salvando) return;
    if (await scrivi()) navigate(scheda, { replace: true });
  }

  async function apriCopia() {
    if (salvando) return;
    const eraNuovo = nuovo;
    if (eraNuovo || unsaved.dirty) {
      if (!(await scrivi())) return;
    }
    if (eraNuovo) {
      // Become the edit screen, so a reload or a second save cannot duplicate the record.
      copiaDopoSalvataggio = salvatoId!;
      navigate(`#/incontro/${encodeURIComponent(salvatoId!)}`, { replace: true });
      return;
    }
    scelti = [];
    foglio = 'copia';
  }

  async function copia() {
    if (!salvatoId || !scelti.length || salvando) return;
    salvando = true;
    try {
      const n = (await copiaIncontro(salvatoId, scelti)).length;
      foglio = null;
      mostra(n === 1 ? 'Copiato a 1 mamma' : `Copiato a ${n} mamme`);
    } catch {
      foglio = null;
      mostra('Copia non riuscita. Riprova.');
    } finally {
      salvando = false;
    }
  }

  function mostra(testo: string) {
    avviso = testo;
    clearTimeout(avvisoTimer);
    avvisoTimer = setTimeout(() => (avviso = ''), 4000);
  }

  async function elimina() {
    if (!salvatoId) return;
    await deleteIncontro(salvatoId);
    foglio = null;
    unsaved.dirty = false;
    base = null;
    navigate(scheda, { replace: true });
  }
</script>

<header>
  <a class="indietro" href={scheda} aria-label="Torna alla scheda">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </a>
  <div class="titolo">
    <h1>{id ? 'Incontro' : 'Nuovo incontro'}</h1>
    {#if nome}<p>{nome}</p>{/if}
  </div>
</header>

{#if nonTrovato}
  <p class="msg">Incontro non trovato. <a href="#/">Torna alle mamme</a></p>
{:else if grav}
  <form onsubmit={salva} novalidate>
    {#if statoCaricato === 'programmato' && form.stato === 'programmato'}
      <div class="programmato">
        <p class:alert={daRegistrare}>{daRegistrare ? 'Da registrare' : 'In programma'}</p>
        <button type="button" class="btn primario" onclick={segnaFatto}>Segna come fatto</button>
      </div>
    {/if}

    <div class="gruppo">
      <div class="coppia">
        <label class="campo">
          <span>Data</span>
          <input
            type="date"
            bind:value={() => form.data, cambiaData}
            required
            aria-invalid={errori.data ? 'true' : undefined}
            aria-describedby="epoca"
          />
        </label>
        <label class="campo">
          <span>Ora <small>facoltativa</small></span>
          <input type="time" bind:value={form.ora} />
        </label>
      </div>
      <p id="epoca" class="epoca num {linea?.tono ?? ''}">
        {#if errori.data}{errori.data}{:else}{linea?.testo ?? ''}{/if}
      </p>

      <fieldset class="segmenti">
        <legend>Stato</legend>
        <div class="opzioni">
          {#each [['fatto', 'Fatto'], ['programmato', 'Programmato']] as [v, l] (v)}
            <label>
              <input type="radio" name="stato" value={v} bind:group={form.stato} onchange={() => (toccatoStato = true)} />
              {l}
            </label>
          {/each}
        </div>
      </fieldset>

      <fieldset class="segmenti">
        <legend>Tipo</legend>
        <div class="opzioni griglia">
          {#each [['controllo', 'Controllo'], ['accompagnamento', 'Accompagnamento'], ['puerperio', 'Puerperio'], ['altro', 'Altro']] as [v, l] (v)}
            <label>
              <input
                type="radio"
                name="tipo"
                value={v}
                bind:group={form.tipo}
                onchange={() => {
                  toccatoTipo = true;
                  if (v === 'controllo') misureAperte = true;
                }}
              />
              {l}
            </label>
          {/each}
        </div>
      </fieldset>

      <label class="campo">
        <span>Argomento</span>
        <input bind:value={form.argomento} autocomplete="off" autocapitalize="sentences" />
      </label>

      <fieldset class="segmenti">
        <legend>Partner presente</legend>
        <div class="opzioni">
          {#each [['si', 'Sì'], ['no', 'No'], ['nd', 'Non indicato']] as [v, l] (v)}
            <label>
              <input type="radio" name="partner" value={v} bind:group={form.partner} />
              {l}
            </label>
          {/each}
        </div>
      </fieldset>

      <label class="campo">
        <span>Cosa ho fatto</span>
        <textarea bind:this={attivitaEl} bind:value={form.attivita} rows="4" autocapitalize="sentences"></textarea>
      </label>
    </div>

    <details class="misure" bind:open={misureAperte}>
      <summary>
        Misure
        <svg viewBox="0 0 12 12" aria-hidden="true"><path d="M3 4.5l3 3 3-3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" /></svg>
      </summary>
      <div class="coppia">
        <label class="campo">
          <span>SF <small>cm</small></span>
          <input
            bind:value={form.sf}
            inputmode="decimal"
            autocomplete="off"
            class="num"
            aria-invalid={errori.sf ? 'true' : undefined}
            aria-describedby={errori.sf ? 'err-sf' : undefined}
          />
          {#if errori.sf}<small id="err-sf" class="err">{errori.sf}</small>{/if}
        </label>
        <label class="campo">
          <span>Peso <small>kg</small></span>
          <input
            bind:value={form.peso}
            inputmode="decimal"
            autocomplete="off"
            class="num"
            aria-invalid={errori.peso ? 'true' : undefined}
            aria-describedby={errori.peso ? 'err-peso' : undefined}
          />
          {#if errori.peso}<small id="err-peso" class="err">{errori.peso}</small>{/if}
        </label>
        <label class="campo">
          <span>Pressione <small>mmHg</small></span>
          <input bind:value={form.pressione} autocomplete="off" class="num" placeholder="120/80" />
        </label>
        <label class="campo">
          <span>BCF <small>bpm</small></span>
          <input bind:value={form.bcf} inputmode="numeric" autocomplete="off" class="num" />
        </label>
      </div>
    </details>

    <div class="gruppo">
      <label class="campo note">
        <span>Note</span>
        <textarea bind:value={form.note} rows="3" autocapitalize="sentences"></textarea>
      </label>
    </div>

    {#if destinatari.length || salvatoId}
      <div class="altre">
        {#if destinatari.length}
          <button type="button" class="btn pieno" disabled={salvando} onclick={apriCopia}>
            {nuovo || unsaved.dirty ? 'Salva e copia ad altre mamme' : 'Copia ad altre mamme'}
          </button>
        {/if}
        {#if salvatoId}
          <button type="button" class="btn piano pieno rosso" onclick={() => (foglio = 'elimina')}>Elimina incontro</button>
        {/if}
      </div>
    {/if}

    <div class="barra">
      <p class="avviso" role="status" aria-live="polite">{avviso}</p>
      {#if errore}<p class="errore" role="alert">{errore}</p>{/if}
      <button type="submit" class="btn primario pieno" disabled={salvando}>
        {nuovo ? 'Salva incontro' : 'Salva'}
      </button>
    </div>
  </form>

  <Sheet open={foglio === 'copia'} titolo="Copia ad altre mamme" onclose={() => (foglio = null)}>
    <p class="nota">Copia data, ora, tipo, stato, argomento e cosa ho fatto. Misure, note e partner restano solo qui.</p>
    <ul class="scelta">
      {#each destinatari as d (d.gravidanzaId)}
        <li>
          <label>
            <input type="checkbox" value={d.gravidanzaId} bind:group={scelti} />
            {d.nome}
          </label>
        </li>
      {/each}
    </ul>
    <div class="azioni">
      <button type="button" class="btn primario pieno" disabled={!scelti.length || salvando} onclick={copia}>
        {scelti.length === 1 ? 'Copia a 1 mamma' : `Copia a ${scelti.length} mamme`}
      </button>
      <button type="button" class="btn piano pieno" onclick={() => (foglio = null)}>Annulla</button>
    </div>
  </Sheet>

  <ConfirmDialog
    open={foglio === 'elimina'}
    titolo="Eliminare questo incontro?"
    testo="L'incontro del {formatIT(base?.data ?? form.data)} sarà eliminato per sempre."
    conferma="Elimina"
    pericoloso
    onconferma={elimina}
    onannulla={() => (foglio = null)}
  />
{/if}

<style>
  header {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--giallo);
    padding: calc(12px + env(safe-area-inset-top)) 18px 12px 6px;
    border-bottom: 2px solid var(--ink);
  }
  .indietro {
    flex: none;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    color: var(--ink);
  }
  .indietro svg {
    width: 26px;
    height: 26px;
  }
  .titolo {
    min-width: 0;
  }
  h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
    font-stretch: 75%;
    font-variation-settings: 'wdth' 75;
  }
  .titolo p {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    overflow-wrap: anywhere;
  }
  form {
    padding-bottom: calc(var(--tabbar-h) + 110px);
  }
  .programmato {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 12px;
    padding: 12px 18px;
    border-bottom: 1px solid var(--filo);
  }
  .programmato p {
    margin: 0;
    font-size: 15px;
    font-weight: 700;
    color: var(--grigio);
  }
  .programmato p.alert {
    color: var(--rosso);
  }
  .gruppo {
    padding: 16px 18px 4px;
    border-bottom: 1px solid var(--filo);
  }
  .epoca {
    min-height: 22px;
    margin: -8px 0 16px;
    font-size: 17px;
    font-weight: 700;
  }
  .epoca.fuori {
    color: var(--rosso);
  }
  .epoca.manca {
    color: var(--grigio);
  }
  .misure {
    padding: 0 18px;
    border-bottom: 1px solid var(--filo);
  }
  .misure summary {
    display: flex;
    align-items: center;
    gap: 6px;
    min-height: 48px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--grigio);
    list-style: none;
    cursor: pointer;
  }
  .misure summary::-webkit-details-marker {
    display: none;
  }
  .misure summary svg {
    width: 12px;
    height: 12px;
    transition: transform 0.15s;
  }
  .misure[open] summary svg {
    transform: rotate(180deg);
  }
  .err {
    display: block;
    margin-top: 4px;
    font-size: 13px;
    font-weight: 700;
    color: var(--rosso);
  }
  .campo input[aria-invalid='true'] {
    border-color: var(--rosso);
  }
  .altre {
    display: flex;
    flex-direction: column;
    gap: 6px;
    padding: 16px 18px;
  }
  .rosso {
    color: var(--rosso);
  }
  .barra {
    position: fixed;
    z-index: 5;
    left: 0;
    right: 0;
    bottom: var(--tabbar-h);
    padding: 10px calc(18px + env(safe-area-inset-right)) 10px calc(18px + env(safe-area-inset-left));
    background: var(--carta);
    border-top: 1px solid var(--filo);
  }
  .avviso:empty {
    display: none;
  }
  .avviso {
    margin: 0 0 8px;
    font-size: 15px;
    font-weight: 700;
  }
  .errore {
    margin: 0 0 8px;
    color: var(--rosso);
    font-weight: 700;
    font-size: 14px;
  }
  .msg {
    margin: 0;
    padding: 20px 18px;
    color: var(--grigio);
  }
  .msg a {
    color: var(--ink);
    font-weight: 700;
  }
  .nota {
    margin: 0 0 12px;
    font-size: 14px;
    line-height: 1.4;
    color: var(--grigio);
  }
  .scelta {
    margin: 0 0 16px;
    padding: 0;
    list-style: none;
    border-top: 1px solid var(--filo);
  }
  .scelta li {
    border-bottom: 1px solid var(--filo);
  }
  .scelta label {
    display: flex;
    align-items: center;
    gap: 12px;
    min-height: 52px;
    font-size: 17px;
    font-weight: 700;
    cursor: pointer;
  }
  .scelta input {
    flex: none;
    width: 24px;
    height: 24px;
    margin: 0;
    accent-color: var(--ink);
  }
  .azioni {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
</style>
