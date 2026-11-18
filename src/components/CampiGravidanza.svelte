<script lang="ts">
  import { formatIT, type ISODate } from '../lib/dates';
  import type { ErroriGravidanza } from '../lib/mammaForm';
  import { anteprimaGravidanza } from '../lib/schedaView';

  let {
    upm = $bindable(''),
    dppEco = $bindable(''),
    anamnesiOstetrica = $bindable(''),
    today,
    errori = {},
  }: {
    upm: string;
    dppEco: string;
    anamnesiOstetrica: string;
    today: ISODate;
    /** Field errors shown under the dates after a rejected save. */
    errori?: ErroriGravidanza;
  } = $props();
  const uid = $props.id();

  const ante = $derived(anteprimaGravidanza({ upm, dppEco }, today));
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
  <label class="campo">
    <span>DPP da eco <small>se corretta</small></span>
    <input
      type="date"
      bind:value={dppEco}
      class:da-compilare={!dppEco}
      aria-invalid={errori.dppEco ? 'true' : undefined}
      aria-describedby={errori.dppEco ? `${uid}-eco` : undefined}
    />
    {#if errori.dppEco}<small id="{uid}-eco" class="err">{errori.dppEco}</small>{/if}
  </label>
</div>

<div class="ante" aria-live="polite">
  {#if ante}
    <div>
      <b class="num">{formatIT(ante.dpp)}</b>
      <span>DPP{dppEco && ante.dppDaUpm ? ` · da UPM ${formatIT(ante.dppDaUpm)}` : dppEco ? ' da eco' : ''}</span>
    </div>
    <div class="destra">
      <b class="num" class:fuori={ante.fuoriRange}>{ante.eg}</b>
      <span>{ante.fuoriRange ? 'fuori range: controlla le date' : 'settimane oggi'}</span>
    </div>
  {:else}
    <span>Inserisci l'UPM per calcolare DPP ed epoca.</span>
  {/if}
</div>

<label class="campo">
  <span>Anamnesi ostetrica <small>di questa gravidanza</small></span>
  <textarea bind:value={anamnesiOstetrica} rows="3"></textarea>
</label>

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
