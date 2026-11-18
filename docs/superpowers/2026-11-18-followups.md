# Ostetrixie — follow-up dopo la v1

## Da verificare su dispositivi reali (Sofi)
- iPhone (Safari, app aggiunta alla Home): installazione, uso offline, Esporta backup (Condividi → Salva su File, e annulla), Importa backup, selettori data/ora, schermata di copertura nell'app switcher.
- Android (Chrome): installazione, offline, esporta/importa.

## Domande di prodotto aperte
- Gravidanza conclusa senza parto (es. perdita): oggi l'unico modo è "Nuova gravidanza" o registrare un parto. Serve uno stato dedicato?
- Versione scura per l'uso serale.

## Pulizie tecniche rimandate (non bloccanti)
- Incontri "programmati" di gravidanze chiuse: il calendario e lo storico li segnano ancora in rosso/nei prossimi 7 giorni, l'elenco no. Uniformare.
- Helper duplicati: nome completo, aggiornamento di "oggi" al ritorno in primo piano, segnaBackupFatto vs aggiornaImpostazioni.
- deploy.yml: aggiungere `npm run check`; rimuovere jsdom e @testing-library/svelte se restano inutilizzati.
- Import: copiare solo i campi dello schema; controllare stato vs dataParto; formati di ora/createdAt/updatedAt/id.
- Freno ai tentativi PIN solo in memoria (si azzera chiudendo l'app); messaggio "30 secondi" fisso in Impostazioni; test della classe Lock.
- navGuard: dopo "avanti" la pila resta [F, C, F].
- Calendario: giorno selezionato non cambia a mezzanotte.
- Firefox: icona nativa del selettore data potrebbe comparire accanto a quella disegnata.

## Idee di design (dal revisore)
- Etichettare le fermate 13/27/37/40 sulla linea della scheda.
- Un momento di movimento "partenza" (il segno di oggi che si posiziona sulla linea).
- Ultima sinfisi-fondo nella riga dell'elenco, come nella bozza.
