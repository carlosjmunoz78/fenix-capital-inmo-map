# COMPET-001 V0 · Runbook PREPROD

`COMPET-001` V0.2 ejecuta inteligencia competitiva determinista únicamente sobre evidencia pública explícita. No descubre ni inventa competidores por inferencia silenciosa.

## Contrato operativo
1. Requiere `company_id`, `KW-001`, `LOCALP-001`, `SCAN-001`, `SOCAUD-001`, `WAUD-001` y `evidence_at`.
2. `public_competitor_evidence` es opcional; si no existe evidencia suficiente, devuelve `LOW_CONFIDENCE` y no crea perfiles ficticios.
3. `market_share`, `revenue`, `headcount`, `traffic`, `ad_spend`, `search_rank`, `followers` y `review_metrics` permanecen `unknown_without_public_evidence` salvo evidencia pública explícita admitida por contrato.
4. Cualquier cruce de `company_id` se deniega con `POLICY_CONFLICT`; material de credenciales/secretos se rechaza como `SECURITY_INCIDENT`.
5. `environment=PROD` está bloqueado. V0 no usa login, credenciales, APIs privadas, bypass de scraping ni escrituras remotas.
6. Coste adicional objetivo 0 €: Python stdlib + runtime compartido existente; no requiere servidor nuevo ni IA de pago.
7. La relación con `COMP-ONB-001` es de orquestación explícita; COMPET no autoejecuta downstream ni concede autonomía.

## Backup
Git + scaffold FACT-001 inmutable + manifest versionado + evidencia pública reproducible.

## Rebuild
Checkout Git → validar Registry/manifest → cargar runtime compartido → replay de evidencia pública normalizada → ejecutar tests y gates.

## Rollback
1. `python cerebro/factory/scripts/version_engine.py rollback --engine-id COMPET-001 --to-version 0.1.0 --plan`
2. Revisar OLD vs NEW del puntero Registry.
3. Aplicar rollback sólo en PREPROD.
4. Ejecutar manifest validation, Factory tests, runtime tests y App Compatibility.
5. Verificar PREPROD exacto sobre el SHA restaurado.

## Autonomía
`PREPROD_DETERMINISTIC_PUBLIC_READ_ONLY_COMPETITOR_INTELLIGENCE`; PROD = `DENY`.
