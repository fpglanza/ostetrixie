<script lang="ts">
  import type { Snippet } from 'svelte';

  let { colonne, conN = false, children }: { colonne: string[]; conN?: boolean; children: Snippet } = $props();
</script>

<div class="cols griglia-orario" class:con-n={conN} aria-hidden="true">
  {#each colonne as c (c)}<span>{c}</span>{/each}
</div>
<ol>
  {@render children()}
</ol>

<style>
  .cols {
    padding: 7px 18px;
    border-top: 2px solid var(--ink);
    border-bottom: 1px solid var(--filo);
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
  }
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
  }
</style>
