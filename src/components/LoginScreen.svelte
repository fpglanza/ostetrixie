<script lang="ts">
  import { accesso } from '../lib/accesso.svelte';

  let username = $state('');
  let password = $state('');
  let errore = $state('');
  let verificando = $state(false);
  let campoPassword: HTMLInputElement;

  const disattivo = $derived(verificando || !username.trim() || !password);

  async function invia(e: SubmitEvent) {
    e.preventDefault();
    if (disattivo) return;
    verificando = true;
    errore = '';
    const ok = await accesso.entra(username, password);
    verificando = false;
    if (ok) return;
    errore = 'Nome utente o password errati';
    password = '';
    campoPassword.focus();
  }
</script>

<main class="accesso">
  <div class="testa">
    <h1>Ostetrixie</h1>
    <p>Accedi</p>
  </div>

  <form onsubmit={invia} novalidate>
    <label class="campo">
      <span>Nome utente</span>
      <input
        bind:value={username}
        oninput={() => (errore = '')}
        name="username"
        autocomplete="username"
        autocapitalize="none"
        autocorrect="off"
        spellcheck="false"
      />
    </label>
    <label class="campo">
      <span>Password</span>
      <input
        bind:this={campoPassword}
        bind:value={password}
        oninput={() => (errore = '')}
        type="password"
        name="password"
        autocomplete="current-password"
        aria-invalid={errore ? 'true' : undefined}
      />
    </label>

    <p class="stato" role="alert">{errore}</p>

    <button type="submit" class="btn primario pieno" disabled={disattivo}>
      {verificando ? 'Verifica…' : 'Entra'}
    </button>
  </form>
</main>

<style>
  .accesso {
    min-height: 100dvh;
    padding: calc(40px + env(safe-area-inset-top)) 24px calc(24px + env(safe-area-inset-bottom));
    background: var(--verde);
    color: var(--ink);
  }
  .testa {
    margin-bottom: 32px;
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
  form {
    max-width: var(--col);
  }
  .stato {
    min-height: 24px;
    margin: 0 0 16px;
    font-size: 17px;
    font-weight: 700;
  }
</style>
