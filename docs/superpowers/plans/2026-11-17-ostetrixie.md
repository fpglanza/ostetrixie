# Ostetrixie Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** An offline, installable PWA where a midwife records her clients (mamme), their pregnancies and every meeting, with automatic DPP/EG, a calendar overview, JSON backup and a PIN lock.

**Architecture:** Svelte 5 single-page app with hash routing. All data in IndexedDB through Dexie; pure TypeScript modules (dates, obstetrics, overview, calendar, backup, pin) hold every rule and are unit-tested; Svelte components only render and call them. vite-plugin-pwa precaches the bundle; GitHub Pages serves it at `/ostetrixie/`.

**Tech Stack:** Svelte 5, Vite, TypeScript, Dexie 4, vite-plugin-pwa, Vitest, fake-indexeddb, @testing-library/svelte (only where noted), @fontsource-variable/archivo.

**Spec:** `docs/superpowers/specs/2026-11-17-ostetrixie-design.md`. Also read `PRODUCT.md` and the visual contract `.impeccable/surfaces/src-app-svelte.md`; the composition reference is `.impeccable/mocks/decision/orario.html`.

## Global Constraints

- UI language: Italian only. Displayed dates `dd/mm/yyyy` (list rows may use `dd.mm` as in the mock).
- Every calendar date is stored and computed as a `YYYY-MM-DD` string; never construct a `Date` from it except inside `src/lib/dates.ts`, which works in UTC.
- No network requests at runtime: no CDN, no Google Fonts, no analytics. Fonts are bundled via npm.
- IDs: `crypto.randomUUID()`. Every record has `createdAt`/`updatedAt` ISO timestamps.
- DPP = UPM + 280 days. EG out of range = < 0 days or > 44 weeks (308 days).
- Backup format: `{ formato: "ostetrixie", versione: 1, esportatoIl, mamme, gravidanze, incontri }`; filename `ostetrixie-backup-AAAA-MM-GG.json`.
- Backup reminder after 14 days (or never) when data exists. Lock timeout default 5 minutes. PIN 4–6 digits, PBKDF2 hash + salt.
- Vite `base: '/ostetrixie/'`. The origin must not change after first real install.
- Visual tokens (from the direction contract): yellow `#F4CC1E` (header, active tab only), ink `#141414`, white `#FFFFFF`, red `#D2271F` (signals only), today-blue `#1E5BD8` (today marker only), grey `#5C5C5C`, hairline `#E3E0D6`. Archivo variable with `wdth` ~70 for tabular figures. 2px ink rules, 1px hairlines, no cards, no colored side borders. Touch targets ≥ 44px. Text contrast ≥ 4.5:1.
- Every destructive action (delete incontro, delete mamma, import, reset) asks for confirmation.

## Review Focus

1. **Device timezone / DST.** EG and DPP must not shift by a day across the late-October DST change or when the phone is not on Europe/Rome; `todayISO()` uses the local calendar date, all arithmetic is UTC. Test pinned in Task 2.
2. **Bad import file.** A JSON that is not ours, has `versione` > 1, or misses required fields is rejected with an Italian message and the current data stay untouched; a failure mid-restore rolls back. Tests pinned in Task 9.
3. **Mamma without UPM.** The list, scheda, calendar and station line render "UPM mancante" without crashing and sort that mamma last. Tests pinned in Tasks 4 and 2.
4. **Leaving a half-filled form** (back, tab switch, app update banner): the user is warned; the update banner never reloads on its own. Covered by Task 7 step and Task 11 step.
5. **Overdue planned meeting.** A `programmato` incontro whose date is before today shows red "da registrare" in list and scheda until it is marked `fatto` or rescheduled. Test pinned in Task 4.

---

## File Structure

