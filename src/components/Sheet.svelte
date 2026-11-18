<script lang="ts">
  import type { Snippet } from 'svelte';
  import { lock } from '../lib/lock.svelte';
  import { dialogoMostrato } from '../lib/lockPolicy';

  let {
    open,
    titolo,
    onclose,
    children,
  }: { open: boolean; titolo: string; onclose: () => void; children: Snippet } = $props();

  let el: HTMLDialogElement;
  const uid = $props.id();

  // Inside the app content, the modal waits while the content is hidden by the lock/cover
  // and reopens on unlock with its state unchanged.
  $effect(() => {
    const mostra = dialogoMostrato(open, el.closest('[data-contenuto]') !== null, lock.visibile);
    if (mostra && !el.open) el.showModal();
    else if (!mostra && el.open) el.close();
  });
</script>

<!-- Bottom sheet on a native modal <dialog>: Esc and a tap on the backdrop close it. -->
<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_noninteractive_element_interactions -->
<dialog
  bind:this={el}
  aria-labelledby="{uid}-t"
  oncancel={(e) => {
    e.preventDefault();
    onclose();
  }}
  onclick={(e) => {
    if (e.target === el) onclose();
  }}
>
  <div class="corpo">
    <h2 id="{uid}-t">{titolo}</h2>
    {@render children()}
  </div>
</dialog>

<style>
  dialog {
    margin: auto auto 0;
    width: 100%;
    max-width: var(--col);
    max-height: 90dvh;
    padding: 0;
    border: 0;
    border-top: 2px solid var(--ink);
    background: var(--carta);
    color: var(--ink);
  }
  @media (min-width: 520px) {
    dialog {
      border-inline: 2px solid var(--ink);
    }
  }
  dialog::backdrop {
    background: rgba(20, 20, 20, 0.5);
  }
  .corpo {
    padding: 18px calc(18px + env(safe-area-inset-right)) calc(18px + env(safe-area-inset-bottom))
      calc(18px + env(safe-area-inset-left));
  }
  h2 {
    margin: 0 0 12px;
    font-size: 26px;
    font-weight: 800;
    line-height: 1.15;
    letter-spacing: -0.01em;
    font-stretch: 75%;
    font-variation-settings: 'wdth' 75;
  }
</style>
