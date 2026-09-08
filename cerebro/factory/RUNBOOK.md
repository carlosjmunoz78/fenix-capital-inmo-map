# FACT-001 · Runbook V0

## Validación local
`python cerebro/factory/scripts/validate_manifest.py`

`python -m unittest discover -s cerebro/factory/tests -p 'test_*.py' -v`

## Alta de un motor
1. Copiar el patrón de `examples/FACT-001.engine.json` o usar FACT-001 para generar un scaffold inerte.
2. Asignar `engine_id` único.
3. Declarar `company_scope`, `company_id`, `environment`, `version` y `contract_version`.
4. Declarar inputs/outputs, contratos, permisos, políticas, eventos, tests, evaluación y observabilidad.
5. Declarar coste objetivo 0 €, backup, rollback y rebuild.
6. Declarar dependencias/dependientes y excepciones humanas.
7. Registrar el manifest en `registry/engine-registry.json`.
8. Ejecutar validador y tests.
9. No conectar a PROD hasta superar contrato, dependencia, backup, PREPROD, evaluación, rollback y promoción gradual.

## Alta de una familia · FACT-001 V0.3
Especificación canónica JSON: `families/<family>.json`.

Preflight sin escritura:
`python cerebro/factory/scripts/factory.py family --file cerebro/factory/families/wave1-multicompany-console-v0.json --plan --require-known-dependencies`

Generación local/aditiva:
`python cerebro/factory/scripts/factory.py family --file cerebro/factory/families/wave1-multicompany-console-v0.json --require-known-dependencies`

Reglas del modo `family`:
- valida todos los `engine_id` antes de escribir;
- rechaza IDs duplicados dentro de la familia;
- puede exigir que toda dependencia esté en la propia familia o en Engine Registry;
- preflight de conflictos para toda la familia antes de escribir el primer scaffold;
- si existe un motor con definición no idéntica, devuelve `CONFLICT` y no crea los motores nuevos del lote;
- una segunda ejecución idéntica es `NO_CHANGE`;
- escribe únicamente `generated/<engine_id>/...` y Engine Registry; no despliega, no llama a PROD y no cambia permisos/infraestructura;
- cada motor nace `DEFINED_NOT_BUILT`, `NONE_UNTIL_GATES_PASS`, coste adicional objetivo 0 € y promoción PROD `DENY` por defecto.

Wave 1 canónica: `WAVE1-MULTICOMPANY-CONSOLE-V0`, 29 motores materializados en PREPROD. Incluye onboarding multiempresa, discovery/audit, competencia/market intelligence, knowledge, SEO/social/marketing bootstrap, CRM/App/Automation/Training bootstrap, tenant isolation, supervisor/backup/deployment y Gateway/Console V0. Motores existentes como APP-001, CRM-001, SEO-001, WEB-001, TRN-001, POL-001, HEX-001, EVT-001, JOB-001, AUD-001 y OBSERV-001 se referencian como dependencias y **no se duplican**.

Estado post-materialización:
- Engine Registry `0.5.0`: 46 motores = 17 existentes + 29 Wave 1.
- Duplicados: 0.
- Cada Wave 1: 18 archivos, `DEFINED_NOT_BUILT`, `PREPROD`, `NONE_UNTIL_GATES_PASS`.
- Replan idéntico: `NO_CHANGE` para los 29 motores.
- Evidencia: `governance/wave1-materialization-2026-09-08.json`.
- La materialización no equivale a implementación ni a autonomía.

## Evolución versionada de un motor · FACT-001 V0.4
No editar ni sobrescribir `generated/<engine_id>/...` para implementar un motor materializado. Ese árbol es el scaffold inmutable producido por Factory y debe seguir reproduciendo `NO_CHANGE`.

Preflight de una nueva versión:
`python cerebro/factory/scripts/version_engine.py apply --engine-id COMP-REG-001 --manifest-file /ruta/candidate.json --plan`

Aplicación local/Git-only:
`python cerebro/factory/scripts/version_engine.py apply --engine-id COMP-REG-001 --manifest-file /ruta/candidate.json`

Rollback de Registry a una versión ya existente:
`python cerebro/factory/scripts/version_engine.py rollback --engine-id COMP-REG-001 --to-version 0.1.0 --plan`

`python cerebro/factory/scripts/version_engine.py rollback --engine-id COMP-REG-001 --to-version 0.1.0`

Reglas V0.4:
- el scaffold generado se preserva byte-a-byte;
- una evolución vive en `versions/<engine_id>/<version>/engine.manifest.json`;
- `apply` exige semver estrictamente superior a la versión activa en Registry;
- candidato y Registry deben conservar el mismo `engine_id`;
- coste adicional objetivo debe seguir siendo 0 €;
- backup, rollback y rebuild deben estar declarados;
- V0.4 rechaza `environment=PROD` de forma determinista;
- el Registry mueve su puntero a la versión aplicada y mantiene `version_history` para auditoría;
- rollback cambia el puntero, no borra la versión posterior;
- después de versionar, el `factory.py create/family` original debe continuar devolviendo `NO_CHANGE` para el scaffold base;
- una versión marcada `CONFIRMED_OPERATIONAL` sólo se integra al branch canónico después de tests/evaluación/PREPROD verdes; escribir el manifest en una rama no equivale a promoción.