```
index.html
vite.config.ts                 PWA plugin, base path, vitest config
src/main.ts                    mount App, import tokens.css + font
src/styles/tokens.css          CSS custom properties, base type, selection/focus/scrollbar theming
src/lib/types.ts               Mamma, Gravidanza, Incontro, Impostazioni types
src/lib/dates.ts               date-only helpers (UTC)
src/lib/obstetrics.ts          DPP, EG, postpartum, station positions
src/lib/db.ts                  Dexie database
src/lib/repo.ts                all reads/writes
src/lib/overview.ts            list rows, next meeting, overdue, sorting, backup reminder
src/lib/calendar.ts            month grid, events per day, next-7-days
src/lib/backup.ts              build / validate / restore
src/lib/pin.ts                 hash + verify
src/lib/router.svelte.ts       hash router (rune state)
src/lib/lock.svelte.ts         lock state + inactivity timeout
src/App.svelte                 shell: lock gate, banners, route outlet, tab bar
src/components/TabBar.svelte
src/components/StationLine.svelte
src/components/ConfirmDialog.svelte
src/components/BackupBanner.svelte
src/components/UpdateBanner.svelte
src/components/LockScreen.svelte
src/routes/Mamme.svelte
src/routes/Scheda.svelte
src/routes/MammaForm.svelte
src/routes/IncontroForm.svelte
src/routes/Calendario.svelte
src/routes/Impostazioni.svelte
src/routes/Aiuto.svelte
tests/*.test.ts                one file per lib module
.github/workflows/deploy.yml
public/icons/                  PWA icons (192, 512, maskable, apple-touch)
```

Routes (hash): `#/` Mamme · `#/mamma/nuova` · `#/mamma/:id` · `#/mamma/:id/modifica` · `#/gravidanza/:gid/incontro/nuovo` · `#/incontro/:id` · `#/calendario` · `#/impostazioni` · `#/aiuto`.

---

### Task 1: Project scaffold, tokens, test harness

**Files:**
- Create: `package.json`, `vite.config.ts`, `tsconfig.json`, `index.html`, `src/main.ts`, `src/App.svelte` (placeholder), `src/styles/tokens.css`, `tests/smoke.test.ts`, `.gitignore`

**Interfaces:**
- Produces: `npm run dev`, `npm run build`, `npm test` (vitest run), `npm run check` (svelte-check). CSS variables `--giallo --ink --carta --rosso --oggi --grigio --filo`, class `.num` (tabular, `wdth` 70).

- [ ] **Step 1:** `git init`; scaffold with `npm create vite@latest . -- --template svelte-ts`; add deps `dexie`, `@fontsource-variable/archivo`; dev deps `vite-plugin-pwa`, `vitest`, `fake-indexeddb`, `@testing-library/svelte`, `jsdom`. Keep `.impeccable/config.local.json` out of git (add to `.gitignore`).
- [ ] **Step 2:** `vite.config.ts`: `base: '/ostetrixie/'`; `VitePWA({ registerType: 'prompt', manifest: { name: 'Ostetrixie', short_name: 'Ostetrixie', lang: 'it', display: 'standalone', start_url: '/ostetrixie/', theme_color: '#F4CC1E', background_color: '#FFFFFF', icons: [...] }, workbox: { globPatterns: ['**/*.{js,css,html,woff2,png,svg}'] } })`; `test: { environment: 'node', setupFiles: [] }`.
- [ ] **Step 3:** `tokens.css` with the Global Constraints tokens, `body` background white, `::selection` yellow on ink, `:focus-visible` 2px ink outline offset 2px, `button`/inputs inherit font. Import Archivo: check the package exposes the `wdth` axis (`@fontsource-variable/archivo/wdth.css`); if it does not, use the `full.css` entry. Write down which one in the commit message.
- [ ] **Step 4:** `tests/smoke.test.ts`: `expect(1 + 1).toBe(2)`. Run `npm test` → PASS. Run `npm run build` → builds `dist/` with `manifest.webmanifest` and `sw.js`.
- [ ] **Step 5:** Commit `chore: scaffold svelte+vite pwa with tokens and test harness`.

