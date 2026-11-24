# Login gate — design (short)

## Intent

The app stays public on GitHub Pages. People who get the link should see a login screen and not be able to get in without an account that Filippo created by hand. The gate is **for show**: those people aren't technical. It isn't real security. The real protections stay the same: data that lives only on the phone, plus the PIN.

## Goals / non-goals / anti-goals

- Goal: a login screen (username + password) in front of the whole app, asked **once per device**.
- Goal: Filippo creates accounts by hand with `npm run add-account`, then pushes.
- Non-goals: sign-up, password reset, logout UI, a server, data sync.
- Anti-goal: slowing Sofi down. After the first login the PIN keeps guarding daily use, with no second prompt.
- Anti-goal: plain-text passwords in the repo (the repo is public).

## Approaches

1. **Client-side gate with hashed accounts in the repo (chosen).** Free, keeps GitHub Pages, no backend. Anyone technical can read the code and skip it, which is acceptable here.
2. Cloudflare Access in front of a Cloudflare Pages deploy. Real security, but it changes the origin, so the data would need a one-time move. Rejected: more than needed.
3. A backend with real accounts (e.g. Supabase). Rejected: it goes against "no cloud" and adds GDPR weight.

## Design

- `src/lib/accounts.json`: a list of `{ username, hash, salt }`. The hash uses the same PBKDF2 as the PIN (`pin.ts`: SHA-256, 210 000 iterations, 32-byte key, base64).
- `scripts/add-account.mjs` (`npm run add-account`) asks for a username and a password (the password isn't shown while typed). It hashes with Node's `crypto.pbkdf2` using the same parameters and adds or replaces the entry. Usernames are compared trimmed and lower-case.
- `src/lib/accesso.svelte.ts`: `entrato` state, read from `localStorage` (try/catch, so if storage is missing the user just sees the login again). `entra(username, password)` checks the password against the list and saves the flag when it's right.
- `src/components/LoginScreen.svelte` reuses the lock screen's look (yellow, big title). It has username + password fields, an "Entra" button and the message "Nome utente o password errati". It doesn't say which of the two was wrong.
- `App.svelte`: until the user is logged in, show only `LoginScreen`. The content, the lock and the tab bar aren't mounted. `UpdateBanner` stays mounted so the service worker still registers.
- The flag lives outside IndexedDB, so "PIN dimenticato" (which wipes the data) doesn't ask for the login again.

## Left to the builder

The exact copy and spacing of the login screen, within the lock screen's visual language.
