# FACT001 CF headless Workers one-shot LAB

Isolated Supabase Edge and exact GitHub OIDC workflow. Short-lived child token with Workers Scripts Write derived solely within Vault; disposable Worker V1->V2->rollback->delete->rebuild->delete. Child revoked after verification. Persistent Vault claim prevents silent duplicate execution. Mutations restricted to literal disposable Worker, 0 public routes, schedules or bindings. Existing services and PROD untouched. Submit order file only after deploy. This is a headless physical test, not a generic autonomous provider queue.