### Task 2: Dates and obstetric calculations

**Files:**
- Create: `src/lib/dates.ts`, `src/lib/obstetrics.ts`, `src/lib/types.ts` (types only, used here and later)
- Test: `tests/dates.test.ts`, `tests/obstetrics.test.ts`

**Interfaces:**
- Produces (`dates.ts`): `type ISODate = string`; `todayISO(now?: Date): ISODate` (local calendar date); `addDays(d: ISODate, n: number): ISODate`; `diffDays(from: ISODate, to: ISODate): number`; `formatIT(d: ISODate): string` → `dd/mm/yyyy`; `formatShort(d: ISODate): string` → `dd.mm`; `isValidISODate(s: string): boolean`.
- Produces (`obstetrics.ts`): `dppFromUpm(upm: ISODate): ISODate`; `dppEffettiva(g: Pick<Gravidanza,'upm'|'dppEco'>): ISODate | null`; `egAt(g, date: ISODate): { settimane: number; giorni: number; totaleGiorni: number; fuoriRange: boolean } | null`; `formatEG(eg): string` → `"34+2"`; `postPartumAt(dataParto: ISODate, date: ISODate): string | null` → `"parto +5 gg"` / `"parto +6 sett"`, null if date < dataParto; `stationPosition(totaleGiorni: number): number` → 0..1 fraction of 280 days, clamped; `STAZIONI_SETTIMANE = [13, 27, 37, 40]`.
- Produces (`types.ts`): `Mamma { id, nome, cognome?, telefono?, dataNascita?, anamnesi?, archiviata: boolean, note?, createdAt, updatedAt }`; `Gravidanza { id, mammaId, upm?, dppEco?, stato: 'in_corso'|'conclusa', dataParto?, anamnesiOstetrica?, note?, createdAt, updatedAt }`; `Incontro { id, gravidanzaId, data, ora?, stato: 'programmato'|'fatto', tipo: 'controllo'|'accompagnamento'|'puerperio'|'altro', argomento?, partnerPresente: 'si'|'no'|'nd', attivita?, sinfisiFondoCm?, pesoKg?, pressione?, bcf?, note?, createdAt, updatedAt }`; `Impostazioni { id: 'main', pinHash?, pinSalt?, timeoutMinuti: number, ultimoBackup?: string }`.

- [ ] **Step 1: Write failing tests** (exact values):
  - `dppFromUpm('2026-03-20') === '2026-12-25'`; `dppFromUpm('2026-02-16') === '2026-11-23'`; leap year `dppFromUpm('2027-06-01') === '2028-03-07'`; year end `dppFromUpm('2026-03-27') === '2027-01-01'`.
  - `egAt({upm:'2026-03-20'}, '2026-11-17')` → `{settimane:34, giorni:4, totaleGiorni:242, fuoriRange:false}`; `formatEG` → `'34+4'`.
  - eco correction: `egAt({upm:'2026-03-20', dppEco:'2026-12-30'}, '2026-11-17').totaleGiorni === 237`; `dppEffettiva` returns `dppEco` when present.
  - DST: `diffDays('2026-10-24','2026-10-26') === 2` and `diffDays('2026-03-28','2026-03-30') === 2`.
  - `todayISO(new Date(2026,10,17,23,59)) === '2026-11-17'` and `todayISO(new Date(2026,10,18,0,1)) === '2026-11-18'` (local).
  - out of range: total 309 days → `fuoriRange: true`; date before UPM → negative total, `fuoriRange: true`.
  - no UPM: `egAt({}, d) === null`, `dppEffettiva({}) === null`, but `dppEffettiva({dppEco:'2027-01-10'}) === '2027-01-10'`.
  - `postPartumAt('2026-10-27','2026-11-01') === 'parto +5 gg'`; day 14 → `'parto +14 gg'`; `('2026-10-27','2026-11-17') === 'parto +3 sett'`; before parto → `null`.
  - `stationPosition(140) === 0.5`; `stationPosition(300) === 1`; `stationPosition(-3) === 0`.
