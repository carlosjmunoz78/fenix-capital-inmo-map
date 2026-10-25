# Browser OIDC rejection recovery

Observed PROD failure: run 40241976763 / job 121315634689 closed the browser on worker/poll with 403 GITHUB_OIDC_INVALID. The underlying JWT/JWKS reason is not established.

Change: at most two additional authenticated attempts after this explicit pre-route rejection. Every attempt still verifies OIDC, repository, workflow and branch at the existing gateway. No retries for other denials, ambiguous network failures, or route errors. No credentials logged. Existing tenant isolation, encrypted sessions and VERIFIED-only persistence unchanged.

Dependencies: existing interactive gateway and token provider only. Additional subscriptions: none. Baseline runtime deda3ebf991274e39ffb85e0269e1b0b814cd20c is the rollback: restore browser-interactive-session-v3.mjs from that commit on the same promotion branch and run its existing workflow. No schema changes.

Validation: 22 tests passed (rejection recovery, expiry refresh, encrypted bundle, tenant and PROD contracts). Physical recovery and authenticated persistence remain unverified until live acceptance.
