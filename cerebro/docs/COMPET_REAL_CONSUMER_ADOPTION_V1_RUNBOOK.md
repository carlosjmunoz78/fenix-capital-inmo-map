# COMPET-NATIVE · Strict Real Consumer Adoption V1

## Estado
Candidate PREPROD. Mantener `PARCIAL` hasta exact-head CI, PR gobernada, merge, repetición automática verde en `main`, certificación y repetición post-certificación.

## Principio
La capa estricta es aditiva. No modifica `compet-native-v1.mjs`, el runtime competitivo continuo legado ni la matriz operacional de Lote 1+2. Demuestra uso semántico real de la salida de inteligencia competitiva; un `binding receipt` o `consumed:true` no cuenta como consumo.

## Producer chain
El vector determinista PREPROD reutiliza el runtime nativo para:
1. `BUILD_WATCH_PLAN`.
2. `RUN_CYCLE` sobre observaciones HTTPS deterministas de oferta, precio, SEO, campañas, expansión y posicionamiento.
3. `BUILD_DOSSIER`.
4. `REPLAY_VERIFY`.

CI no realiza escritura externa, no ejecuta código externo y no requiere proveedor de pago. El coste adicional objetivo y medido es 0 €.

## Consumo semántico requerido
- `RSH-001`: genera un paquete de evidencia investigable solo si hay volumen, procedencia, confianza y replay suficientes.
- `SEO-001`: incorpora gaps competitivos solo si existen cambios SEO + posicionamiento con evidencia suficiente.
- `MKT-001`: prepara una hipótesis de respuesta solo si cambian campañas + oferta + pricing.
- `EXPAND-001`: levanta watch de expansión solo cuando la evidencia muestra entrada real del competidor en el mercado objetivo.
- `INN-001`: genera hipótesis de innovación solo cuando aparecen señales reales de diferenciación de producto/posicionamiento y pricing.
- `LRN-001`: persiste `compet.consumer.outcome` de forma idempotente.
- `OBSERV-001`: persiste el outcome semántico correlacionado.
- `FINOPS-001`: demuestra coste adicional 0 €.

`EVA-001` actúa como Tribunal transversal y no sustituye a ninguno de los ocho consumidores exigidos.

## Fail-closed / mutation tests
Se muta de forma independiente:
- calidad de evidencia para `RSH-001`;
- confianza SEO para `SEO-001`;
- confianza de campañas para `MKT-001`;
- mercado objetivo de expansión para `EXPAND-001`;
- señal de diferenciación para `INN-001`.

Cada mutación debe cambiar el outcome downstream a `HOLD/NO_CHANGE` y bloquear `FULL_E2E_REAL_PREPROD`. También se prueba provenance tampering, ausencia de LRN, restart idempotente y rollback/rebuild.

## Persistencia y rebuild
La capa strict mantiene un estado semántico local PREPROD por consumidor. Antes de rebuild:
1. crea backup;
2. registra journal del producer bundle;
3. elimina el estado aplicado como rollback local;
4. reconstruye desde el journal;
5. exige hash idéntico al aplicado.

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
- `cerebro/runtime/compet-real-consumer-adoption-v1.mjs`
- `cerebro/tests/compet-real-consumer-adoption-v1.test.mjs`
- `cerebro/registry/compet-real-consumer-adoption-v1.json`
- `.github/workflows/cerebro-compet-full-e2e-real-v1.yml`
- este runbook.

El runtime `COMPET-NATIVE`, sus contratos, evidencia nativa y el runtime competitivo legado permanecen intactos.

## Promoción
1. strict branch CI verde;
2. PR exact-head con workflow strict + Governed Main + RSI verdes;
3. merge a `main`;
4. strict automático verde en `main`;
5. PR separada de certificación con SHA/run IDs observados;
6. nueva repetición automática verde post-certificación;
7. solo entonces marcar `COMPET-NATIVE = FULL_E2E_REAL_PREPROD`.

## Siguiente bloque
Después del cierre estricto y certificado:
`CAP-NATIVE_REAL_CONSUMER_ADOPTION_TO_FULL_E2E`.