Rollback del versionador:
1. comprobar que el target existe en `generated/` o `versions/`;
2. ejecutar primero `rollback --plan`;
3. comprobar OLD vs NEW del puntero Registry;
4. aplicar rollback;
5. ejecutar `validate_manifest.py`, unit tests y App Compatibility;
6. no borrar la versión que se abandona hasta que exista política de retención específica.

## Gate estructural previo a fabricación por familias · 08/09/2026
- Cloudflare NON-PROD está reconciliado y #127 cerrado con evidencia, OLD vs NEW y rollback.
- FACT-001 puede generar y registrar scaffolds **inertes en PREPROD** por familias/dependencias. Generar un scaffold no equivale a activar un motor ni a conceder autonomía.
- #124 Branch Protection continúa `HIGH_RISK`: no modificar reglas sin snapshot. Acción externa mínima: autorizar una vía GitHub admin; después aplicar snapshot → protección mínima → prueba → rollback.
- #126 Trading LAB continúa `HIGH_RISK`: no usar documentación histórica como health actual y nunca ejecutar capital real como prueba. Acción externa mínima: acceso read-only Compute/VM o endpoint/log de health ya existente. `REAL_AUTHORIZED=false` / `BLOCK_REAL` permanece.
- #133 Cloudflare secret rotation es `SECURITY_INCIDENT`: no copiar valores sensibles y no rotar a ciegas hasta conocer consumidores/ownership. La incidencia bloquea mutaciones PROD sensibles, no scaffolding inerte PREPROD.
- Mientras cualquiera de esos gates aplicables siga abierto, la autonomía PROD global permanece `DENY`.

## Cloudflare · vía canónica de la web a coste 0 €
La vía operativa normal para caché Cloudflare de `fenixcapital.es` es **Fénix Core Guard → API directa de Cloudflare**. Make no es una dependencia operativa de este flujo.

Auditoría live read-only confirmada:
- plugin `Fénix Core Guard 1.0.0-rc9-prod2`;
- companions `cache-orchestrator`, `integrations` e `integrations-bridge` cargados;
- capas: Elementor → WordPress → Hostinger → Cloudflare → warmup → verify;
- purge URL-first; global/hostname sólo cuando el plan se clasifica global;
- lock de concurrencia y gates antes de operar;
- UI propia `Tools → Fénix Guard · Cloudflare` para credenciales/test en entornos permitidos;
- el token no se vuelve a mostrar después de guardarlo;
- prueba de token separada del purge;
- coste adicional objetivo: 0 €.

Estado PROD actual: `observer`, health 100, `operations_gate=false`, `operational_writes_allowed=false`, Cloudflare `available=false`; no activar ni inyectar credenciales en PROD sólo para dejarlo “verde”.

Orden operativo Cloudflare:
1. Fénix Core Guard / plugin propio;
2. API directa existente;
3. herramientas locales/open-source existentes;
4. Make únicamente como diagnóstico/reconciliación excepcional y temporal si no existe otra vía segura.

## Cloudflare · reconciliación y rollback
- Workers: snapshot antes de tocar triggers; NON-PROD puede retirarse sólo si `main` queda intacto y se vuelve a leer el control-plane. Rollback: recrear exclusivamente el trigger NON-PROD desde el snapshot.
- Pages: cambio validado `preview_deployment_setting: all → none`; `production_branch=main` y `production_deployments_enabled=true` deben permanecer inalterados. Rollback: PATCH mínimo `none → all`.
- No corregir la configuración build legacy de Pages sólo por limpieza: cualquier cambio que pueda afectar `main` requiere ownership/callers, snapshot, PREPROD y rollback propios.
- La intervención Make TEMP 9773361 de reconciliación fue excepcional, on-demand y quedó desactivada; no polling y no convertirla en runtime canónico.
- El secreto Pages de #133 no está demostrado como credencial de Core Guard. Identificar caller/ownership antes de rotación.

## Prevención de duplicados
- `engine_id` es único en Registry.
- Una empresa no crea forks de código: usa `company_id` y configuración.
- Antes de crear endpoint, tabla, función, worker o repositorio nuevo, buscar capacidad equivalente existente.
- Si existe capacidad equivalente, envolver/reutilizar antes que duplicar.
- Repositorio nuevo solo cuando exista una frontera técnica, de seguridad o de ciclo de vida que lo justifique.

## Saturación
Antes de añadir infraestructura:
1. medir consumo;
2. localizar caller/job;
3. reducir polling/consultas;
4. cache/eventos/batch;
5. descargar cargas pesadas del core transaccional;
6. usar runtime compartido/local/open-source;
7. escalar infraestructura solo si lo anterior no basta.

## Rollback de cambios Factory/Governance
- Todo cambio nuevo entra por rama aislada y PR contra PREPROD.
- Si CI/compatibilidad falla: no merge; corregir o cerrar PR.
- Si un merge governance-only rompe PREPROD, revertir el commit/PR exacto y verificar el pipeline sobre el SHA restaurado.
- Ningún scaffold generado es requisito para que App/CRM/Web/Social actuales sigan funcionando; deben permanecer aditivos hasta promoción explícita.
