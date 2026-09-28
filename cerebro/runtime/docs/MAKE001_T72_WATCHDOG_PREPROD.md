# MAKE-001 · T-72 watchdog PREPROD bridge

Status: PARALLEL IMPLEMENTATION / NOT CUT OVER

Deployed PREPROD Edge Function:
`cerebro-notion-t72-watchdog-preprod`

Purpose: replace Make scenario 9705138 without changing its business rule.

Safety:
- PREPROD only.
- custom CEREBRO host secret required;
- unauthenticated POST verified HTTP 401;
- defaults to `dry_run=true`;
- live writes only when caller explicitly sends `{"dry_run":false}`;
- only queries Notion Publicación Editorial data source;
- only updates `Recordatorio T-72 enviado` and `Aviso T-72`;
- no AI/model call;
- no production publish action.

Current state:
- function ACTIVE v1;
- auth failure path tested;
- authorized dry-run still pending from Hostinger because the plaintext host secret is not
  stored in Supabase/Vault and must not be copied into SQL/logs;
- Make scenario 9705138 remains ACTIVE until authorized dry-run + OLD-vs-NEW parity.

Cut-over procedure:
1. Hostinger calls function with existing local CEREBRO secret and dry_run=true.
2. Compare candidates/due decisions against Make execution.
3. Run one controlled live invocation only if a due row exists or use no-op evidence.
4. Disable Make scenario 9705138, do not delete.
5. Add bounded Hostinger timer using same cadence initially.
6. Observe 24h; rollback = reactivate Make scenario.
7. Later replace timer with Notion webhook/event where time-window semantics allow.

Cost target:
remove ~2 Make credits/hour (~1,440 credits/30d) while adding only ~720 PREPROD Edge
invocations/month at hourly cadence, currently well inside the existing Supabase allowance.
No additional subscription required.