- [ ] **Step 2:** `npx vitest run tests/dates.test.ts tests/obstetrics.test.ts` → FAIL (modules missing).
- [ ] **Step 3:** Implement. `dates.ts` parses `YYYY-MM-DD` with `Date.UTC` and formats with `getUTC*`; `todayISO` reads local `getFullYear/getMonth/getDate`. EG reference date = `dppEffettiva − 280`.
- [ ] **Step 4:** Run tests → PASS.
- [ ] **Step 5:** Commit `feat: date-only helpers and obstetric calculations`.

### Task 3: Database and repository

**Files:**
- Create: `src/lib/db.ts`, `src/lib/repo.ts`
- Test: `tests/repo.test.ts` (start with `import 'fake-indexeddb/auto'`; fresh DB per test via `db.delete(); db.open()`)

**Interfaces:**
- Consumes: types from Task 2.
- Produces (`db.ts`): `db` (Dexie) with stores `mamme: 'id, archiviata'`, `gravidanze: 'id, mammaId, stato'`, `incontri: 'id, gravidanzaId, data, stato'`, `impostazioni: 'id'`; `getImpostazioni(): Promise<Impostazioni>` (default `{id:'main', timeoutMinuti:5}`).
- Produces (`repo.ts`):
  - `createMamma(m: MammaInput, g: GravidanzaInput): Promise<{mamma: Mamma; gravidanza: Gravidanza}>` (one transaction; gravidanza `stato:'in_corso'`)
  - `updateMamma(id, patch)`, `updateGravidanza(id, patch)` (bumps `updatedAt`; setting `dataParto` sets `stato:'conclusa'`)
  - `nuovaGravidanza(mammaId, g: GravidanzaInput): Promise<Gravidanza>`
  - `deleteMamma(id): Promise<void>` (cascade gravidanze + incontri, one transaction)
  - `saveIncontro(i: IncontroInput & {id?: string}): Promise<Incontro>` (insert or update)
  - `deleteIncontro(id)`
  - `copiaIncontro(sourceId: string, gravidanzaIds: string[]): Promise<Incontro[]>` (copies `data, ora, tipo, stato, argomento, attivita`; `partnerPresente:'nd'`, no measurements, no note)
  - `getMammaDetail(id): Promise<{mamma; gravidanze: Gravidanza[] /* newest first */; incontriByGravidanza: Record<string, Incontro[]> /* date desc */} | null>`
  - `getAllData(): Promise<{mamme; gravidanze; incontri}>`
  - `MammaInput`, `GravidanzaInput`, `IncontroInput` = the record types without `id/createdAt/updatedAt` (and without `mammaId`/`gravidanzaId` where the function takes it).

