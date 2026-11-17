---
version: 1
slug: "src-app-svelte"
primary_target: "src/App.svelte"
related_targets: []
---

# Surface brief: app shell (Mamme, Scheda mamma, Calendario, Impostazioni)

Scope: the whole Ostetrixie PWA, mobile-first (390 wide), mode Operate.
Audience/job: Sofi, midwife; find a mother in two taps, log a meeting in under a minute, see the caseload at a glance. Light theme from the use scene: daylight home visits, car, evening review.
Chosen direction: "Orario delle partenze". Composition reference: `.impeccable/mocks/decision/orario.html`.
Unresolved: dark variant for evening use; exact self-hosted face (Archivo variable, wdth axis, self-hosted, no CDN at runtime).

## Direction contract

THESIS: Every pregnancy is a journey with a known arrival; the caseload reads like the yellow Partenze poster of an Italian station, refusing the pastel-baby card grid and the clinical-blue EHR.

OWN-WORLD: Partenze yellow #F4CC1E owns the header and the active tab; ink #141414 on white; signal red #D2271F only for overdue/unlogged/out-of-range; one reserved "oggi" blue #1E5BD8 for the current-position marker only. Archivo with condensed width for tabular figures; 2px ink rules, 1px hairlines, no cards.

STORY: Sofi sees who is closest to arrival, who she sees next, and what is overdue, then taps a name to open that mother's full timetable of meetings.

FIRST VIEWPORT: Yellow header with "Mamme" in condensed 800 and today's date right; ruled column header EPOCA / MAMMA · PROSSIMO / ARRIVO; rows with EG at ~34px tabular, name + next meeting, DPP right; a station line under each row (13, 27, 37, 40 wk) with the blue "oggi" marker; "Dopo il parto" section; black "Nuova mamma" pill bottom right; bottom tab bar Mamme / Calendario / Impostazioni. Signature move: the pregnancy as a line with stations and the today marker, reused in scheda and calendar panoramica. Raises: denser rows with hairlines (from japanese-high-density-web); overdue item stays lit red until opened (from boarding-pass gate board); one colour reserved for "now" (from orienteering map); hierarchy by scale contrast (from variable-font specimen).

FORM: Orario ferroviario / Partenze poster, position 7 of 7 on the ordered list; seed:9d6769aeec7795e2.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
