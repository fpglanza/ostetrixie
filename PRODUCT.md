# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Svelte 5 + Vite + TypeScript, Dexie (IndexedDB), vite-plugin-pwa, Vitest. Installable offline PWA hosted on the developer's GitHub Pages at `<user>.github.io/ostetrixie/` (fixed origin). Stack proposed by Claude and accepted by the user; see `docs/superpowers/specs/2026-11-17-ostetrixie-design.md`.

## Users

One user: Sofi, an independent midwife (ostetrica libera professionista) who follows several pregnant clients at once. She uses the app on her own phone:
- during a visit, in front of the mother, often at the mother's home, sometimes one-handed;
- right after a visit (in the car, between appointments) to record what happened;
- in the evening, calmly, to review the week and plan.

## Product Purpose

A private, offline record of every client ("mamma") and her pregnancy: last menstrual period, estimated due date, gestational age (always current), free-form anamnesis, and every meeting (topic, partner present, symphysis-fundal height, what was done, vitals). A calendar and overview give her the whole caseload at a glance. Success: find a mother in two taps, log a meeting in under a minute, always know each client's week and who's next.

## Positioning

Built for one midwife's actual practice, not a generic clinic system: no accounts, no cloud, data never leaves the phone except by her explicit JSON backup.

## Operating Context

Home visits and studio visits, birth-preparation meetings (sometimes group), postpartum (puerperio) visits. Italian clinical vocabulary: UPM, DPP, EG (settimane+giorni, e.g. 34+2), sinfisi-fondo, BCF, puerperio.

## Capabilities and Constraints

- Italian only. Dates dd/mm/yyyy.
- Health data (GDPR special category): local-only, PIN lock, no network calls, no external fonts/CDN/analytics.
- Backup/restore via JSON file; reminder when backup is stale.
- Mamma → Gravidanza(e) → Incontri model; meetings can be planned or done.
- Full functional spec: `docs/superpowers/specs/2026-11-17-ostetrixie-design.md`.

## Brand Commitments

Name: **Ostetrixie** (final, appears under the home-screen icon). No existing logo, colors, or studio identity: the app's identity is free to define.

## Evidence on Hand

No real client data, logo, or imagery. Mockups must use invented placeholder clients (e.g. Carmela, Pina) and never present them as real.

## Product Principles

1. Fast to log, faster to find: the meeting form and mother lookup outrank everything else.
2. Dates are clinical facts: calculations are exact and always visible where decisions are made.
3. Privacy by default: nothing leaves the phone silently.
4. Never lose her work: confirmations on destructive actions, backup always within reach.
5. Usable in the room: legible at a glance, in daylight, one-handed, without distracting the mother.

## Accessibility & Inclusion

Large touch targets, high contrast for outdoor/daylight use, readable type at arm's length.