- [ ] **Step 1: Write failing tests:** create → detail returns 1 gravidanza `in_corso`; `nuovaGravidanza` → detail lists 2, newest first; `saveIncontro` twice with same id updates one record and `updatedAt` grows; `deleteMamma` leaves zero gravidanze and incontri for that mamma and keeps another mamma's; `copiaIncontro` to 2 gravidanze creates 2 records with `partnerPresente:'nd'` and no `sinfisiFondoCm`; `updateGravidanza(id,{dataParto:'2026-10-27'})` → `stato:'conclusa'`; `getImpostazioni()` on empty DB → `timeoutMinuti:5`.
- [ ] **Step 2:** Run → FAIL.
- [ ] **Step 3:** Implement with `db.transaction('rw', ...)` for create/delete/copy.
- [ ] **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: dexie database and repository`.

### Task 4: List overview logic

**Files:**
- Create: `src/lib/overview.ts`
- Test: `tests/overview.test.ts` (pure: feed arrays, no DB)

**Interfaces:**
- Consumes: `getAllData()` shape, `obstetrics`, `dates`.
- Produces:
  - `type RigaMamma = { mammaId; nome: string /* "Nome Cognome" */; sezione: 'in_gravidanza'|'dopo_parto'|'archiviata'; eg: string|null; egTotaleGiorni: number|null; fuoriRange: boolean; dpp: ISODate|null; postParto: string|null; dataParto: ISODate|null; prossimo: Incontro|null; daRegistrare: Incontro[]; upmMancante: boolean }`
  - `buildRighe(data, today: ISODate): RigaMamma[]` — current gravidanza = the `in_corso` one, else the most recent; sezione `archiviata` if mamma archiviata, `dopo_parto` if current gravidanza has `dataParto`, else `in_gravidanza`. `prossimo` = earliest `programmato` with `data >= today`. `daRegistrare` = `programmato` with `data < today`.
  - `ordinaRighe(righe): RigaMamma[]` — in_gravidanza by DPP ascending, missing DPP last; dopo_parto by dataParto descending; archiviata by name.
  - `serveBackup(ultimoBackup: string|undefined, haDati: boolean, today: ISODate): boolean` — true if haDati and (never or > 14 days).
- [ ] **Step 1: Write failing tests:** Carmela (upm 2026-03-20) → `eg '34+4'`, `dpp '2026-12-25'`; mamma without upm → `upmMancante:true`, `eg:null`, sorted after Pina; programmato on 2026-11-10 with today 2026-11-17 → in `daRegistrare`, not `prossimo`; marking it `fatto` removes it; gravidanza with `dataParto 2026-10-27` → sezione `dopo_parto`, `postParto 'parto +3 sett'`; `serveBackup(undefined,true,…)===true`, `serveBackup('2026-11-03T10:00:00Z',true,'2026-11-17')===false`, `('2026-11-02…')===true`, `serveBackup(undefined,false,…)===false`.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Commit `feat: caseload overview derivations`.

### Task 5: App shell, router, Mamme screen

**Files:**
- Create: `src/lib/router.svelte.ts`, `src/components/TabBar.svelte`, `src/components/StationLine.svelte`, `src/routes/Mamme.svelte`
- Modify: `src/App.svelte`

**Interfaces:**
- Produces: `router` with `router.path: string`, `router.params: Record<string,string>`, `navigate(hash: string)`; `matchRoute(path) → { name: 'mamme'|'mammaNuova'|'scheda'|'mammaModifica'|'incontroNuovo'|'incontro'|'calendario'|'impostazioni'|'aiuto', params }` (pure, unit-tested in `tests/router.test.ts`: `'#/mamma/abc'` → `scheda {id:'abc'}`, unknown → `mamme`).
- `StationLine` props: `{ totaleGiorni: number | null }` — draws the ink line, station dots at `STAZIONI_SETTIMANE`, a square terminal at 40, the today-blue marker at `stationPosition`; renders nothing when null. `aria-label` "Settimana N su 40".

- [ ] **Step 1:** Router test (above) → FAIL → implement → PASS.
- [ ] **Step 2:** Build `Mamme.svelte` from `buildRighe` + `ordinaRighe` (load via `getAllData`, Dexie `liveQuery`), matching `orario.html`: yellow header with "Mamme" and today's weekday + `dd.mm`; ruled column header EPOCA / MAMMA · PROSSIMO / ARRIVO; one row per mamma (EG big; name; next meeting or red "Incontro del dd.mm da registrare"; DPP right; `StationLine`); row nearest DPP ≤ 14 days tinted `#FFF8D6`; "UPM mancante" in grey in the EG column; sections "Dopo il parto" and collapsible "Archiviate"; search field filtering by name (above the column header, inside the yellow header); "Nuova mamma" pill → `#/mamma/nuova`. Empty state: one line of copy and the "Nuova mamma" button.
- [ ] **Step 3:** `TabBar` with Mamme / Calendario / Impostazioni, SVG icons, active tab on yellow, 84px tall incl. safe-area inset.
- [ ] **Step 4:** Verify in the browser at 390×844 with seeded data (temporary dev-only seed button behind `import.meta.env.DEV`): matches the mock's arrangement; `npm run check` clean.
- [ ] **Step 5:** Commit `feat: app shell, router and Mamme list`.

