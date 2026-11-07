# JARVIS CUT15 · B2 Revocation / RLS physical evidence
Date: 2026-11-05
State: VERIFIED_LAB_TEMPORARY_GREEN / PERSISTENT_LAB_NOT_YET_CERTIFIED / PROD_NO_GO

## Evidence (actual GitHub run)
- Repository: carlosjmunoz78/fenix-capital-inmo-map
- PR: #25 DRAFT, no merge
- SHA validated: 5f203ff765128d5956dc98d9e10e8e5e77601ef4
- JARVIS Universal Core LAB Tests: run 42109118073, job 127531687292, SUCCESS.
- Node tests 572/572 PASS, 0 FAIL.
- Postgres 17 isolated disposable service: `CUT15 PostgreSQL RLS scope, revocation, read-only privilege and snapshot restore: PASS`.
- Lab reader observes only active/fenix-app/fenix scope; revoked owner / other tenant / other channel are invisible.
- Reader INSERT and UPDATE denied. An admin LAB session revokes identity; subsequent separate read connection sees no active bindings.
- pg_dump/restore of synthetic records verified (4 rows) in second temporary database; restored RLS ENABLE and FORCE flags true.
- B4 Real PostgreSQL, B7 Multiagent and Governed Main Integration each SUCCESS for the same code SHA.

## Scope limitations
- Synthetic HMAC IDs, never actual owner identity or real credentials.
- Test uses temporary GitHub Actions database, **not a durable deployed owner registry**.
- RLS demo policy is fixed to a synthetic tenant and channel for laboratory verification only. It is not a multiempresa production RLS design.
- No owner enrollment; Vault and session authentication remain incomplete.
- Mission storage persistence across actual independent devices and machines is not proven here.
- No B3 grant or PROD mission execution enabled.
- No App/CRM/Supabase PROD/ANA/Trading/WordPress modifications; no new subscriptions.

## Next single block
Select an independently backed, persistent LAB runtime by live dependency inventory (do NOT assume `fenix-capital-inmo-map` Supabase project is idle), then implement:
1. PostgreSQL dedicated role, private schema, RLS and tracked HMAC key reference via server Vault; backup and restore on actual persistent substrate.
2. Trusted real Fenix owner authentication with verifiable USER session and device session IDs (no secrets/OTP/JWT in chats/logs).
3. Owner enrollment with expiry/revocation and B3 MISSION_INSPECT minimum grants, only after authenticating legitimate owner and verifying scope.
4. Read-only mission persisted across two real devices; kill switch and revocation tests; B10 independent tribunal.
5. OLD vs NEW + rollback and gated gradual promotion. Autonomous execution remains off.

Rollback: revert isolated CUT15 shell changes in draft PR. PROD unchanged.
