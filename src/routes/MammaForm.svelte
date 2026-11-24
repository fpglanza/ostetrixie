<script lang="ts">
  import CampiGravidanza from '../components/CampiGravidanza.svelte';
  import { todayISO } from '../lib/dates';
  import { isDirty } from '../lib/incontroForm';
  import { aGravidanzaInput, campiEta, erroriMamma, formMamma, type ErroriMamma, type FormMamma } from '../lib/mammaForm';
  import { navigate } from '../lib/router.svelte';
  import {
    createMamma,
    getMammaDetail,
    nuovaGravidanza,
    updateGravidanza,
    updateMamma,
  } from '../lib/repo';
  import { gravidanzeScheda, testo } from '../lib/schedaView';
  import type { Gravidanza } from '../lib/types';
  import { unsaved } from '../lib/unsaved.svelte';

  let { id }: { id?: string } = $props();

  const today = todayISO();
  let form = $state<FormMamma>(formMamma());
  /** The form as loaded; null until then (and after saving), so nothing counts as dirty. */
  let base = $state<FormMamma | null>(null);

  let corrente: Gravidanza | null = null;
  let etaCaricata = '';
  let caricata = $state(false);
  let nonTrovata = $state(false);
  let erroreCaricamento = $state(false);
  let salvando = $state(false);
  let errori = $state<ErroriMamma>({});
  let errore = $state('');

  $effect(() => {
    if (!id) {
      base = formMamma();
      caricata = true;
      return;
    }
    getMammaDetail(id).then(
      (d) => {
        if (!d) {
          nonTrovata = true;
          return;
        }
        corrente = gravidanzeScheda(d.gravidanze).corrente;
        form = formMamma(d.mamma, corrente, today);
        etaCaricata = form.eta;
        base = { ...form };
        caricata = true;
      },
      () => (erroreCaricamento = true),
    );
  });

  $effect(() => {
    unsaved.dirty = base !== null && isDirty(form, base);
  });
  $effect(() => () => {
    unsaved.dirty = false;
  });

  const indietro = $derived(id ? `#/mamma/${encodeURIComponent(id)}` : '#/');

  async function salva(e: SubmitEvent) {
    e.preventDefault();
    if (salvando) return;
    const err = erroriMamma(form);
    if (Object.keys(err).length) {
      errori = err;
      errore = err.nome && Object.keys(err).length === 1 ? err.nome : 'Controlla i campi in rosso.';
      return;
    }
    errori = {};
    salvando = true;
    errore = '';
    const m = {
      nome: form.nome.trim(),
      cognome: testo(form.cognome),
      telefono: testo(form.telefono),
      ...campiEta(form.eta, etaCaricata, today),
      anamnesi: testo(form.anamnesi),
      anamnesiOstetrica: testo(form.anamnesiOstetrica),
      note: testo(form.note),
    };
    const g = aGravidanzaInput(form);
    try {
      let mid = id;
      if (mid) {
        await updateMamma(mid, m);
        if (corrente) await updateGravidanza(corrente.id, g);
        else await nuovaGravidanza(mid, g);
      } else {
        mid = (await createMamma({ ...m, archiviata: false }, g)).mamma.id;
      }
      base = null;
      unsaved.dirty = false;
      navigate(`#/mamma/${encodeURIComponent(mid)}`, { replace: true });
    } catch {
      errore = 'Salvataggio non riuscito. Riprova.';
      salvando = false;
    }
  }
</script>

<header>
  <a class="indietro" href={indietro} aria-label={id ? 'Torna alla scheda' : 'Torna alle mamme'}>
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </a>
  <h1>{id ? 'Modifica mamma' : 'Nuova mamma'}</h1>
</header>

