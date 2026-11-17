<script lang="ts">
  import CampiGravidanza from '../components/CampiGravidanza.svelte';
  import { todayISO } from '../lib/dates';
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

  let { id }: { id?: string } = $props();

  const today = todayISO();
  let nome = $state('');
  let cognome = $state('');
  let telefono = $state('');
  let dataNascita = $state('');
  let anamnesi = $state('');
  let note = $state('');
  let upm = $state('');
  let dppEco = $state('');
  let anamnesiOstetrica = $state('');

  let corrente: Gravidanza | null = null;
  let caricata = $state(false);
  let nonTrovata = $state(false);
  let salvando = $state(false);
  let errore = $state('');

  $effect(() => {
    if (!id) {
      caricata = true;
      return;
    }
    getMammaDetail(id).then((d) => {
      if (!d) {
        nonTrovata = true;
        return;
      }
      const m = d.mamma;
      nome = m.nome;
      cognome = m.cognome ?? '';
      telefono = m.telefono ?? '';
      dataNascita = m.dataNascita ?? '';
      anamnesi = m.anamnesi ?? '';
      note = m.note ?? '';
      corrente = gravidanzeScheda(d.gravidanze).corrente;
      upm = corrente?.upm ?? '';
      dppEco = corrente?.dppEco ?? '';
      anamnesiOstetrica = corrente?.anamnesiOstetrica ?? '';
      caricata = true;
    });
  });

  const indietro = $derived(id ? `#/mamma/${encodeURIComponent(id)}` : '#/');

  async function salva(e: SubmitEvent) {
    e.preventDefault();
    if (!nome.trim()) {
      errore = 'Il nome è obbligatorio.';
      return;
    }
    salvando = true;
    errore = '';
    const m = {
      nome: nome.trim(),
      cognome: testo(cognome),
      telefono: testo(telefono),
      dataNascita: testo(dataNascita),
      anamnesi: testo(anamnesi),
      note: testo(note),
    };
    const g = { upm: testo(upm), dppEco: testo(dppEco), anamnesiOstetrica: testo(anamnesiOstetrica) };
    try {
      let mid = id;
      if (mid) {
        await updateMamma(mid, m);
        if (corrente) await updateGravidanza(corrente.id, g);
        else await nuovaGravidanza(mid, g);
      } else {
        mid = (await createMamma({ ...m, archiviata: false }, g)).mamma.id;
      }
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
{:else if caricata}
  <form onsubmit={salva} novalidate>
    <h2 class="sez">Mamma</h2>
    <div class="gruppo">
      <label class="campo">
        <span>Nome <small>obbligatorio</small></span>
        <input
          bind:value={nome}
          required
          autocomplete="off"
          autocapitalize="words"
          aria-invalid={errore && !nome.trim() ? 'true' : undefined}
        />
      </label>
      <label class="campo">
        <span>Cognome</span>
        <input bind:value={cognome} autocomplete="off" autocapitalize="words" />
      </label>
      <div class="coppia">
        <label class="campo">
          <span>Telefono</span>
          <input type="tel" bind:value={telefono} autocomplete="off" inputmode="tel" />
        </label>
        <label class="campo">
          <span>Data di nascita</span>
          <input type="date" bind:value={dataNascita} max={today} />
        </label>
      </div>
    </div>

    <h2 class="sez">Gravidanza</h2>
    <div class="gruppo">
      <CampiGravidanza bind:upm bind:dppEco bind:anamnesiOstetrica {today} />
    </div>

    <h2 class="sez">Anamnesi e note</h2>
    <div class="gruppo">
      <label class="campo">
        <span>Anamnesi <small>generale</small></span>
        <textarea bind:value={anamnesi} rows="4"></textarea>
      </label>
      <label class="campo">
        <span>Note</span>
        <textarea bind:value={note} rows="3"></textarea>
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
