# Browser P0 closure

Scope: CEREBRO browser UI, encrypted human input and existing Work Total worker only.
Dependencies: existing owner gateway, interactive queue/control table, scoped profiles and encrypted session bundles. No new runtime or subscription.
UI: editable URL, normal tabs/history controls; compact exceptions outside viewport; profiles/observability in details; internal chat hidden in this view only.
Input: fill by locator; insertText at focus; explicit compatibility key events only, zero artificial delay. Pending text merges only within the same session/lease and never across clicks or key commands. Human queue completion precedes handback.
Persistence/security: existing VERIFIED-only bundles, tenant boundaries, Core Guard and authentication remain enforced. NAVIGATE uses the existing encrypted/audited queue and human lease.
Baseline live source: 3493d6ae943e19a5b5988930452725e35269fc96.
Baseline static deployment: gh-pages d30f728a96944f5becefff29bb82095c76f547db.
Baseline main: 23ee5957da7db9f96a93812fa20eafece257b5f6.
Baseline Work Total runtime branch: 301c006cc7efc2fdf0866e425c9a593a8187457a.
Rollback: republish the saved static deployment; restore only the changed runtime files from the baseline branch; redeploy docs/rollback/browser-p0-{owner,worker}-prod.original.ts with their original names and verify_jwt=false (functions validate the caller themselves). Keep the additive NAVIGATE constraint to retain command history. Do not revert unrelated commits or delete session data.
Rebuild: npm ci; npm run build; existing PROD Live Deploy workflow. Existing bounded Work Total consumer uses its promotion branch.
Validation: local build, encrypted bundle/tenant/guard regression tests; PREPROD constraint change rehearsed and rolled back. Physical PROD control acceptance is recorded below; authenticated persistence remains pending login.

Physical PROD evidence (session 06ff5fe0-449f-45a1-bbca-6c4be35c8516): new tab, full URL navigation example.com then iana.org, reload, back/forward, switch and close passed. Long synthetic text pasted and observed in Google search; one KEYBOARD_TYPE completed in 790 ms. Takeover/handback passed, then a CEREBRO OPEN_TAB order completed. Test session stopped. Google principal credentials and authenticated bundle reopen require the owner; no credentials collected or exported.

Final deployed source: 42cc1e10f476e090362519be2f0367d7da357a8e (live PROD_SOURCE_SHA verified); Work Total runtime deda3ebf991274e39ffb85e0269e1b0b814cd20c. Owner/worker edge versions 2, migration 20261025222424. Final viewport correction verified physically: 1440x1000 live frames fit a bounded absolute image; click opened Google sign-in. Google principal uses session 05ce94b7-db9a-4585-862c-9366597139e9 and a different scoped profile from the stopped canary. Main App reload retained the running session. Final synthetic paste command completed in 842 ms; account sign-in remains manual. Physical A-D passed; E sign-in prepared; F authenticated close/reopen cannot be asserted before owner authentication. Status: browser controls verified operational; authenticated persistence PENDING_HUMAN_LOGIN, not asserted complete. No secret material extracted.
