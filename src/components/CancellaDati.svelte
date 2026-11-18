<script lang="ts">
  import ConfirmDialog from './ConfirmDialog.svelte';
  import Sheet from './Sheet.svelte';
  import { cancellaTuttiIDati } from '../lib/db';

  /** Two-step "Cancella tutti i dati": explanation, then typing CANCELLA. */
  let {
    passo = $bindable(0),
    oncancellato,
  }: { passo?: 0 | 1 | 2; oncancellato: () => void } = $props();

  const PAROLA = 'CANCELLA';
  let scritto = $state('');
  let errore = $state('');
  let inCorso = $state(false);
  const ok = $derived(scritto.trim().toUpperCase() === PAROLA);

  function chiudi() {
    passo = 0;
    scritto = '';
    errore = '';
  }

  async function cancella(e: SubmitEvent) {
    e.preventDefault();
    if (!ok || inCorso) return;
    inCorso = true;
    try {
      await cancellaTuttiIDati();
      chiudi();
      oncancellato();
    } catch {
      errore = 'Cancellazione non riuscita: i dati non sono stati modificati.';
    } finally {
      inCorso = false;
    }
  }
</script>

<ConfirmDialog
  open={passo === 1}
  titolo="Cancellare tutti i dati?"
  testo="Mamme, gravidanze, incontri e PIN verranno cancellati da questo telefono e non si possono recuperare. Dopo potrai reimportare un backup da Impostazioni."
  conferma="Continua"
  pericoloso
  onconferma={() => (passo = 2)}
  onannulla={chiudi}
/>

<Sheet open={passo === 2} titolo="Conferma la cancellazione" onclose={chiudi}>
  <form onsubmit={cancella}>
    <label class="campo">
      <span>Scrivi {PAROLA} per confermare</span>
      <input
        bind:value={scritto}
        autocomplete="off"
        autocapitalize="characters"
        autocorrect="off"
        spellcheck="false"
        enterkeyhint="done"
      />
    </label>
    <p class="errore" role="alert">{errore}</p>
    <div class="azioni">
      <button type="submit" class="btn pericolo pieno" disabled={!ok || inCorso}>Cancella tutti i dati</button>
      <button type="button" class="btn piano pieno" onclick={chiudi}>Annulla</button>
    </div>
  </form>
</Sheet>

<style>
  .azioni {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
  .errore {
    margin: 0;
    color: var(--rosso);
    font-size: 14px;
    font-weight: 700;
  }
  .errore:not(:empty) {
    margin-bottom: 12px;
  }
</style>
