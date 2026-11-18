<script lang="ts">
  import { liveQuery } from 'dexie';
  import Orario from '../components/Orario.svelte';
  import RigaOrario from '../components/RigaOrario.svelte';
  import StationLine from '../components/StationLine.svelte';
  import { eventiPerGiorno, MESI, monthGrid, prossimi7, righePerIncontro, type Evento } from '../lib/calendar';
  import { formatShort, todayISO, weekdayIT, type ISODate } from '../lib/dates';
  import { buildRighe, ordinaRighe, type OverviewData } from '../lib/overview';
  import { getAllData } from '../lib/repo';

  let dati = $state<OverviewData | null>(null);
  let errore = $state(false);
  $effect(() => {
    const sub = liveQuery(() => getAllData()).subscribe({
      next: (d) => {
        dati = d;
        errore = false;
      },
      error: () => (errore = true),
    });
    return () => sub.unsubscribe();
  });

  let today = $state(todayISO());
  $effect(() => {
    const aggiorna = () => {
      if (document.visibilityState === 'visible') today = todayISO();
    };
    document.addEventListener('visibilitychange', aggiorna);
    return () => document.removeEventListener('visibilitychange', aggiorna);
  });

  const meseDi = (d: ISODate) => ({ anno: +d.slice(0, 4), mese: +d.slice(5, 7) });
  let vista = $state(meseDi(todayISO()));
  let scelto = $state<ISODate>(todayISO());

  function sposta(delta: number) {
    const k = vista.anno * 12 + (vista.mese - 1) + delta;
    vista = { anno: Math.floor(k / 12), mese: (k % 12) + 1 };
  }
  function tornaOggi() {
    vista = meseDi(today);
    scelto = today;
  }

  const meseCorrente = $derived(vista.anno === meseDi(today).anno && vista.mese === meseDi(today).mese);
  const settimane = $derived(monthGrid(vista.anno, vista.mese));
  const prefissoMese = $derived(`${vista.anno}-${String(vista.mese).padStart(2, '0')}`);
  const eventi = $derived(
    dati ? eventiPerGiorno(dati, settimane[0][0], settimane[5][6]) : ({} as Record<ISODate, Evento[]>),
  );
  const righe = $derived(dati ? righePerIncontro(dati, today) : new Map());
  const settimana = $derived(dati ? prossimi7(dati, today) : []);
  const delGiorno = $derived(
    dati ? (eventiPerGiorno(dati, scelto, scelto)[scelto] ?? []) : [],
  );
  const panoramica = $derived(
    dati ? ordinaRighe(buildRighe(dati, today)).filter((r) => r.sezione === 'in_gravidanza') : [],
  );

  const SETTIMANA = ['lun', 'mar', 'mer', 'gio', 'ven', 'sab', 'dom'];
  const etichettaMese = (anno: number, mese: number) => `${MESI[mese - 1]} ${anno}`;
  const dataLunga = (d: ISODate) =>
    `${weekdayIT(d)} ${+d.slice(8, 10)} ${MESI[+d.slice(5, 7) - 1]} ${d.slice(0, 4)}`;

  function etichettaGiorno(d: ISODate, lista: Evento[]): string {
    const parti = [dataLunga(d)];
    if (d === today) parti.push('oggi');
    const n = lista.length;
    parti.push(n === 0 ? 'nessun evento' : n === 1 ? '1 evento' : `${n} eventi`);
    if (lista.some((e) => e.tipo === 'dpp')) parti.push('DPP');
    if (lista.some((e) => e.incontro && righe.get(e.incontro.id)?.daRegistrare)) parti.push('da registrare');
    return parti.join(', ');
  }

  const scheda = (e: Evento) => `#/mamma/${encodeURIComponent(e.mammaId)}`;
</script>

