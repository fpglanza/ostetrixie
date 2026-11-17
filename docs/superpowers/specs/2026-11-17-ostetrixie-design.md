# Ostetrixie — documento di progetto

Data: 17/11/2026
Stato: bozza da approvare

## 1. Perché

Sofi è un'ostetrica libera professionista. Segue più gravide contemporaneamente (oggi due, es. Carmela e Pina) e oggi tiene le informazioni in modo sparso. Vuole un'app sul telefono dove:

- toccando il nome di una mamma vede **tutta la sua storia**: dati della gravidanza, anamnesi, tutti gli incontri fatti;
- per ogni mamma segna **ultima mestruazione, data presunta del parto, epoca gestazionale**;
- registra **ogni incontro/controllo**: argomento trattato, presenza del partner, distanza sinfisi-fondo, cosa ha fatto;
- ha una **visione d'insieme** (calendario) di tutte le gravidanze e clienti.

Successo = Sofi apre l'app durante o dopo un incontro, trova la mamma in due tocchi, registra l'incontro in meno di un minuto, e in qualsiasi momento sa a che settimana è ciascuna gravida e chi deve vedere nei prossimi giorni.

## 2. Obiettivi, non-obiettivi, anti-obiettivi

**Obiettivi**
- Elenco mamme → scheda mamma con storia completa e incontri.
- Calcolo automatico di DPP ed epoca gestazionale (EG), sempre aggiornata a oggi.
- Registrazione incontri (fatti e programmati).
- Calendario + panoramica di tutte le gravidanze in corso.
- Funziona interamente offline, installabile su iPhone e Android.
- Backup/ripristino tramite file JSON.

**Non-obiettivi (prima versione)**
- Sincronizzazione tra dispositivi, account, server con dati.
- Cifratura del file di backup (possibile in futuro).
- Fatturazione, promemoria via notifica, condivisione con le mamme.
- Più lingue: solo italiano.

**Anti-obiettivi** (renderebbero l'app un fallimento anche se "funziona")
- Dati sanitari che lasciano il telefono senza un'azione esplicita di Sofi (nessuna analytics, nessun CDN/font esterno, nessuna chiamata di rete a runtime).
- Calcoli di DPP/EG sbagliati, anche di un giorno (es. per fusi orari).
- Perdita di dati silenziosa (eliminazioni senza conferma, import che sovrascrive senza avviso).
- Inserimento di un incontro lento o macchinoso dal telefono.

## 3. Vincoli

- Utente unica, un solo dispositivo principale (il telefono di Sofi).
- Deve funzionare su iPhone (Safari, app aggiunta alla Home) e Android (Chrome).
- Dati sanitari (GDPR, categorie particolari): restano solo sul dispositivo.
- Su iPhone l'app installata ha un archivio separato da Safari; eliminare l'icona dalla Home cancella i dati → il backup è essenziale, non accessorio.
- Hosting statico gratuito (GitHub Pages); il server ospita solo codice, mai dati.

## 4. Approcci considerati

| Approccio | Pro | Contro |
|---|---|---|
| JavaScript semplice, senza build | Leggerissimo, nessuna dipendenza | Con form, calendario, backup il codice UI diventa disordinato |
| React + libreria di componenti | Ecosistema ampio | Più pesante del necessario per un'app a utente singolo |
| **Svelte + Vite + TypeScript** (scelto) | Codice compatto, form semplici, bundle piccolo, plugin PWA maturo | Richiede uno step di build |

Scelta: **Svelte 5 + Vite + TypeScript**, con **Dexie** (IndexedDB) per i dati e **vite-plugin-pwa** per service worker e manifest. Test con **Vitest**. È una scelta tecnica di Claude, accettata dall'utente. La forma "web app offline + backup JSON" è decisione dell'utente.

## 5. Modello dati

Tutte le date "di calendario" sono stringhe `YYYY-MM-DD` (nessun orario, nessun fuso) per evitare errori di un giorno. Gli id sono UUID.

**Mamma** (la persona, cliente)
- `id`, `createdAt`, `updatedAt`
- `nome` (obbligatorio), `cognome`, `telefono`, `dataNascita`
- `anamnesi` — testo libero lungo (anamnesi generale della persona)
- `archiviata` — sì/no
- `note` — testo libero

**Gravidanza** (una mamma può averne più di una nel tempo: cliente che torna)
- `id`, `mammaId`, `createdAt`, `updatedAt`
- `upm` — data ultima mestruazione (obbligatoria per i calcoli, ma si può creare anche senza)
- `dppEco` — DPP corretta da ecografia (facoltativa)
- `stato` — `in_corso` | `conclusa`
- `dataParto` — facoltativa, quando conclusa
- `anamnesiOstetrica` — testo libero specifico di questa gravidanza
- `note`

Nell'uso normale Sofi non vede la distinzione: creando una nuova mamma si crea anche la sua prima gravidanza, e la scheda mamma mostra la gravidanza in corso (o l'ultima). Le precedenti sono in una sezione "Gravidanze precedenti". *Scelta di Claude dopo la revisione: costa poco ora, evita una migrazione dei dati dopo.*