{#if nonTrovata}
  <p class="msg">Mamma non trovata. <a href="#/">Torna alle mamme</a></p>
{:else if erroreCaricamento}
  <p class="msg" role="alert">Impossibile leggere i dati su questo dispositivo.</p>
{:else if caricata}
  <form onsubmit={salva} novalidate>
    <h2 class="sez">Mamma</h2>
    <div class="gruppo">
      <label class="campo">
        <span>Nome <small>obbligatorio</small></span>
        <input
          bind:value={form.nome}
          required
          autocomplete="off"
          autocapitalize="words"
          aria-invalid={errori.nome ? 'true' : undefined}
        />
      </label>
      <label class="campo">
        <span>Cognome</span>
        <input bind:value={form.cognome} autocomplete="off" autocapitalize="words" />
      </label>
      <div class="coppia">
        <label class="campo">
          <span>Telefono</span>
          <input type="tel" bind:value={form.telefono} autocomplete="off" inputmode="tel" />
        </label>
        <label class="campo">
          <span>Età <small>anni</small></span>
          <input
            bind:value={form.eta}
            inputmode="numeric"
            autocomplete="off"
            class="num"
            aria-invalid={errori.eta ? 'true' : undefined}
            aria-describedby={errori.eta ? 'err-eta' : undefined}
          />
          {#if errori.eta}<small id="err-eta" class="err">{errori.eta}</small>{/if}
        </label>
      </div>
    </div>

    <h2 class="sez">Gravidanza</h2>
    <div class="gruppo">
      <CampiGravidanza bind:upm={form.upm} bind:upmEco={form.upmEco} {today} {errori} />
    </div>

    <h2 class="sez">Anamnesi</h2>
    <div class="gruppo">
      <label class="campo">
        <span>Anamnesi generale</span>
        <textarea bind:value={form.anamnesi} rows="4" autocapitalize="sentences"></textarea>
      </label>
      <label class="campo">
        <span>Anamnesi ostetrica <small>gravidanze e parti precedenti</small></span>
        <textarea bind:value={form.anamnesiOstetrica} rows="3" autocapitalize="sentences"></textarea>
      </label>
      <label class="campo">
        <span>Gravidanza attuale <small>ecografie, esami…</small></span>
        <textarea bind:value={form.gravidanzaAttuale} rows="4" autocapitalize="sentences"></textarea>
      </label>
      <label class="campo">
        <span>Partner</span>
        <textarea bind:value={form.partner} rows="2" autocapitalize="sentences"></textarea>
      </label>
    </div>

    <h2 class="sez">Note</h2>
    <div class="gruppo">
      <label class="campo">
        <span class="nascosto">Note</span>
        <textarea bind:value={form.note} rows="3"></textarea>
      </label>
    </div>

    <div class="barra">
      {#if errore}<p class="errore" role="alert">{errore}</p>{/if}
      <button type="submit" class="btn primario pieno" disabled={salvando}>
        {id ? 'Salva modifiche' : 'Salva mamma'}
      </button>
    </div>
  </form>
{/if}

<style>
  header {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--verde);
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
  h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
    font-stretch: 75%;
    font-variation-settings: 'wdth' 75;
  }
  form {
    padding-bottom: calc(var(--tabbar-h) + 100px);
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
  .gruppo {
    padding: 0 18px 4px;
    border-bottom: 1px solid var(--filo);
  }
  .barra {
    position: fixed;
    z-index: 5;
    left: 0;
    right: 0;
    max-width: var(--col);
    margin: 0 auto;
    bottom: var(--tabbar-h);
    padding: 10px calc(18px + env(safe-area-inset-right)) 10px calc(18px + env(safe-area-inset-left));
    background: var(--carta);
    border-top: 1px solid var(--filo);
  }
  .errore {
    margin: 0 0 8px;
    color: var(--rosso);
    font-weight: 700;
    font-size: 14px;
  }
  .nascosto {
    position: absolute;
    width: 1px;
    height: 1px;
    overflow: hidden;
    clip-path: inset(50%);
    white-space: nowrap;
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
</style>
