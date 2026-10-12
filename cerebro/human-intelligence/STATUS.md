# CEREBRO Human Intelligence V1 · Status

## Estado canónico actual

- Rama: `cerebro/human-intelligence-v1-20261012`
- Base OLD: `main@3b6b3f45fb3eea624b1834d0c592c6b6f6550e1e`
- PR: `#602`
- Stage: `READY FOR CONTROLLED INTEGRATION`
- Merge: `PENDING · requiere head exacto + gates GREEN`
- PROD: `CANARY DESPLEGADO, ADITIVO Y NO ENRUTADO`
- Tráfico real NEW en PROD: `NO`
- Trading: `AISLADO / NO ACCESO`
- Customer data en LAB/GOLDEN: `NO`
- Secrets en LAB/GOLDEN: `NO`
- Coste adicional del gate: `0 €`

## HECHO y demostrado

- 7 contratos lógicos Human Interaction V1 reutilizando owners canónicos; sin engine_id nuevo.
- Baseline OLD versionada.
- 60 situaciones canónicas × 4 variantes = 240 pares físicos OLD vs NEW.
- Synthetic Human Population reproducible por seed con cobertura procedimental.
- HumanProfile / private_state aislado de la vista del actor.
- Conversation Gym y métricas conversacionales.
- Hard gates fail-closed de TRUTH, AUTHORITY, CONTEXT, PERMISSION, ACTION, HUMAN_REQUIRED, PRIVACY, NO_HIDDEN_LEAK, ETHICS y TRACEABILITY.
- GOLDEN físico completo con 240 OLD verificados y 240 NEW verificados, sin actor errors ni ontology leaks.
- Tribunal Pareto OLD vs NEW ejecutado.
- Integración de evidencia con `LRN-001` / Universal Learning Ingress sin sistema paralelo.
- Promotion Controller PREPROD.
- Routing OLD/NEW PREPROD con estado persistente.
- Shadow canary y rollback NEW→OLD ensayados físicamente.
- Shared CEREBRO Gateway PREPROD ensayado.
- Continuous Human QA conectado al ciclo existente.
- Canary PROD `cerebro-console-gateway-human-v1-canary` desplegado de forma aditiva, sin sustituir `cerebro-console-gateway-v0`.
- Canary PROD probado sin escrituras de chat PROD y preservando semántica de acciones.
- Gates actuales del candidato: LAB, Promotion Readiness, PROD Canary, RSI Promotion Readiness Shadow, Governed Main Integration, Continuous Human QA, Session Context Regression Guard y App Restoration Build Gate en GREEN sobre el head previo verificado.

## Límites que se mantienen

- Integrar código en `main` NO equivale a activar NEW para usuarios.
- `prod_write_authorized=false` para la capa nueva mientras no exista promoción explícita posterior.
- OLD permanece como ruta y rollback.
- Ningún aprendizaje de LAB se promueve directamente a PROD.
- HUMAN_REQUIRED se limita a: `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.
- No big-bang.

## Próximo gate inmediato

1. Verificar CI GREEN sobre el head exacto que contiene este STATUS actualizado.
2. Integrar PR `#602` en `main` usando expected head SHA.
3. Ejecutar y comprobar gates post-merge sobre `main`.
4. Mantener el canary PROD sin tráfico real hasta completar la verificación post-merge.
5. Solo después, activar canary real mínimo y gradual con observabilidad y rollback automático a OLD ante regresión.

Pregunta de control permanente: **¿qué capacidad humana nueva puede demostrar CEREBRO con evidencia reproducible sin degradar verdad, seguridad, permisos, coste o autonomía?**
