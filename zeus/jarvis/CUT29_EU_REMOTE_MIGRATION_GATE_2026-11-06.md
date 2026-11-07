# JARVIS CUT29 · Remote EU D1 schema operation · 2026-11-06

**ESTADO: PREPARADO, NO EJECUTADO EN D1 REMOTA.** PR #25 DRAFT; producción NO-GO.

## Verificado antes de intervenir
- GitHub HEAD de código: `77dd3e30a214ce86c28deade96e41129980f9ec9`.
- CI: 695/695 Node, B4, B7, integración gobernada y Wrangler local = SUCCESS.
- Workers Free; nueva D1 `cerebro-jarvis-lab-eu` UUID `988b11e1-21aa-4cf9-8b9d-110319df7ccc`, jurisdicción `eu` y replicación disabled, verificada en Opera.
- Antigua D1 `cerebro-jarvis-lab-cut21`, UUID `a859fde1-126b-4c40-bc0d-aec2f8839f7b` sin jurisdicción; PROTEGIDA. No tocar.
- En Cloudflare SQL Studio la nueva base muestra ausencia de recursos/tablas de usuario; el operador vuelve a verificar mediante consulta remota antes de escribir.
- GitHub Actions no tenía token D1 en secretos (comprobación de nombres, sin leer valores).

## Código de operación
`zeus/jarvis/cloudflare-lab/cut29-remote-eu-migrate.mjs` (Node 22, Wrangler v4.157.0).

Por defecto `node cut29-remote-eu-migrate.mjs --plan`: inspección de ficheros locales; 0 tokens, 0 llamadas remotas, 0 escrituras. En la CI de `42181351494` pasa el plan, además se prueba la denegación de `--apply` sin autorización.

El modo `--apply` requiere entorno `CLOUDFLARE_API_TOKEN` protegido, `JARVIS_CUT29_APPROVED=APPLY_EU_LAB_0001_0005` y directorio nuevo `JARVIS_CUT29_BACKUP_DIR`. Flujo: verifica metadatos Cloudflare `eu` y replicación disabled, inventario de tablas remotas vacío, export baseline, segunda consulta vacía, migraciones exactamente 0001–0005 en orden, verifica exactamente 7 tablas `jarvis_lab_*`, export final y hashes SHA256. **No se ha ejecutado este modo contra Cloudflare.** Cualquier duda detiene la ejecución, sin reintentos automáticos ni destrucción.

### Paso operativo único pendiente
Con navegador/terminal Work autentificado y token **D1 Edit de cuenta específica y expiración breve**, ejecutar una sola vez el modo protegido. Nunca mostrar token en chat/logs/archivos. Guardar las dos exportaciones SQL + hashes como artefactos duraderos y, si la capacidad Free lo permite, restaurar el export posterior en OTRA D1 EU aislada llamada `cerebro-jarvis-lab-eu-restore-cut29` y comprobar tablas/consistencia **en esa segunda base**. La restauración remota independiente no forma parte del script: requiere paso adicional de Work/operador. No crearla si existe, contiene datos o exige pago. No borrar bases al terminar; conservar evidencia.

### Intervenciones expresamente excluidas
No desplegar Worker, Gateway, Vault/OWNER_ROOT real, B3 grants, migraciones fuera de la nueva D1 EU ni introducir PII. No tocar App, CRM, PROD, main, DNS, ANA, Trading, SEO, Supabase ni Workers existentes. No promocionar automáticamente por CI en verde.

### Comprobaciones y rollback
Describir en el resultado el UUID y jurisdicción de ambas D1 (si se crea restauración), las siete tablas, las dos exportaciones con hashes y la prueba de lectura en destino independiente. Si falla, dejar D1 y backups como estén, documentar el bloqueo y NO borrar ni reintentar a ciegas. El flujo futuro OWNER_ROOT/B2/B3/Gateway/B10 sigue bloqueado hasta verificar restauración y seguridad.

Documentación oficial Cloudflare:
https://developers.cloudflare.com/d1/wrangler-commands/
https://developers.cloudflare.com/d1/best-practices/import-export-data/
https://developers.cloudflare.com/fundamentals/api/reference/permissions/


## Machine-readable state

```json
{
  "schema": "zeus.jarvis.superagent.live_state.v1",
  "date": "2026-11-06",
  "cut": "CUT29_PREPARED",
  "company_id": "fenix",
  "engine_id": "JARVIS",
  "environment": "LAB",
  "version": "CUT29",
  "pr": 25,
  "draft": true,
  "merged": false,
  "prod": "NO_GO",
  "head_code_certified": "77dd3e30a214ce86c28deade96e41129980f9ec9",
  "ci": {
    "universal": {
      "run_id": 42181351426,
      "status": "SUCCESS",
      "passes": 695,
      "failures": 0
    },
    "wrangler_offline": {
      "run_id": 42181351494,
      "status": "SUCCESS",
      "cut29_plan": "PASS",
      "cut29_apply_without_approval": "REJECTED_AS_EXPECTED"
    },
    "b4": {
      "run_id": 42181351643,
      "status": "SUCCESS"
    },
    "b7": {
      "run_id": 42181351490,
      "status": "SUCCESS"
    },
    "governed": {
      "run_id": 42181351485,
      "status": "SUCCESS",
      "prod_promotion": "NOT_RUN"
    }
  },
  "eu_d1": {
    "account_id": "e39a57e1ac42650ca5a6d5307cf0ac8e",
    "name": "cerebro-jarvis-lab-eu",
    "id": "988b11e1-21aa-4cf9-8b9d-110319df7ccc",
    "jurisdiction": "eu",
    "read_replication": "disabled",
    "current_user_tables": "0 (dashboard UI at observation)",
    "old_db_id": "a859fde1-126b-4c40-bc0d-aec2f8839f7b",
    "old_db_protected": true,
    "remote_migrations_applied": false,
    "backups_remote_exported": false,
    "independent_restore_remote": false
  },
  "done": [
    "Remote D1 CUT29 operator script in zeus/jarvis/cloudflare-lab/cut29-remote-eu-migrate.mjs",
    "Local plan checks fixed UUID, fail-closed SQL allowlist, OFF Worker, no public routes",
    "Remote apply requires explicit environment approval and protected Cloudflare token, performs preflight and backup before five ordered migrations, post-export",
    "No automatic retries or DROP; no real accounts, grants, data or Gateway deploy"
  ],
  "blocked": [
    "No scoped Cloudflare D1 Write token available in connected chat or GitHub secrets",
    "Opera connector read-only for Cloudflare forms and SQL Studio",
    "Independent remote restore is not implemented in the operator and still requires a separate EU D1 plus verified import"
  ],
  "next_block": "One ChatGPT Work mission: create short-lived scoped Cloudflare D1 Edit token securely, run CUT29 operator once, retain baseline/post-export outside runner, create at most one separate EU recovery D1 under Free quota, import exported schema and prove independent remote readback, revoke token; return sanitized evidence, no PROD writes.",
  "cost": "0 additional subscriptions (quota consumption to be measured)",
  "rollback": "PR remains DRAFT. If remote changes occur later, disable access, preserve exports, restore only to separately verified LAB. Never delete remote EU or OLD D1 automatically."
}
```
