<script lang="ts">
  import type { Snippet } from 'svelte';
  import { formatShort, weekdayIT, type ISODate } from '../lib/dates';

  let {
    href,
    data,
    ora,
    epoca,
    titolo,
    n,
    fuoriRange = false,
    alert = false,
    children,
  }: {
    href: string;
    data: ISODate;
    ora?: string;
    epoca: string | null;
    titolo: string;
    n?: number;
    fuoriRange?: boolean;
    alert?: boolean;
    children: Snippet;
  } = $props();
</script>

<li>
  <a class="riga griglia-orario" class:con-n={n !== undefined} class:alert {href}>
    {#if n !== undefined}<span class="n num">{n}</span>{/if}
    <span class="quando num">
      <b>{formatShort(data)}</b>
      <small>{weekdayIT(data, true)}{ora ? ' ' + ora : ''}</small>
    </span>
    <span class="epoca num" class:fuori={fuoriRange}>{epoca ?? '—'}</span>
    <span class="cosa">
      <b>{titolo}</b>
      <small>{@render children()}</small>
    </span>
  </a>
</li>

<style>
  .riga {
    padding: 11px 18px 10px;
    min-height: 56px;
    border-bottom: 1px solid var(--filo);
    align-items: start;
    color: inherit;
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
  }
  .riga:active {
    background: var(--premuto);
  }
  .riga:focus-visible {
    outline-offset: -2px;
  }
  .n {
    font-size: 15px;
    font-weight: 700;
    color: var(--grigio);
    line-height: 22px;
  }
  .quando b,
  .epoca {
    font-size: 20px;
    font-weight: 800;
    line-height: 22px;
  }
  .quando b {
    display: block;
  }
  .quando small,
  .cosa small {
    display: block;
    font-size: 12px;
    color: var(--grigio);
    margin-top: 2px;
  }
  .quando small {
    white-space: nowrap;
  }
  .epoca.fuori {
    color: var(--rosso);
  }
  .cosa {
    min-width: 0;
  }
  .cosa b {
    display: block;
    font-size: 16px;
    font-weight: 700;
    line-height: 22px;
  }
  .cosa small {
    font-size: 13px;
  }
  .alert .quando b,
  .alert .quando small,
  .alert .cosa small {
    color: var(--rosso);
  }
  .alert .cosa small {
    font-weight: 700;
  }
</style>
