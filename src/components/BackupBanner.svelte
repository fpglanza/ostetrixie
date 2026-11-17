<script lang="ts">
  import type { ISODate } from '../lib/dates';
  import { descriviUltimoBackup } from '../lib/backup';

  let { ultimoBackup, today }: { ultimoBackup: string | undefined; today: ISODate } = $props();
</script>

<a class="banner" href="#/impostazioni">
  <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">
    <path d="M10 3v9M6 8.5l4 4 4-4M3.5 14.5v2h13v-2" stroke-linecap="round" stroke-linejoin="round" />
  </svg>
  <span class="testo">Ultimo backup: <b>{descriviUltimoBackup(ultimoBackup, today)}</b></span>
  <span class="vai">Fai il backup</span>
</a>

<style>
  .banner {
    display: flex;
    align-items: center;
    gap: 8px;
    min-height: 44px;
    margin-top: 10px;
    border-top: 1px solid var(--ink);
    color: var(--ink);
    font-size: 14px;
    font-weight: 600;
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
  }
  .banner:focus-visible {
    outline-offset: -2px;
  }
  svg {
    flex: none;
    width: 18px;
    height: 18px;
  }
  .testo {
    flex: 1;
    min-width: 0;
  }
  .vai {
    flex: none;
    font-weight: 800;
    text-decoration: underline;
    text-underline-offset: 3px;
  }
</style>
