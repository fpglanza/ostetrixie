<header>
  <a class="indietro" href="#/impostazioni" aria-label="Torna alle impostazioni">
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M15 5l-7 7 7 7" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" />
    </svg>
  </a>
  <h1>Aiuto</h1>
</header>

<main>
  <section aria-labelledby="aiuto-iphone">
    <h2 class="sez" id="aiuto-iphone">Installare su iPhone</h2>
    <ol>
      <li><b class="n num">1</b><span>Apri Ostetrixie in <b>Safari</b>, non in un'altra app.</span></li>
      <li>
        <b class="n num">2</b>
        <span>
          Tocca <b>Condividi</b>
          <svg class="icona" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true">
            <path d="M10 2.5v10M6.5 6 10 2.5 13.5 6M6 8.5H4.5v9h11v-9H14" stroke-linecap="round" stroke-linejoin="round" />
          </svg>
          (il quadrato con la freccia). Se non lo vedi, tocca prima <b>···</b> in basso.
        </span>
      </li>
      <li><b class="n num">3</b><span>Scorri e tocca <b>Aggiungi alla schermata Home</b>, poi <b>Aggiungi</b>.</span></li>
      <li><b class="n num">4</b><span>Da ora apri Ostetrixie dall'icona gialla sulla schermata Home.</span></li>
    </ol>
  </section>

  <section aria-labelledby="aiuto-android">
    <h2 class="sez" id="aiuto-android">Installare su Android</h2>
    <ol>
      <li><b class="n num">1</b><span>Apri Ostetrixie in <b>Chrome</b>.</span></li>
      <li>
        <b class="n num">2</b>
        <span>
          Tocca il menu
          <svg class="icona" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
            <circle cx="10" cy="4" r="1.8" /><circle cx="10" cy="10" r="1.8" /><circle cx="10" cy="16" r="1.8" />
          </svg>
          in alto a destra.
        </span>
      </li>
      <li><b class="n num">3</b><span>Tocca <b>Installa app</b> (o <b>Aggiungi a schermata Home</b>) e conferma.</span></li>
      <li><b class="n num">4</b><span>Da ora apri Ostetrixie dall'icona gialla tra le app.</span></li>
    </ol>
  </section>

  <section aria-labelledby="aiuto-dati">
    <h2 class="sez" id="aiuto-dati">I tuoi dati</h2>
    <div class="corpo">
      <p>
        I dati restano solo su questo telefono: non vengono mai inviati su internet o a un server.
        L'app funziona anche senza connessione.
      </p>
    </div>
  </section>

  <section aria-labelledby="aiuto-backup">
    <h2 class="sez" id="aiuto-backup">Perché il backup</h2>
    <div class="corpo">
      <p class="forte">
        Se elimini l'icona di Ostetrixie dall'iPhone, il telefono cancella anche tutti i dati dell'app.
      </p>
      <p>
        Lo stesso succede se il telefono si rompe, si perde o viene cambiato. Il backup è l'unica copia
        di sicurezza.
      </p>
      <ul>
        <li>Esporta un backup almeno ogni due settimane, da Impostazioni.</li>
        <li>Conservalo fuori dal telefono, per esempio sul computer.</li>
        <li>Il file contiene dati sanitari: tienilo privato, non inviarlo via chat o email.</li>
        <li>Su un telefono nuovo installa l'app e usa <b>Importa backup</b>.</li>
      </ul>
      <a class="btn primario pieno" href="#/impostazioni">Vai al backup</a>
    </div>
  </section>
</main>

<style>
  header {
    display: flex;
    align-items: center;
    gap: 4px;
    background: var(--giallo);
    padding: calc(12px + env(safe-area-inset-top)) 18px 12px 6px;
    border-bottom: 2px solid var(--ink);
  }
  .indietro {
    flex: none;
    display: grid;
    place-items: center;
    width: 44px;
    height: 44px;
    color: var(--ink);
  }
  .indietro svg {
    width: 26px;
    height: 26px;
  }
  h1 {
    margin: 0;
    font-size: 34px;
    font-weight: 800;
    line-height: 1.1;
    letter-spacing: -0.02em;
    font-stretch: 75%;
    font-variation-settings: 'wdth' 75;
  }
  main {
    padding-bottom: calc(var(--tabbar-h) + 24px);
  }
  section {
    border-bottom: 2px solid var(--ink);
  }
  .sez {
    margin: 0;
    padding: 18px 18px 8px;
    font-size: 12px;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--grigio);
  }
  ol {
    margin: 0;
    padding: 0;
    list-style: none;
    border-top: 2px solid var(--ink);
  }
  ol li {
    display: grid;
    grid-template-columns: 30px 1fr;
    gap: 8px;
    align-items: baseline;
    padding: 12px 18px;
    font-size: 16px;
    line-height: 1.4;
  }
  ol li + li {
    border-top: 1px solid var(--filo);
  }
  .n {
    font-size: 26px;
    font-weight: 800;
    line-height: 1;
  }
  .icona {
    display: inline-block;
    width: 20px;
    height: 20px;
    vertical-align: -4px;
  }
  .corpo {
    padding: 12px 18px 18px;
    border-top: 2px solid var(--ink);
  }
  .corpo p {
    margin: 0 0 12px;
    font-size: 16px;
    line-height: 1.45;
  }
  .corpo p.forte {
    font-weight: 700;
  }
  ul {
    margin: 0 0 20px;
    padding-left: 20px;
    font-size: 16px;
    line-height: 1.45;
  }
  ul li + li {
    margin-top: 6px;
  }
</style>
