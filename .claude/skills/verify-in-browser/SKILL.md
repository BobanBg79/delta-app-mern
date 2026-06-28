---
name: verify-in-browser
description: Use when you need to verify a feature works in the running Delta Apartmani app by driving it in a real browser (Chrome DevTools MCP) — clicking through the UI, checking behavior and console errors. Covers logging in as the admin test user, navigating, and what to check. Requires the app to be running (see the run-app skill).
---

# Verifying features in the browser

Drive the running app with the **chrome-devtools** MCP server to confirm a change actually works end-to-end, not just in unit tests.

## Before every commit

Always do both, in this order: (1) run the test suites (server `npm test`, client `CI=true npm test`), and (2) verify the change in the browser. Don't commit on green tests alone — UI changes especially need a real browser check.

## Prerequisites

1. The app must be running. If it is not, use the **run-app** skill first (backend on 5000, frontend on 3000).
2. The **chrome-devtools** MCP server must be available (configured in `.mcp.json`).
3. Follow the **efficient-browser-mcp** skill (user-level) for token-aware browser usage: prefer `evaluate_script` over snapshots, never snapshot/screenshot without a file path, use `list_network_requests`/`list_console_messages` for cheap checks. Snapshots/screenshots cost 100K+ tokens each.

## Admin test user

Most features require an authenticated admin. Credentials for the dedicated admin test user are stored in `.claude/test-credentials.local.md` (gitignored). Read that file for the username and password.

If that file does not exist, ask the user to create the admin test user and provide the credentials, then save them to `.claude/test-credentials.local.md`.

## Login flow

1. Navigate to `http://localhost:3000` (lands on the login page).
2. Fill the username (email) and password fields with the admin credentials.
3. Submit the login form.
4. Confirm you land on the homepage (it shows `Welcome <name>` and the user's role).

## Driving the app

Use the chrome-devtools MCP tools:

- `take_snapshot` — get the accessibility tree / element refs to interact with (preferred over screenshots for finding elements).
- `take_screenshot` — capture the visual state. **Always look at the screenshot** — a blank frame means the page failed to render.
- `click`, `fill`, `fill_form` — interact with elements by their ref from the snapshot.
- `navigate_page` — go to a specific URL.
- `list_console_messages` — check for errors and warnings (a feature that "looks fine" but logs errors is not done).
- `list_network_requests` — inspect API calls (verify the right endpoint is hit with the right params).

## What to verify (general checklist)

- The feature behaves as specified (the actual user-visible outcome).
- No new console errors or warnings (`list_console_messages`).
- API requests carry the expected params and return the expected data (`list_network_requests`).
- Edge/empty states render correctly.

## Example: Transactions filters + pagination

Page: Accounting → Transactions (`/accounting/transactions`).

1. On load, only the latest 10 transactions show (pageSize = 10).
2. Apply a date range filter and Search — verify the request to `/api/accounting/transactions` includes `startDate`/`endDate` (numeric timestamps) and the table updates.
3. Apply konto / type / source filters — verify they are sent as query params.
4. Change page — verify the active filters are preserved on the next page.
5. Click Clear — verify it resets to the latest 10.
6. Check the console for errors throughout.

## Notes

- Never commit credentials. `.claude/test-credentials.local.md` is gitignored.
- If the page shows a 401/redirect to login, the session expired — log in again.
