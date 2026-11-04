# B10 · CUT03 runbook de lectura, reconciliación y seguridad
1. No alterar B3/B4 PROD (actual: ambos OFF + kill ON) sin autorización de promoción independiente.
2. Verificar desde GitHub PR20 DRAFT sobre PR19, y SHA `e7ebb25a7f83ace1557ba67123dd161fdf198be2`. Revisar main `3f06b8...` y no fusionar.
3. Repetir únicamente lecturas de Supabase control-plane y consultas agregadas; no consumir ni publicar tokens de usuario.
4. Una función `ACTIVE` acredita despliegue, no health ni E2E. No contar `ACTIVE` como `PROD_OPERATION_VERIFIED`.
5. `node --test zeus/jarvis/core/*.test.mjs` (Node 24), CI run 41799171359 508 PASS. Tests B10 CUT03 usan fixtures; datos reales están registrados **separados** como REAL_EXTERNAL_READ.
6. Usar `reconcileJarvisB10ReadonlyObservations` para clasificar inventario, NO para emitir permisos. El resultado siempre NO_GO.
7. Si App no es accesible desde este entorno, anotar `NOT_VERIFIED`, no reintentar indefinidamente y no asumir error en producción.
8. Para Gate B2 física: dos dispositivos autentificados, mismo OWNER_ROOT, evidencia de misión compartida, reinicio y no duplicación; el auditor independiente debe verificar resultados y políticas.
9. Confirmar evidencias de 7 fases B10 en orden, incluso B8/B9 real: ninguna etapa salta precondiciones.
10. Rollback B10 = cerrar PR20 DRAFT y preservar documentación. No cambios DB, por lo que no corresponde migración ni rollback de Supabase.