### Task 6: Mamma form and Scheda mamma

**Files:**
- Create: `src/routes/MammaForm.svelte`, `src/routes/Scheda.svelte`, `src/components/ConfirmDialog.svelte`

**Interfaces:**
- Consumes: `createMamma`, `updateMamma`, `updateGravidanza`, `nuovaGravidanza`, `deleteMamma`, `getMammaDetail`, `egAt`, `postPartumAt`, `StationLine`.
- `ConfirmDialog` props: `{ open: boolean; titolo: string; testo: string; conferma: string; pericoloso?: boolean; onconferma: () => void; onannulla: () => void }` (native `<dialog>`).

- [ ] **Step 1:** `MammaForm` (new and edit): nome (required), cognome, telefono (`type=tel`), data di nascita, UPM, DPP da eco, anamnesi (textarea, general), anamnesi ostetrica (textarea, saved on the current gravidanza), note; "Nuova gravidanza" in the scheda opens the same pregnancy fields (UPM, DPP da eco, anamnesi ostetrica) in a `<dialog>`; while typing UPM show computed DPP and today's EG live. On save navigate to the scheda.
- [ ] **Step 2:** `Scheda`: yellow header with name and back arrow; top block owned by today's EG at display size + DPP (and "UPM gg/mm/aaaa"; "corretta da eco" when `dppEco`) + `StationLine`; after the birth show `postPartumAt` instead; "Prossimo incontro"; anamnesi expandable; incontri as numbered timetable rows (N. progressive, date, EG at that date or postpartum, tipo, SF, partner ✓ drawn as SVG check), red rows for `daRegistrare`; "+ Incontro" → `#/gravidanza/:gid/incontro/nuovo`; "Gravidanze precedenti" collapsible; menu: Modifica, Registra parto (date input → `updateGravidanza`), Nuova gravidanza, Archivia/Riattiva, Elimina (ConfirmDialog stating that all pregnancies and meetings are deleted, offering "Archivia" as the alternative).
- [ ] **Step 3:** Verify in browser: create Carmela with UPM 20/03/2026 → scheda shows 34+4 and DPP 25/12/2026 on 17/11/2026; delete asks for confirmation; `npm run check` clean.
- [ ] **Step 4:** Commit `feat: mamma form and scheda`.

### Task 7: Incontro form

**Files:**
- Create: `src/routes/IncontroForm.svelte`

**Interfaces:**
- Consumes: `saveIncontro`, `deleteIncontro`, `copiaIncontro`, `getMammaDetail`, `buildRighe` (for the copy picker list of `in_gravidanza` mamme), `egAt`, `postPartumAt`.

- [ ] **Step 1:** Fields: data (default today), ora, stato (segmented: Fatto / Programmato; default Programmato when data > today), tipo (segmented; default `puerperio` when the gravidanza has `dataParto` ≤ data, else `controllo`), argomento, partner (Sì / No / Non indicato), "Cosa ho fatto", "Misure" group (SF cm, peso kg, pressione text, BCF bpm; `inputmode="decimal"`/`numeric`) open by default for `controllo`, note. Live line under the date: EG at that date, or postpartum text, or "UPM mancante".
- [ ] **Step 2:** Opening a `programmato` incontro offers "Segna come fatto" which switches stato and focuses "Cosa ho fatto".
- [ ] **Step 3:** "Copia ad altre mamme": checklist of other mamme in gravidanza → `copiaIncontro` → toast "Copiato a N mamme".
- [ ] **Step 4:** Unsaved-changes guard: compare form state with the loaded record; on back/tab tap/hash change show ConfirmDialog "Uscire senza salvare?"; also `beforeunload`.
- [ ] **Step 5:** Verify in browser: an incontro saved in < 1 minute from the scheda; overdue row turns normal after "Segna come fatto"; `npm run check` clean.
- [ ] **Step 6:** Commit `feat: incontro form with copy and unsaved guard`.

