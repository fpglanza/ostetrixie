<script lang="ts">
  import Sheet from './Sheet.svelte';

  let {
    open,
    titolo,
    testo,
    conferma,
    pericoloso = false,
    alternativa,
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
    onconferma: () => void;
    onalternativa?: () => void;
    onannulla: () => void;
  } = $props();
</script>

<Sheet {open} {titolo} onclose={onannulla}>
  <p>{testo}</p>
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
  .azioni {
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
</style>
