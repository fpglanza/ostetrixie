<script lang="ts">
  import Sheet from './Sheet.svelte';

  let {
    open,
    titolo,
    testo,
    conferma,
    pericoloso = false,
    alternativa,
    errore = '',
    onconferma,
    onalternativa,
    onannulla,
  }: {
    open: boolean;
    titolo: string;
    testo: string;
    conferma: string;
    pericoloso?: boolean;
    /** Optional safer alternative shown between confirm and cancel (e.g. "Archivia"). */
    alternativa?: string;
    /** Shown in red when the action failed; the dialog stays open. */
    errore?: string;
    onconferma: () => void;
    onalternativa?: () => void;
    onannulla: () => void;
  } = $props();
</script>

<Sheet {open} {titolo} onclose={onannulla}>
  <p>{testo}</p>
  {#if errore}<p class="errore" role="alert">{errore}</p>{/if}
  <div class="azioni">
    <button type="button" class="btn pieno" class:pericolo={pericoloso} class:primario={!pericoloso} onclick={onconferma}>
      {conferma}
    </button>
    {#if alternativa && onalternativa}
      <button type="button" class="btn pieno" onclick={onalternativa}>{alternativa}</button>
    {/if}
    <button type="button" class="btn piano pieno" onclick={onannulla}>Annulla</button>
  </div>
</Sheet>

<style>
  p {
    margin: 0 0 20px;
    font-size: 16px;
    line-height: 1.45;
  }
  .errore {
    margin-top: -8px;
    font-size: 14px;
    font-weight: 700;
    color: var(--rosso);
  }
  .azioni {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
</style>
