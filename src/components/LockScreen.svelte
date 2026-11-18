<script lang="ts">
  import CancellaDati from './CancellaDati.svelte';
  import { lock } from '../lib/lock.svelte';
  import { navigate } from '../lib/router.svelte';
  import { rispondiUscita, unsaved, uscita } from '../lib/unsaved.svelte';

  const MAX = 6;
  const MIN = 4;

  let pin = $state('');
  let messaggio = $state('');
  let scuoti = $state(false);
  let verificando = $state(false);
  let passoReset = $state<0 | 1 | 2>(0);

  // Ticks once a second while the 30 s brake is on, to show the countdown.
  let adesso = $state(Date.now());
  const secondi = $derived(Math.max(0, Math.ceil((lock.attesaFino - adesso) / 1000)));
  const fermo = $derived(secondi > 0);
  $effect(() => {
    if (lock.attesaFino <= Date.now()) return;
    adesso = Date.now();
    const t = setInterval(() => {
      adesso = Date.now();
      if (adesso >= lock.attesaFino) clearInterval(t);
    }, 250);
    return () => clearInterval(t);
  });

  const disattivo = $derived(verificando || fermo);
  const slot = $derived(Math.max(MIN, pin.length));

  function digita(c: string) {
    if (disattivo || pin.length >= MAX) return;
    messaggio = '';
    pin += c;
  }

  function indietro() {
    if (disattivo) return;
    pin = pin.slice(0, -1);
  }

  async function invia() {
    if (disattivo || pin.length < MIN) return;
    verificando = true;
    const esito = await lock.verifica(pin);
    verificando = false;
    pin = '';
    if (esito === 'ok') {
      lock.unlock();
      return;
    }
    if (esito === 'errato') {
      messaggio = 'PIN errato';
      scuoti = true;
    }
  }

  function tasto(e: KeyboardEvent) {
    if (passoReset !== 0 || e.metaKey || e.ctrlKey || e.altKey) return;
    if (/^\d$/.test(e.key)) digita(e.key);
    else if (e.key === 'Backspace') indietro();
    else if (e.key === 'Enter') invia();
    else return;
    e.preventDefault();
  }

  function cancellato() {
    // The data are gone: drop whatever the hidden screen was holding, then go to the empty list.
    if (uscita.chiede) rispondiUscita(false);
    unsaved.dirty = false;
    lock.unlock();
    navigate('#/', { replace: true });
  }
</script>

<svelte:window onkeydown={tasto} />

<main class="blocco">
  <div class="testa">
    <h1>Ostetrixie</h1>
    <p>Inserisci il PIN</p>
  </div>

  <div
    class="punti"
    class:scuoti
    role="img"
    aria-label={`${pin.length} ${pin.length === 1 ? 'cifra inserita' : 'cifre inserite'}`}
    onanimationend={() => (scuoti = false)}
  >
    {#each { length: slot }, i (i)}
      <span class:pieno={i < pin.length}></span>
    {/each}
  </div>

  <p class="stato" role="status" aria-live="polite">
    {#if fermo}
      Troppi tentativi. Riprova tra <b class="num">{secondi}</b> s
    {:else}
      {messaggio}
    {/if}
  </p>

  <div class="tastiera">
    {#each ['1', '2', '3', '4', '5', '6', '7', '8', '9'] as c (c)}
      <button type="button" class="tasto num" disabled={disattivo} onclick={() => digita(c)}>{c}</button>
    {/each}
    <button type="button" class="tasto icona" aria-label="Cancella l'ultima cifra" disabled={disattivo || !pin} onclick={indietro}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" aria-hidden="true">
        <path d="M9 5h11v14H9l-6-7z" stroke-linejoin="round" /><path d="M12.5 9.5l5 5M17.5 9.5l-5 5" stroke-linecap="round" />
      </svg>
    </button>
    <button type="button" class="tasto num" disabled={disattivo} onclick={() => digita('0')}>0</button>
    <button type="button" class="tasto icona ok" aria-label="Sblocca" disabled={disattivo || pin.length < MIN} onclick={invia}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" aria-hidden="true">
        <path d="M5 12.5l4.5 4.5L19 7.5" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>
  </div>

  <button type="button" class="dimenticato" onclick={() => (passoReset = 1)}>PIN dimenticato?</button>
</main>

<CancellaDati bind:passo={passoReset} oncancellato={cancellato} />

<style>
  .blocco {
    min-height: 100dvh;
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: calc(40px + env(safe-area-inset-top)) 24px calc(16px + env(safe-area-inset-bottom));
    background: var(--giallo);
    color: var(--ink);
  }
  .testa {
    align-self: stretch;
    padding-bottom: 14px;
    border-bottom: 2px solid var(--ink);
  }
  h1 {
    margin: 0;
    font-size: 48px;
    font-weight: 800;
    line-height: 1.05;
    letter-spacing: -0.02em;
    font-stretch: 75%;
    font-variation-settings: 'wdth' 75;
  }
  .testa p {
    margin: 4px 0 0;
    font-size: 17px;
    font-weight: 700;
  }
  .punti {
    display: flex;
    gap: 16px;
    margin-top: 36px;
    height: 18px;
  }
  .punti span {
    width: 16px;
    height: 16px;
    border: 2px solid var(--ink);
    border-radius: 50%;
  }
  .punti span.pieno {
    background: var(--ink);
  }
  .punti.scuoti {
    animation: scuoti 0.4s ease-in-out;
  }
  @keyframes scuoti {
    0%,
    100% {
      transform: translateX(0);
    }
    20%,
    60% {
      transform: translateX(-10px);
    }
    40%,
    80% {
      transform: translateX(10px);
    }
  }
  @media (prefers-reduced-motion: reduce) {
    .punti.scuoti {
      animation: none;
    }
  }
  .stato {
    min-height: 24px;
    margin: 14px 0 18px;
    font-size: 17px;
    font-weight: 700;
    text-align: center;
  }
  .tastiera {
    display: grid;
    grid-template-columns: repeat(3, 72px);
    gap: 14px 28px;
    margin-top: auto;
  }
  .tasto {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 72px;
    height: 72px;
    padding: 0;
    border: 2px solid var(--ink);
    border-radius: 50%;
    background: var(--carta);
    color: var(--ink);
    font-size: 32px;
    font-weight: 700;
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
    touch-action: manipulation;
  }
  .tasto:active:not(:disabled) {
    background: var(--ink);
    color: var(--giallo);
  }
  .tasto:disabled {
    opacity: 0.45;
    cursor: default;
  }
  .tasto.icona {
    border-color: transparent;
    background: none;
  }
  .tasto.ok {
    border-color: var(--ink);
    background: var(--ink);
    color: var(--giallo);
  }
  .tasto svg {
    width: 30px;
    height: 30px;
  }
  .dimenticato {
    min-height: 44px;
    margin-top: 18px;
    padding: 0 12px;
    border: 0;
    background: none;
    font-size: 16px;
    font-weight: 700;
    text-decoration: underline;
    text-underline-offset: 3px;
    cursor: pointer;
  }
</style>
