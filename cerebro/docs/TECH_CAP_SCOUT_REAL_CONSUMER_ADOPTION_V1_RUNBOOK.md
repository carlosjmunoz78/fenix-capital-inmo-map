# TECH-CAP-SCOUT-NATIVE · Strict Real Consumer Adoption V1

## Estado
Candidate PREPROD. Mantener `PARCIAL` hasta exact-head CI, PR gobernada, merge y repetición automática verde en `main`.

## Principio
La capa estricta es aditiva. No modifica `technology-capability-scout-native-v1.mjs`, su contrato ni el perfil RSH existente. Demuestra uso semántico posterior al dossier; un recibo de binding no cuenta como consumo.

## Producer chain
El vector determinista PREPROD reutiliza el runtime native para:
1. `PLAN_ACQUISITION`.
2. `INGEST_EVIDENCE` de evidencia pública versionada.
3. `SCORE_CANDIDATE` con coste 0.
4. `BUILD_DOSSIER` separando fuente e interpretación.
5. `REPLAY_VERIFY`.

CI no descarga ni ejecuta código externo. La referencia pública usada como fixture es `github:D4Vinci/Scrapling`; no se afirma una adquisición live durante este gate.

## Consumo semántico requerido
- `SCAN-001`: incorpora candidato a descubrimiento de huella digital solo si existe semántica de public-web discovery.
- `WEB-001`: habilita input PREPROD de auditoría web solo con DOM extraction + website audit input.
- `INN-001`: prioriza backlog únicamente con shortlist, score suficiente, innovation fit y reversibilidad alta.
- `COMPET-001`: habilita input de inteligencia competitiva pública solo con el caso de uso correspondiente.
- `SEO-001`: habilita evidencia técnica SEO solo con DOM extraction + uso técnico SEO + replay verde.
- `MKT-001`: habilita inteligencia de landing/campaña solo con evidencia pública y caso de uso explícito.
- `ROUTE-001`: genera ruta de adopción PREPROD solo para el conjunto exacto de destinos, coste 0, dossier verificable y shortlist.
- `LRN-001`: persiste `tech.scout.consumer.outcome` de forma idempotente.
- `OBSERV-001`: persiste outcome semántico correlacionado.
- `FINOPS-001`: demuestra coste adicional 0 €.

## Fail-closed / tests adversariales
Se muta de forma independiente la semántica necesaria para SCAN, WEB, INN, COMPET, SEO, MKT y ROUTE. Cada mutación debe cambiar su decisión downstream a HOLD/NO_CHANGE y bloquear FULL. También se prueba provenance tampering, LRN ausente, restart idempotente y rollback/rebuild.

## Persistencia y rebuild
La capa strict mantiene estado semántico local PREPROD por consumidor. Antes del rebuild crea backup, borra el estado aplicado como rollback local y reconstruye desde un journal del producer bundle. El hash reconstruido debe coincidir exactamente con el aplicado.

## Autoridad
- PREPROD únicamente.
- PROD y PROD write: OFF.
- DB/CRM/provider writes: OFF.
- Spend: OFF.
- Trading: OFF.
- Android: untouched.
- External code execution: OFF.
- Coste adicional: 0 €.

## Rollback de implementación
Retirar únicamente:
- `cerebro/runtime/technology-capability-scout-real-consumer-adoption-v1.mjs`
- `cerebro/tests/technology-capability-scout-real-consumer-adoption-v1.test.mjs`
- `cerebro/registry/technology-capability-scout-real-consumer-adoption-v1.json`
- `.github/workflows/cerebro-tech-scout-full-e2e-real-v1.yml`
- este runbook.

El runtime native y los contratos RSH existentes permanecen intactos.

## Promoción
1. exact-head strict CI verde;
2. PR con strict/Governed Main/RSI verdes;
3. merge a `main`;
4. strict automático verde en `main`;
5. PR separada de certificación con SHA/run IDs observados;
6. nueva repetición automática verde tras certificar.
