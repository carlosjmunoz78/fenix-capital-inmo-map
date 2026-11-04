# B9 · Runbook de verificación, fallo, rollback y rebuild · 2026-11-04
**Entorno:** LAB only, PR #19 DRAFT base PR #18 B8 DRAFT. Conserva PR #17/#16/main.
1. Verificar SHA de PR19, base B8, permisos, 179 Engine Registry y B3/B4 PROD OFF/kills ON.
2. Checkout aislado: `node --test zeus/jarvis/core/*.test.mjs` con Node 24. HEAD código `e59c13d0151a52fe27d65f301cb12a606cf4961c`: 462/462 PASS, CI 41794601700. Si docs cambian, repetir CI, sin inferir verde por PR.
3. B9 sólo produce `LAB_RECOVERY_CANDIDATE_VERIFIED`; nunca RETRY, MUTATION, dinero, asignación de permisos o promoción.
4. Revalidar identidad real, B3, snapshot/holdout independientes y Supervisor antes de cualquier integración; no confiar en `verified:true` inventado por un cliente.
5. B9 journal usa contrato B6 y SHA256 del resultado. Si `IN_PROGRESS` o commit ambiguo, detener sin repetir: comprobar prueba externa y commit final antes de cualquier reconciliación.
6. Si aparece el mismo fallo 3 veces, STOP el enfoque y revisar capa causal. No debilitar tests ni el tribunal.
7. Fallo de auditoría, fuente, juez o política = DENY/STOP. Si B3 se revoca, mantener kill switch y bloquear nuevos trabajos; el aborto físico in-flight no está certificado.
8. Archivo temporal: test `jarvis-b9-rollback-lab.test.mjs` restaura bytes idénticos desde backup validado por hash y compila; no extrapolarlo a restaurar App/CRM/Supabase.
9. Ensayo B9 PG17: `gates/b9-cut02-pg17-recovery-lab.mjs` está PREPARADO pero **no ejecutado** por bloqueo de creación de workflow. No marcar RESTORE_GREEN de B9 PG17.
10. **Rollback de código B9:** cerrar/revertir exclusivamente PR19. No fusionar, no revertir PR18/17/16, no force-push ni tocar `main`.
11. **Rebuild:** rehacer checkout de `cerebro/jarvis-b9-resilience-adversarial-v0-20261104` desde último HEAD validado; instalar Node version actual de CI y ejecutar suite + revisión manual de gates. Cualquier integración PostgreSQL posterior debe aislarse de PROD.
12. **Promoción** solo después de B2/B3 reales, IAM/tenant, SUP/P23/JDG, pruebas adversarias, backup/restore real, PREPROD, comparación OLD vs NEW, costes medidos, observabilidad y autorización requerida. Ningún módulo de B9 puede autocertificarse.