### Task 8: Calendario

**Files:**
- Create: `src/lib/calendar.ts`, `src/routes/Calendario.svelte`
- Test: `tests/calendar.test.ts`

**Interfaces:**
- Produces: `monthGrid(year: number, month1to12: number): ISODate[][]` (weeks Monday-first, 6 rows, includes leading/trailing days); `eventiPerGiorno(data, from: ISODate, to: ISODate): Record<ISODate, Evento[]>` with `Evento = { tipo: 'incontro'|'dpp'; mammaId; nome; incontro?: Incontro }` (DPP of `in_corso` gravidanze only); `prossimi7(data, today): Evento[]` sorted by date then `ora`.
- [ ] **Step 1: Failing tests:** `monthGrid(2026, 11)[0][0] === '2026-10-26'` and the grid has 42 days; Carmela's DPP appears on `'2026-12-25'`; a concluded gravidanza's DPP does not; `prossimi7` with today 2026-11-17 includes 2026-11-23 and excludes 2026-11-25.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** `Calendario.svelte`: top "Prossimi 7 giorni" timetable list; month grid with prev/next, small ink dots for meetings (red if da registrare), square marker for DPP, today circled in blue; tapping a day lists its events linking to the scheda; below, "Panoramica": one row per in-gravidanza mamma with name, EG, DPP and a full-width `StationLine`.
- [ ] **Step 6:** Verify in browser at 390 wide; commit `feat: calendario and panoramica`.

### Task 9: Backup export/import and reminder

**Files:**
- Create: `src/lib/backup.ts`, `src/components/BackupBanner.svelte`, `src/routes/Impostazioni.svelte` (backup section)
- Test: `tests/backup.test.ts` (fake-indexeddb)

**Interfaces:**
- Produces: `type Backup = { formato: 'ostetrixie'; versione: 1; esportatoIl: string; mamme; gravidanze; incontri }`; `buildBackup(): Promise<Backup>`; `backupFilename(today: ISODate): string`; `validateBackup(raw: unknown): { ok: true; backup: Backup; riepilogo: { mamme: number; incontri: number; esportatoIl: string } } | { ok: false; errore: string }`; `restoreBackup(b: Backup): Promise<void>` (clears and bulk-adds all three tables in one `rw` transaction); `segnaBackupFatto(now: Date): Promise<void>`; `condividiOScarica(b: Backup, filename: string): Promise<void>` (Web Share with `File` when `navigator.canShare({files})`, else `<a download>` blob).

- [ ] **Step 1: Failing tests:** round trip: seed 2 mamme/3 incontri → build → wipe → restore → `getAllData` deep-equals the original; `validateBackup({formato:'altro'})` → `ok:false` with `errore` mentioning "non è un backup di Ostetrixie"; `versione: 2` → `ok:false` "versione più recente"; incontro without `data` → `ok:false`; `backupFilename('2026-11-17') === 'ostetrixie-backup-2026-11-17.json'`; restore that throws mid-way (stub `bulkAdd` to reject) leaves the previous data intact.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** Impostazioni → "Backup": last backup date; "Esporta" (shows the sensitive-data warning once per export, then shares/downloads, then `segnaBackupFatto`); "Importa" (file input `.json` → validate → summary + ConfirmDialog "Sostituisce tutti i dati"; if data exist, first offer "Esporta prima i dati attuali"). `BackupBanner` on Mamme when `serveBackup` is true, linking to Impostazioni. Call `navigator.storage?.persist?.()` once at startup in `main.ts`.
- [ ] **Step 6:** Commit `feat: json backup export/import with reminder`.

### Task 10: PIN and lock

