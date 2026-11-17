<script lang="ts">
  import { STAZIONI_SETTIMANE, stationPosition } from '../lib/obstetrics';

  let { totaleGiorni }: { totaleGiorni: number | null } = $props();

  const TERMINE = 40;
  const fermate = STAZIONI_SETTIMANE.filter((w) => w < TERMINE);
</script>

{#if totaleGiorni !== null}
  <div
    class="linea"
    role="img"
    aria-label="Settimana {Math.floor(totaleGiorni / 7)} su {TERMINE}"
  >
    <i class="st" style:left="0%"></i>
    {#each fermate as w (w)}
      <i class="st" style:left="{(w / TERMINE) * 100}%"></i>
    {/each}
    <i class="st end" style:left="100%"></i>
    <i class="pos" style:left="{stationPosition(totaleGiorni) * 100}%"></i>
  </div>
{/if}

<style>
  .linea {
    position: relative;
    height: 14px;
  }
  .linea::before {
    content: '';
    position: absolute;
    left: 0;
    right: 0;
    top: 6px;
    height: 2px;
    background: var(--ink);
  }
  i {
    position: absolute;
    transform: translateX(-50%);
  }
  .st {
    top: 2px;
    width: 10px;
    height: 10px;
    border: 2px solid var(--ink);
    background: var(--carta);
    border-radius: 50%;
  }
  .st.end {
    background: var(--ink);
    border-radius: 2px;
  }
  .pos {
    top: 0;
    width: 14px;
    height: 14px;
    background: var(--oggi);
    border-radius: 50%;
    box-shadow: 0 0 0 3px var(--carta);
  }
</style>
