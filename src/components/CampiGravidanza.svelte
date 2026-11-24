<script lang="ts">
  import { formatIT, type ISODate } from '../lib/dates';
  import type { ErroriGravidanza } from '../lib/mammaForm';
  import { anteprimaGravidanza } from '../lib/schedaView';

  let {
    upm = $bindable(''),
    upmEco = $bindable('no'),
    today,
    errori = {},
  }: {
    upm: string;
    upmEco: 'si' | 'no';
    today: ISODate;
    /** Field errors shown under the date after a rejected save. */
    errori?: ErroriGravidanza;
  } = $props();
  const uid = $props.id();

  const ante = $derived(anteprimaGravidanza({ upm }, today));
</script>

<div class="coppia">
  <label class="campo">
    <span>UPM <small>ultima mestruazione</small></span>
    <input
      type="date"
      bind:value={upm}
      class:da-compilare={!upm}
      aria-invalid={errori.upm ? 'true' : undefined}
      aria-describedby={errori.upm ? `${uid}-upm` : undefined}
    />
    {#if errori.upm}<small id="{uid}-upm" class="err">{errori.upm}</small>{/if}
  </label>
  <fieldset class="segmenti">
    <legend>Da eco</legend>
    <div class="opzioni">
      {#each [['si', 'Sì'], ['no', 'No']] as [v, l] (v)}
        <label>
          <input type="radio" name="{uid}-eco" value={v} bind:group={upmEco} />
          {l}
        </label>
      {/each}
    </div>
  </fieldset>
</div>

<div class="ante" aria-live="polite">
  {#if ante}
    <div>
      <b class="num">{formatIT(ante.dpp)}</b>
      <span>DPP{upmEco === 'si' ? ' da eco' : ''}</span>
    </div>
    <div class="destra">
      <b class="num" class:fuori={ante.fuoriRange}>{ante.eg}</b>
      <span>{ante.fuoriRange ? 'fuori range: controlla le date' : 'settimane oggi'}</span>
    </div>
  {:else}
    <span>Inserisci l'UPM per calcolare DPP ed epoca.</span>
  {/if}
</div>

<style>
  .ante {
    display: flex;
    justify-content: space-between;
    gap: 12px;
    margin: -4px 0 16px;
    padding: 8px 0;
    border-top: 1px solid var(--filo);
    border-bottom: 1px solid var(--filo);
    min-height: 56px;
    align-items: center;
  }
  .ante span {
    display: block;
    font-size: 12px;
    font-weight: 600;
    color: var(--grigio);
  }
  .ante b {
    display: block;
    font-size: 22px;
    font-weight: 800;
    line-height: 1.1;
  }
  .destra {
    text-align: right;
  }
  .fuori {
    color: var(--rosso);
  }
</style>