{#snippet evento(e: Evento)}
  {#if e.incontro}
    {@const r = righe.get(e.incontro.id)}
    <RigaOrario
      href={scheda(e)}
      data={e.data}
      ora={e.incontro.ora}
      epoca={r?.epoca ?? null}
      fuoriRange={r?.fuoriRange}
      alert={r?.daRegistrare}
      titolo={e.nome}
    >
      {r?.tipo}
      · {r?.daRegistrare ? 'da registrare' : r?.programmato ? 'in programma' : 'fatto'}
    </RigaOrario>
  {:else}
    <RigaOrario href={scheda(e)} data={e.data} epoca="40+0" titolo={e.nome}>
      <span class="dpp"><i aria-hidden="true"></i>Data presunta del parto</span>
    </RigaOrario>
  {/if}
{/snippet}

{#snippet lista(evs: Evento[], vuoto: string)}
  {#if evs.length === 0}
    <p class="vuoto">{vuoto}</p>
  {:else}
    <Orario colonne={['Data', 'Epoca', 'Mamma · incontro']}>
      {#each evs as e (e.data + (e.incontro?.id ?? 'dpp' + e.mammaId))}
        {@render evento(e)}
      {/each}
    </Orario>
  {/if}
{/snippet}

<header>
  <h1>Calendario</h1>
  <div class="data">{weekdayIT(today)}<b class="num">{formatShort(today)}</b></div>
</header>

<main>
  {#if errore}
    <p class="vuoto">Impossibile leggere i dati su questo dispositivo.</p>
  {:else if dati}
    <h2 class="sez">Prossimi 7 giorni</h2>
    {@render lista(settimana, 'Nessun impegno nei prossimi 7 giorni.')}

    <section class="mese" aria-label="Mese">
      <div class="barra">
        <h2 aria-live="polite">{etichettaMese(vista.anno, vista.mese)}</h2>
        {#if !meseCorrente || scelto !== today}
          <button type="button" class="oggi-btn" onclick={tornaOggi}>Oggi</button>
        {/if}
        <button type="button" class="freccia" aria-label="Mese precedente" onclick={() => sposta(-1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
        <button type="button" class="freccia" aria-label="Mese successivo" onclick={() => sposta(1)}>
          <svg viewBox="0 0 24 24" aria-hidden="true">
            <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
        </button>
      </div>
      <div class="griglia" role="group" aria-label="Giorni di {etichettaMese(vista.anno, vista.mese)}">
        {#each SETTIMANA as g (g)}<span class="gs" aria-hidden="true">{g}</span>{/each}
        {#each settimane.flat() as d (d)}
          {@const evs = eventi[d] ?? []}
          {@const scaduto = (e: Evento) => (righe.get(e.incontro!.id)?.daRegistrare ? 0 : 1)}
          {@const incontri = evs.filter((e) => e.incontro).sort((a, b) => scaduto(a) - scaduto(b))}
          <button
            type="button"
            class="giorno"
            class:fuori={!d.startsWith(prefissoMese)}
            class:oggi={d === today}
            class:scelto={d === scelto}
            aria-pressed={d === scelto}
            aria-label={etichettaGiorno(d, evs)}
            onclick={() => (scelto = d)}
          >
            <span class="n num">{+d.slice(8, 10)}</span>
            <span class="segni" aria-hidden="true">
              {#each incontri.slice(0, 3) as e (e.incontro!.id)}
                <i class="pallino" class:rosso={righe.get(e.incontro!.id)?.daRegistrare}></i>
              {/each}
              {#if evs.some((e) => e.tipo === 'dpp')}<i class="quadro"></i>{/if}
            </span>
          </button>
        {/each}
      </div>
    </section>

    <h2 class="sez giorno-titolo">{dataLunga(scelto)}</h2>
    {@render lista(delGiorno, 'Nessun impegno in questo giorno.')}

    <h2 class="sez">Panoramica</h2>
    {#if panoramica.length === 0}
      <p class="vuoto">Nessuna gravidanza in corso.</p>
    {:else}
      <ul class="panoramica">
        {#each panoramica as r (r.mammaId)}
          <li>
            <a class="pr" href="#/mamma/{encodeURIComponent(r.mammaId)}">
              <span class="eg num">
                {#if r.upmMancante}
                  <span class="manca">UPM mancante</span>
                {:else}
                  <span class:fuori={r.fuoriRange}>{r.eg}</span>
                {/if}
              </span>
              <span class="nome">{r.nome}</span>
              <span class="dppv num">{#if r.dpp}<b>{formatShort(r.dpp)}</b> DPP{/if}</span>
              {#if r.egTotaleGiorni !== null}
                <span class="linea"><StationLine totaleGiorni={r.egTotaleGiorni} /></span>
              {/if}
            </a>
          </li>
        {/each}
      </ul>
    {/if}
  {/if}
</main>

<style>
  header {
    display: flex;
    justify-content: space-between;
    align-items: baseline;
    background: var(--giallo);
    padding: calc(18px + env(safe-area-inset-top)) 18px 14px;
    border-bottom: 2px solid var(--ink);
  }
  h1 {
    margin: 0;
    font-size: 40px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
    font-stretch: 75%;
    font-variation-settings: 'wdth' 75;
  }
  .data {
    font-size: 15px;
    font-weight: 600;
    text-align: right;
    line-height: 1.15;
  }
  .data b {
    display: block;
    font-size: 22px;
    font-weight: 800;
  }

  main {
    padding-bottom: calc(var(--tabbar-h) + 32px);
  }
  .sez {
    margin: 0;
    padding: 16px 18px 6px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--grigio);
  }
  .giorno-titolo {
    color: var(--ink);
  }
  .vuoto {
    margin: 0;
    padding: 4px 18px 14px;
    font-size: 15px;
    color: var(--grigio);
  }
  .dpp {
    display: inline-flex;
    align-items: center;
    gap: 6px;
  }
  .dpp i {
    width: 8px;
    height: 8px;
    background: var(--ink);
  }

  .mese {
    margin-top: 18px;
    border-top: 2px solid var(--ink);
  }
  .barra {
    display: flex;
    align-items: center;
    gap: 2px;
    padding: 4px 6px 4px 18px;
  }
  .barra h2 {
    flex: 1;
    margin: 0;
    font-size: 24px;
    font-weight: 800;
    letter-spacing: -0.01em;
    text-transform: capitalize;
    font-stretch: 75%;
    font-variation-settings: 'wdth' 75;
  }
  .freccia,
  .oggi-btn {
    display: grid;
    place-items: center;
    min-width: 44px;
    height: 44px;
    padding: 0;
    border: 0;
    border-radius: 8px;
    background: none;
    color: var(--ink);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .oggi-btn {
    padding: 0 12px;
    margin-right: 4px;
    border: 2px solid var(--ink);
    border-radius: 30px;
    height: 36px;
    font-size: 14px;
    font-weight: 700;
    position: relative;
  }
  /* 36px visual, 44px hit area */
  .oggi-btn::after {
    content: '';
    position: absolute;
    inset: -4px 0;
  }
  .freccia svg {
    width: 24px;
    height: 24px;
  }
  .freccia:active,
  .oggi-btn:active {
    background: var(--premuto);
  }

  .griglia {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    padding: 0 6px 8px;
    border-bottom: 1px solid var(--filo);
  }
  .gs {
    padding: 4px 0;
    text-align: center;
    font-size: 11px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--grigio);
  }
  .giorno {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 2px;
    min-height: 50px;
    padding: 3px 0 4px;
    border: 0;
    border-radius: 8px;
    background: none;
    color: var(--ink);
    cursor: pointer;
    -webkit-tap-highlight-color: transparent;
  }
  .giorno:active {
    background: var(--premuto);
  }
  .giorno:focus-visible {
    outline-offset: -2px;
  }
  .giorno .n {
    display: grid;
    place-items: center;
    width: 32px;
    height: 32px;
    border-radius: 50%;
    font-size: 18px;
    font-weight: 700;
  }
  .giorno.fuori .n {
    color: var(--grigio);
    font-weight: 500;
  }
  .giorno.oggi .n {
    box-shadow: inset 0 0 0 2px var(--oggi);
    color: var(--oggi);
    font-weight: 800;
  }
  .giorno.scelto .n {
    background: var(--ink);
    color: var(--carta);
  }
  .giorno.scelto.oggi .n {
    background: var(--oggi);
    box-shadow: none;
  }
  .segni {
    display: flex;
    align-items: center;
    gap: 3px;
    height: 7px;
  }
  .pallino {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: var(--ink);
  }
  .pallino.rosso {
    background: var(--rosso);
  }
  .quadro {
    width: 7px;
    height: 7px;
    background: var(--ink);
  }

  .panoramica {
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 2px solid var(--ink);
  }
  .pr {
    display: grid;
    grid-template-columns: 58px 1fr auto;
    gap: 4px 10px;
    align-items: baseline;
    padding: 10px 18px 10px;
    border-bottom: 1px solid var(--filo);
    color: inherit;
    text-decoration: none;
    -webkit-tap-highlight-color: transparent;
  }
  .pr:active {
    background: var(--premuto);
  }
  .pr:focus-visible {
    outline-offset: -2px;
  }
  .eg {
    font-size: 22px;
    font-weight: 800;
    line-height: 1;
  }
  .eg .fuori {
    color: var(--rosso);
  }
  .manca {
    display: block;
    font-size: 12px;
    font-weight: 700;
    line-height: 1.15;
    color: var(--grigio);
    font-stretch: 100%;
    font-variation-settings: 'wdth' 100;
  }
  .nome {
    min-width: 0;
    font-size: 16px;
    font-weight: 700;
  }
  .dppv {
    font-size: 12px;
    font-weight: 600;
    color: var(--grigio);
    text-align: right;
  }
  .dppv b {
    font-size: 18px;
    font-weight: 800;
    color: var(--ink);
  }
  .linea {
    grid-column: 1 / 4;
    margin-top: 4px;
  }
</style>
