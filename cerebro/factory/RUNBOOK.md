# FACT-001 · Runbook V0

## Validación local
`python cerebro/factory/scripts/validate_manifest.py`

`python -m unittest discover -s cerebro/factory/tests -p 'test_*.py' -v`

## Alta de un motor
1. Copiar el patrón de `examples/FACT-001.engine.json`.
2. Asignar `engine_id` único.
3. Declarar `company_scope`, `company_id`, `environment`, `version` y `contract_version`.
4. Declarar inputs/outputs, contratos, permisos, políticas, eventos, tests, evaluación y observabilidad.
5. Declarar coste objetivo 0 €, backup, rollback y rebuild.
6. Declarar dependencias/dependientes y excepciones humanas.
7. Registrar el manifest en `registry/engine-registry.json`.
8. Ejecutar validador y tests.
9. No conectar a PROD hasta superar contrato, dependencia, backup, PREPROD, evaluación, rollback y promoción gradual.

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

## Rollback de esta V0
Mientras permanezca sin merge: cerrar PR y eliminar la rama aislada. Ningún artefacto de esta V0 es necesario para que la App actual funcione.