**Files:**
- Create: `src/lib/pin.ts`, `src/lib/lock.svelte.ts`, `src/components/LockScreen.svelte`
- Modify: `src/routes/Impostazioni.svelte` (PIN + timeout + reset), `src/App.svelte` (lock gate)
- Test: `tests/pin.test.ts`, `tests/lock.test.ts`

**Interfaces:**
- Produces: `hashPin(pin: string, salt?: Uint8Array): Promise<{ hash: string; salt: string }>` (PBKDF2-SHA256, 210000 iterations, base64); `verifyPin(pin, hash, salt): Promise<boolean>`; `isValidPin(pin): boolean` (`/^\d{4,6}$/`); `shouldLock(hiddenAt: number|null, now: number, timeoutMinuti: number): boolean`; `lock` state `{ locked: boolean }` with `lock.engage()`, `lock.unlock()`, and a `visibilitychange` listener that records `hiddenAt` and engages when `shouldLock`.
- [ ] **Step 1: Failing tests:** `verifyPin('1234', …hashPin('1234'))` true, `'1235'` false; `isValidPin('123')` false, `'123456'` true, `'12a4'` false; `shouldLock(0, 5*60_000+1, 5)` true, `(0, 4*60_000, 5)` false, `(null, …)` false.
- [ ] **Step 2:** Run → FAIL. **Step 3:** Implement. **Step 4:** Run → PASS.
- [ ] **Step 5:** `LockScreen`: yellow full screen, "Ostetrixie", numeric keypad (44px+ keys), dots; wrong PIN shakes once and clears. App starts locked when a PIN exists. Impostazioni: set/change/disable PIN (asks current PIN), timeout select (1, 5, 15 min), the sentence "Il PIN protegge l'accesso all'app ma non cifra i dati", and "Cancella tutti i dati" with double confirmation (second step requires typing `CANCELLA`), also reachable from LockScreen via "PIN dimenticato?".
- [ ] **Step 6:** Commit `feat: pin lock with inactivity timeout`.

### Task 11: PWA polish, help, deploy, finish review

**Files:**
- Create: `src/components/UpdateBanner.svelte`, `src/routes/Aiuto.svelte`, `public/icons/*`, `.github/workflows/deploy.yml`, `DESIGN.md` (via documenter)
- Modify: `src/App.svelte`, `src/routes/Impostazioni.svelte` (version + link to Aiuto)

- [ ] **Step 1:** `UpdateBanner` using `virtual:pwa-register/svelte` `useRegisterSW`: when `needRefresh`, show "Nuova versione disponibile · Aggiorna"; reload only on tap; if a form has unsaved changes the tap goes through the same unsaved guard.
- [ ] **Step 2:** Icons: an authored SVG mark (black station dot-and-line on yellow) exported to 192/512/maskable PNG and 180 apple-touch; `apple-mobile-web-app-capable` + status-bar meta in `index.html`.
- [ ] **Step 3:** `Aiuto`: install steps for iPhone (Safari → Condividi → Aggiungi a Home) and Android (Chrome → menu → Installa app), and why backups matter.
- [ ] **Step 4:** `deploy.yml`: on push to `main`, `npm ci && npm test && npm run build`, upload `dist` with `actions/upload-pages-artifact`, deploy with `actions/deploy-pages`. The user creates the public GitHub repo `ostetrixie` and enables Pages (Source: GitHub Actions); ask before pushing.
- [ ] **Step 5:** Verify: `npm run build && npx vite preview --base /ostetrixie/`; in the browser go offline and reload → app works; Lighthouse PWA installable. Manual check on a real iPhone and Android: install, offline, export/import.
- [ ] **Step 6:** Impeccable finish: run `impeccable detect --json` on `src/`, capture `.impeccable/review/mobile.png` (390) and `desktop.png` (1440), spawn the finish reviewer with the direction contract and `orario.html` as critique reference, apply its fixes, then the documenter writes `DESIGN.md` + `.impeccable/design.json`.
- [ ] **Step 7:** Commit `feat: pwa update flow, help, icons and pages deploy`.
