# PROD deployment record — CEREBRO Operativa V1

Date: 2026-10-19
Application source merged in main: `2ace05aeab92525d88cfabc7b580fce81a6cfeab`
PR: #792
Scope: publish the reversible OPERATIVA facade for `/cerebro`, preserving V0 mounted as the authenticated functional core and immediate UI rollback.

Verified gates before promotion:
- CEREBRO Operativa V1 Gate: GREEN
- CEREBRO Session Context Regression Guard: GREEN
- CEREBRO Governed Main Integration V0: GREEN
- CEREBRO Continuous Human QA V0: GREEN
- App Restoration Build Gate: GREEN

Safety:
- no Supabase schema/function change
- no Gateway authority expansion
- no Trading access
- no fake progress metrics
- attachments remain fail-closed / POR AUDITAR
- V0 selector retained for operational rollback
- Git rollback baseline: `backup/cerebro-console-prod-0f061c7-20261019`
- additional cost: 0 €
