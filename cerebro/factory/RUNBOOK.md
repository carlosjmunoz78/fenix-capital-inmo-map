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

## Gate estructural previo a fabricación por familias · 08/09/2026
- Cloudflare NON-PROD está reconciliado y #127 cerrado con evidencia, OLD vs NEW y rollback.
- FACT-001 puede generar y registrar scaffolds **inertes en PREPROD** por familias/dependencias. Generar un scaffold no equivale a activar un motor ni a conceder autonomía.
- #124 Branch Protection continúa `HIGH_RISK`: no modificar reglas sin snapshot. Acción externa mínima: autorizar GitHub admin REST en Make; después aplicar snapshot → protección mínima → prueba → rollback.
- #126 Trading LAB continúa `HIGH_RISK`: no usar documentación histórica como health actual y nunca ejecutar capital real como prueba. Acción externa mínima: acceso read-only Compute/VM o endpoint/log de health ya existente. `REAL_AUTHORIZED=false` / `BLOCK_REAL` permanece.
- #133 Cloudflare secret rotation es `SECURITY_INCIDENT`: no copiar valores sensibles y no rotar a ciegas hasta conocer consumidores/ownership. La incidencia bloquea mutaciones PROD sensibles, no scaffolding inerte PREPROD.
- Mientras cualquiera de esos gates aplicables siga abierto, la autonomía PROD global permanece `DENY`.

## Cloudflare · reconciliación y rollback
- Workers: snapshot antes de tocar triggers; NON-PROD puede retirarse sólo si `main` queda intacto y se vuelve a leer el control-plane. Rollback: recrear exclusivamente el trigger NON-PROD desde el snapshot.
- Pages: cambio validado `preview_deployment_setting: all → none`; `production_branch=main` y `production_deployments_enabled=true` deben permanecer inalterados. Rollback: PATCH mínimo `none → all`.
- No corregir la configuración build legacy de Pages sólo por limpieza: cualquier cambio que pueda afectar `main` requiere ownership/callers, snapshot, PREPROD y rollback propios.
- Make scenario 9773361 se usa sólo on-demand y se desactiva al terminar; no polling.

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
