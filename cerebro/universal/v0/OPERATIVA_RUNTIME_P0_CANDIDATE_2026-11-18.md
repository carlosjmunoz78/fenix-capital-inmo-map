# OPERATIVA P0 · Runtime evidence bridge candidate · 2026-11-18

STATUS: CANDIDATE / NOT PROD. Base: 7163dccd962a19fbd5301b14fcacacf08b7245ea; deployed baseline dpl_CQuh9UYH68JYHkTcaGcvXEq7fz5h.

This change reuses the **existing** owner-authorized `cerebro-console-activity-v0` Supabase activity API already called by JARVIS and NEURONAL, adding an optional read-only observation overlay to `/api/cerebro-agent-directory`.

**Safety**: no provider keys in clients; existing owner authorization happens first; evidence checks require GitHub run URL, actual ID, fenix company, exact engine ID, freshness and source state. Engine-to-profile affiliation does NOT mark a role active. The only proof to set `runtime_verified=true` is exact ID equality of role and runtime engine plus a currently active run; otherwise the profile stays POR_VERIFICAR. Stale/503 activity produces explicit DEGRADED source, no invented live runs. Legacy directory return remains compatible. No CRM/App core writes, DB schema changes or service changes.

Source incident: snapshot generated 2026-11-18T06:54:29.227Z; live `cerebro-console-activity-v0` v7 has 988 GET 503 and 659 GET 200 in queried last-24h window (as of ~08:49Z). **Cause of earlier 503 is not fully certified.** Cron workflow exists on main every 5 minutes; publisher source was last observed at that snapshot. Do not claim publisher healthy until verified via run logs and fresh snapshot. This candidate does not fix publisher scheduling.

QA: workflow `.github/workflows/cerebro-operativa-runtime-p0-qa.yml` on this isolated branch; require green TypeScript/build, baseline acceptance, negative auth, stale-source behavior, OLD vs NEW, and app/CRM smoke before PROD. Existing rollback: `a51dd14eac11f02424dce5db426346b041c1824f` / `dpl_6n6KMNTWNEqpUUDBwn3V4UccXjPJ`. New candidate: no promotion and no merge to main.

Other interfaces: JARVIS and NEURONAL already use shared `src/cerebroActivityApi.ts`; OPERATIVA overlay calls the **same** backend function. This proves code-path sharing, not yet physical cross-interface equality in deployed UI.