**Incontro**
- `id`, `gravidanzaId`, `createdAt`, `updatedAt`
- `data` (obbligatoria), `ora` (facoltativa, `HH:MM`)
- `stato` — `programmato` | `fatto`
- `tipo` — `controllo` | `accompagnamento` | `puerperio` | `altro`
- `argomento` — testo
- `partnerPresente` — sì / no / non indicato
- `attivita` — "cosa ho fatto", testo libero
- campi clinici facoltativi, mostrati in evidenza per `tipo = controllo` ma disponibili per tutti:
  `sinfisiFondoCm`, `pesoKg`, `pressione` (testo libero, es. "120/80"), `bcf` (battito cardiaco fetale, bpm)
- `note`

**Impostazioni** (record singolo)
- hash del PIN (+ salt), timeout di blocco, data ultimo backup.

## 6. Calcoli ostetrici

- **DPP da UPM** = UPM + 280 giorni (regola di Naegele, ciclo di 28 giorni).
- **DPP effettiva** = `dppEco` se presente, altrimenti DPP da UPM. In scheda si mostrano entrambe quando `dppEco` c'è, con l'etichetta "corretta da eco".
- **Data di riferimento** = DPP effettiva − 280 giorni.
- **EG a una data X** = giorni tra data di riferimento e X → `settimane+giorni` (es. `34+2`).
- L'EG di un incontro **non si salva**: si calcola dalla data dell'incontro. Se la DPP viene corretta, le EG degli incontri si aggiornano di conseguenza (comportamento voluto).
- Fuori range (EG < 0 o > 44 settimane): si mostra comunque il valore ma con avviso visivo, perché indica quasi sempre una data sbagliata.
- **Dopo il parto** (gravidanza con `dataParto`): al posto dell'EG si mostra il tempo dal parto, in giorni fino a 14 (es. `parto +5 gg`) e poi in settimane (es. `parto +6 sett`). Vale sia per "oggi" sia per gli incontri successivi alla data del parto; nessun avviso "fuori range" per questi. Il tipo `puerperio` è proposto di default per incontri dopo il parto. Le mamme nel post-parto restano nel calendario e in "prossimi 7 giorni". *Scelta di Claude dopo la revisione.*
- Funzioni pure in un modulo dedicato, coperte da test (casi: anni bisestili, cambio d'ora, fine anno, correzione eco).

## 7. Schermate

Mobile-first, pulsanti grandi, utilizzabile con una mano. Navigazione in basso con tre voci: **Mamme**, **Calendario**, **Impostazioni**.

**Mamme (home)**
```
[ cerca…                    ]
In gravidanza
  Carmela Rossi     34+2   DPP 03/01
  Pina Bianchi      14+5   DPP 25/05
Dopo il parto
  Anna Verdi        parto +3 sett
Archiviate (comprimibile)
                          [ + Nuova mamma ]
```
Ordinate per DPP più vicina. Ricerca per nome/cognome.

**Scheda mamma**
```
Carmela Rossi                     [modifica]
EG oggi 34+2 · DPP 03/01/2027 (UPM 28/03/2026)
Prossimo incontro: 20/11 controllo
▸ Anamnesi (testo, espandibile)
Incontri                    [ + Incontro ]
  20/11  programmato · controllo
  10/11  35+0 · controllo · SF 33 cm · partner ✓
  27/10  33+0 · accompagnamento · "allattamento"
```
Toccando un incontro si apre il dettaglio/modifica. Un incontro programmato si può segnare "fatto" con un tocco (apre il form per completarlo).

**Incontri di gruppo** (corsi di accompagnamento con più mamme): ogni incontro resta legato a una sola gravidanza, ma il form ha l'azione **"Copia ad altre mamme"**: scelte le mamme da un elenco, crea un incontro identico (data, tipo, argomento, cosa ho fatto) per ciascuna, con `partnerPresente` e misure lasciati vuoti da compilare per ognuna. *Scelta di Claude dopo la revisione: niente incontri multi-mamma nel modello dati in v1.*

**Form incontro**: data (default oggi), tipo, stato; poi argomento, partner, cosa ho fatto; sezione "misure" (SF, peso, pressione, BCF) aperta di default per i controlli. Mostra l'EG calcolata per la data scelta mentre si compila.

**Calendario**
- Vista mese: per ogni giorno, pallini per incontri (programmati e fatti) e un segno per le DPP. Toccando un giorno → elenco di quel giorno con link alle mamme.
- Sotto (o in una scheda accanto): **Panoramica gravidanze**, una barra per ogni mamma in gravidanza, da 0 a 40 settimane, con EG e DPP:
```
Carmela   ███████████████░░░  34+2  DPP 03/01
Pina      ██████░░░░░░░░░░░░  14+5  DPP 25/05
```
- Elenco "prossimi 7 giorni" in cima, per il colpo d'occhio.

**Impostazioni**: PIN (imposta/cambia/disattiva), timeout di blocco, Esporta backup, Importa backup, data ultimo backup, info versione.

## 8. Sicurezza

- **PIN** (4–6 cifre) richiesto all'apertura e al ritorno dall'app dopo il timeout (default 5 minuti). Salvato come hash PBKDF2 (WebCrypto) con salt, mai in chiaro.
- Il PIN è una barriera d'accesso, **non** cifra i dati in IndexedDB. Va detto chiaramente in Impostazioni.
- PIN dimenticato: unica via è "cancella tutti i dati" (con doppia conferma) e poi re-importare un backup.
- Nessuna richiesta di rete a runtime oltre al service worker che aggiorna il codice; nessun font/CDN esterno; nessuna analytics.
- `navigator.storage.persist()` richiesto al primo avvio per ridurre il rischio che il browser liberi lo spazio.

## 9. Backup

- **Esporta**: genera `ostetrixie-backup-AAAA-MM-GG.json` con `{ formato: "ostetrixie", versione: 1, esportatoIl, mamme: [...], gravidanze: [...], incontri: [...] }`. Su telefono usa la condivisione nativa (Web Share con file) se disponibile, altrimenti download. Aggiorna "data ultimo backup".
- Avviso al momento dell'export: il file contiene dati sanitari, conservarlo in un posto sicuro.
- **Importa**: legge il file, lo valida (formato, versione, campi obbligatori), mostra un riepilogo ("12 mamme, 87 incontri, esportato il …") e chiede conferma. L'import **sostituisce tutti i dati** attuali. Se ci sono dati nel telefono, prima di sostituire propone di esportarli.
- **Promemoria**: banner in home se l'ultimo backup ha più di 14 giorni (o non è mai stato fatto) e ci sono dati.
- Il campo `versione` permette migrazioni future del formato.

## 10. Installazione, aggiornamenti, hosting

- Build statica pubblicata su **GitHub Pages dell'account dello sviluppatore**, all'indirizzo definitivo `<utente>.github.io/ostetrixie/` (base path Vite `/ostetrixie/`). Repository pubblico: contiene solo codice. Gli aggiornamenti li pubblica lo sviluppatore (deploy tramite GitHub Actions). *Decisione dell'utente.*
- L'indirizzo **non deve cambiare** dopo la prima installazione reale: su iPhone i dati sono legati all'origine; un cambio richiederebbe export e re-import.
- Manifest PWA con nome, icone, `display: standalone`, colore tema.
- Service worker precache di tutto il bundle → funziona offline dal primo avvio installato.
- Nuova versione disponibile → banner "Aggiorna" (nessun ricaricamento a sorpresa durante la compilazione di un form).
- Pagina/riquadro d'aiuto con istruzioni "Aggiungi a schermata Home" per iPhone e Android.

## 11. Eliminazioni e integrità

- Eliminare un incontro: conferma.
- Eliminare una mamma: conferma esplicita che elimina anche tutte le sue gravidanze e incontri. Alternativa suggerita nello stesso dialogo: "archivia".
- Form con modifiche non salvate: avviso se si esce.

## 12. Test

- Vitest per: calcoli ostetrici (sez. 6), validazione e round-trip export→import, hash/verifica PIN.
- Test end-to-end nel browser: a discrezione del builder; minimo una verifica manuale su iPhone e Android reali (installazione, offline, export/import).

## 13. Aspetto grafico (scelto dall'utente)

Direzione **"Orario delle partenze"**: il caseload si legge come il manifesto giallo delle Partenze nelle stazioni italiane. Testata gialla (#F4CC1E), inchiostro nero su bianco, rosso solo per segnali (incontro scaduto/da registrare, EG fuori range), un blu riservato al segno "oggi". Archivo (auto-ospitato) con larghezza condensata per le cifre tabulari. Elenco mamme a colonne d'orario (EPOCA · MAMMA/PROSSIMO · ARRIVO = DPP); sotto ogni gravidanza una linea con fermate a 13, 27, 37, 40 settimane e il segno di oggi, riusata in scheda e nella panoramica del calendario. Bozza di riferimento: `.impeccable/mocks/decision/orario.html`; contratto di direzione in `.impeccable/surfaces/src-app-svelte.md`; contesto prodotto in `PRODUCT.md`.

## 14. Lasciato al builder

- Struttura delle cartelle, router (o navigazione a stati), CSS senza CDN.
- Implementazione del calendario (componente proprio consigliato, niente dipendenze pesanti).
- Dettagli del dialogo PIN e animazioni.
