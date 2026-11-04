# ZEUS/JARVIS · CHANGELOG · B5 Corte 03 · 2026-11-04

## ADDED
- GuardedPreview B5: verificación SERVER de identidad B2, control, grant B3, auditoría mínima y diálogo sin side effects.
- E2E LAB con módulos B5 reales: texto/voz, órdenes de riesgo, cancelación local y confirmación bloqueada.
- B6 Capability Preflight: plan sin ejecución, contrato cero coste, aislamiento multiempresa, orden API→MCP→CLI→Browser.
- B9 Resilience Decision: anti-loop a tres fallos, fallos AUTH no reintentables, excepciones HUMAN_REQUIRED y cero gasto.

## FIXED
- Model Router B5 rechaza falsos proveedores LOCALES con coste marginal >0.
- DeepSeek: evidencia de saldo debe tener fecha vigente (máximo 15 minutos), company_id y environment correctos.
- Lectura de ledger con company_id/environment contradictorios denegada.

## VERIFIED
- Último SHA de código: `8725eff93c159693116b506330e02e7721ef7b32`.
- LAB GitHub Actions `41743864577` 229 PASS, 0 FAIL.
- Governed Integration `41743864470` SUCCESS, sin instalación real.
- B3/B4 lectura PROD: enabled=false, kill_switch=true, memoria B4=0.
- No DeepSeek ni proveedores de voz reales llamados; 0 suscripciones nuevas.

## NO GO
B5, B6, B9 siguen SIN capacidad PROD operativa. Mantener PR 13–15 DRAFT; no merge a main. No sobreescribir `src/cerebroVoice.ts` ni PR #12. No escribir datos sintéticos en PROD. 
Documentación de gates: `B5_CORTE_03_REMOTE_INCREMENT_2026-11-04.md`.
Siguiente paso: gates B2/B3/B4 y E2E de audio/budget/Gateway verificados, con hardware humano exclusivamente cuando sea imprescindible.


## B4 supplementary lab proof
- **HECHO LAB:** PostgreSQL 17 real server with synthetic dataset, concurrent unique index races, isolation between tenants, physical `pg_dump`/`pg_restore`, index rollback and post-restore data verification.
- GitHub CI run `41745013028` SUCCESS (PostgreSQL 17 major aligned with PROD 17.6).
- First run `41744899156` failed from PG16 server/newer CLI `transaction_timeout` mismatch; corrected version, no weakening or deletion of tests.
- **B4 PROD STILL NO-GO:** no PROD backup or restore was performed; candidate indexes remain UNAPPLIED. B3/B4 flags OFF.
