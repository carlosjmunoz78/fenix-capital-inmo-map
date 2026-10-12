# CEREBRO Human Intelligence V1 · Status

## Estado canónico actual

- Integración: `HECHA`
- PR integrado: `#602`
- Commit de integración en `main`: `5af0886be8a92c53ff527a02e4bbe9ea9897f8a2`
- Stage: `MAIN INTEGRATED · PROD CANARY UNROUTED`
- PROD: `CANARY DESPLEGADO, ADITIVO Y NO ENRUTADO`
- Tráfico real NEW en PROD: `NO`
- Gateway PROD autoritativo actual: `cerebro-console-gateway-v0`
- Canary PROD: `cerebro-console-gateway-human-v1-canary`
- OLD: `DISPONIBLE COMO RUTA Y ROLLBACK`
- Trading: `AISLADO / NO ACCESO`
- Customer data en LAB/GOLDEN: `NO`
- Secrets en LAB/GOLDEN: `NO`
- Coste adicional demostrado del gate: `0 €`

## HECHO y demostrado

- 7 contratos lógicos Human Interaction V1 reutilizando owners canónicos; sin engine_id nuevo.
- Baseline OLD versionada.
- 60 situaciones canónicas × 4 variantes = 240 pares físicos OLD vs NEW.
- Synthetic Human Population reproducible por seed con cobertura procedimental.
- HumanProfile / private_state aislado de la vista del actor.
- Conversation Gym y métricas conversacionales.
- Hard gates fail-closed de TRUTH, AUTHORITY, CONTEXT, PERMISSION, ACTION, HUMAN_REQUIRED, PRIVACY, NO_HIDDEN_LEAK, ETHICS y TRACEABILITY.
- GOLDEN físico completo con 240 OLD verificados y 240 NEW verificados, sin actor errors ni ontology leaks.
- Tribunal Pareto OLD vs NEW ejecutado con candidato apto para integración controlada.
- Integración de evidencia con `LRN-001` / Universal Learning Ingress sin sistema paralelo.
- Promotion Controller PREPROD.
- Routing OLD/NEW PREPROD con estado persistente y transición versionada/idempotente.
- Shadow canary y rollback NEW→OLD ensayados físicamente.
- Shared CEREBRO Gateway PREPROD ensayado.
- Continuous Human QA conectado al ciclo existente.
- Canary PROD `cerebro-console-gateway-human-v1-canary` desplegado de forma aditiva, sin sustituir `cerebro-console-gateway-v0`.
- Canary PROD probado sin escrituras de chat PROD y preservando semántica de acciones.
- PR #602 integrado mediante expected head SHA después de 8/8 gates GREEN sobre el head exacto.
- Verificación post-merge en `main`: `PROD Runtime Smoke`, `Session Context Regression Guard`, `Continuous Human QA`, `RSI Real Domain Evidence Wiring`, `QA Source Mapping`, `Owner Executor Capability Audit` y `AUTO-001 PREPROD Patch Executor` en GREEN.
- `PROD Live Deploy` quedó `SKIPPED`, por lo que la integración no realizó un despliegue live automático ni activó tráfico NEW.

## Límites que se mantienen

- Estar integrado en `main` NO equivale a activar NEW para usuarios.
- `prod_write_authorized=false` para la capa nueva mientras no exista promoción explícita posterior.
- OLD permanece como ruta y rollback.
- Ningún aprendizaje de LAB se promueve directamente a PROD.
- No se modifica la semántica de acciones operativas del Gateway actual.
- HUMAN_REQUIRED se limita a: `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.
- No big-bang.

## Próximo gate inmediato

1. Inventariar el punto real de routing de `cerebro-console-gateway-v0` en PROD y sus consumidores.
2. Confirmar que existe o construir de forma aditiva un controlador PROD fail-closed con selección estable por sesión/usuario, porcentaje configurable, observabilidad y rollback inmediato a OLD.
3. Crear el controlador inicialmente con `canary_percent=0`; probarlo sin tráfico real.
4. Ejecutar PREPROD/PROD no-write gates y comparar OLD vs NEW.
5. Solo si todo permanece GREEN, habilitar un canary real mínimo y gradual; cualquier regresión debe volver automáticamente a OLD.
6. No escalar porcentaje sin evidencia reproducible de calidad, seguridad, permisos, latencia y compatibilidad.

Pregunta de control permanente: **¿qué capacidad humana nueva puede demostrar CEREBRO con evidencia reproducible sin degradar verdad, seguridad, permisos, coste o autonomía?**
