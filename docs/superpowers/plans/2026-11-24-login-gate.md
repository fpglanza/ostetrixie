# Login Gate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** A cosmetic, once-per-device login screen in front of the app, with accounts added by hand through `npm run add-account`.

**Architecture:** A committed `src/lib/accounts.json` holds `{username, hash, salt}` entries hashed with the PIN's PBKDF2. A small `accesso` store checks credentials and keeps an "entered" flag in `localStorage`. `App.svelte` renders only `LoginScreen` until that flag is set.

**Tech Stack:** Svelte 5, TypeScript, Vitest + @testing-library/svelte, Node `crypto` for the script.

**Spec:** `docs/superpowers/specs/2026-11-24-login-gate-design.md`

## Global Constraints

- Hashing must match `src/lib/pin.ts` exactly: PBKDF2-SHA-256, 210 000 iterations, 32-byte key, 16-byte random salt, base64.
- No plain-text passwords anywhere in the repo.
- Usernames are compared `trim().toLowerCase()`.
- Italian UI copy. Error: `Nome utente o password errati` (never say which field was wrong).
- `localStorage` key: `ostetrixie.accesso`. Every read and write goes in try/catch.
- No network calls, no new dependencies.

## Review Focus

- Username typed with different case or surrounding spaces → still accepted.
- `localStorage` throws (private mode) → login works for the session and nothing crashes.
- `accounts.json` empty → every attempt is rejected, no crash.
- A Node-made hash (script) verifies in the browser (WebCrypto) → covered by a cross-check test.
- Re-adding an existing username → the entry is replaced, not duplicated.

---

### Task 1: Accounts + check + add-account script

**Files:**
- Create: `src/lib/accounts.json` (initially `[]`)
- Create: `src/lib/accesso.svelte.ts`
- Create: `scripts/add-account.mjs`; add `"add-account": "node scripts/add-account.mjs"` to `package.json`
- Test: `tests/accesso.test.ts`

**Interfaces:**
- Produces: `type Account = { username: string; hash: string; salt: string }`
- Produces: `verificaCredenziali(username: string, password: string, accounts: Account[]): Promise<boolean>` (uses `verifyPin` from `pin.ts`)
- Produces: `accesso` singleton with `entrato: boolean` ($state) and `entra(username, password): Promise<boolean>`, which on success sets `entrato` and writes `localStorage['ostetrixie.accesso'] = '1'`
- Produces: `scripts/add-account.mjs` exports `creaAccount(username, password, salt?) → Account` and `aggiungi(list, account) → Account[]` (replaces on the same normalized username). The CLI part runs only when the file is executed directly.

- [ ] Tests: `accetta credenziali giuste` (account from `hashPin`); `ignora maiuscole e spazi nel nome` (`'  Sofi '` vs `sofi`); `rifiuta password sbagliata`; `rifiuta con lista vuota`; `un hash creato dallo script si verifica nel browser` (`creaAccount` → `verificaCredenziali` true); `aggiungi sostituisce lo stesso nome`.
- [ ] Run `npx vitest run tests/accesso.test.ts` → FAIL.
- [ ] Implement. The CLI prompts for the username, then the password with echo muted, writes `accounts.json` pretty-printed and prints `Account "<name>" salvato. Fai commit e push per pubblicarlo.`
- [ ] Run the tests → PASS.

### Task 2: LoginScreen + App gate

**Files:**
- Create: `src/components/LoginScreen.svelte`
- Modify: `src/App.svelte` (wrap the content/lock blocks in `{#if accesso.entrato} … {:else}<LoginScreen />{/if}`; `UpdateBanner` stays outside)

**Interfaces:**
- Consumes: `accesso.entra`, `accesso.entrato`

- [ ] Build the screen in the lock screen's visual language: yellow background, `Ostetrixie` h1 with a rule, subtitle `Accedi`. Two labelled fields `Nome utente` (`autocomplete="username"`, `autocapitalize="none"`) and `Password` (`type="password"`, `autocomplete="current-password"`). A full-width primary `Entra` button, disabled while checking or while either field is empty. On a wrong login, show the error in `role="alert"` and clear the password.
- [ ] Run `npm test && npm run check && npm run build` → all green.
- [ ] Verify in the browser preview with a temporary account: the login shows, a wrong password shows the error, the right one enters, a reload stays signed in. Remove the temporary account afterwards.
- [ ] Commit spec, plan and code.
