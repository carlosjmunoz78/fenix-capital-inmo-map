# CEREBRO OS · Runbook · Channel Intelligence V1

## Alcance

Runbook operativo para `CHANNEL-INTELLIGENCE-V1` en PREPROD. No autoriza publicación, gasto, instalación de herramientas, binding de proveedor ni escritura en WordPress PROD.

## Precondiciones

1. `company_id` válido y aislado.
2. Entorno exacto `PREPROD`.
3. Evidencia `WAUD-001`, `SOCAUD-001` y `SOCBOOT-001` de la misma empresa cuando se use el adapter multiempresa.
4. Evidencia upstream sin `HUMAN_REQUIRED`.
5. `additional_cost_eur=0` en upstream.
6. No usar secretos, PII cruda ni credenciales en payloads.
7. La migración STAGING→PROD de Fénix Capital se mantiene separada.

## Camino A · Reutilizar resultados existentes

Usar `adaptExistingSocialWebBootstrap` cuando ya existen resultados verificados de:

- `WAUD-001`
- `SOCAUD-001`
- `SOCBOOT-001`

Resultado esperado:

- un `WEB_OPERATING_PROFILE` lógico;
- un `CHANNEL_POD_PROFILE` por red observada/solicitada;
- señales de tendencia evaluadas de forma determinista;
- candidatos para `LAB-MKT/EXP-001` cuando proceda;
- cero efectos externos.

## Camino B · Desde SCAN-001 existente

Usar `buildChannelIntelligenceFromExistingScan` únicamente con un `scan_result` ya perteneciente a la misma empresa. El adapter reutiliza las implementaciones existentes `auditWebsite`, `auditSocial` y `bootstrapSocial`.

No sustituir el pipeline multiempresa canónico por este helper. Este camino es de integración/evaluación PREPROD.

## Tendencias

Cada señal debe contener scores observables/versionados de 0..100 para:

- momentum
- acceleration
- audience_fit
- brand_fit
- commercial_intent
- search_demand
- competitor_gap
- geographic_relevance
- cross_platform_diffusion
- saturation
- risk
- cost

Estados:

`SEED -> EMERGING -> BREAKOUT -> MAINSTREAM -> SATURATED -> DECLINING`

Una señal solo pasa a candidato prioritario de laboratorio cuando el score y el estado lo justifican. `PRIORITIZE_LAB_EXPERIMENT` significa probar; nunca publicar directamente.

## Nueva red

Usar `planNewChannelBootstrap` para obtener un plan PREPROD:

`RESEARCH -> TERMS_API_POLICY -> FORMATS -> METRICS -> AUDIENCE -> COMPETITION -> TRENDS -> CHANNEL_MANIFEST -> FACTORY_SCAFFOLD -> ADAPTERS -> TEMPLATES -> LAB -> PREPROD -> E2E -> GOVERNED_PROMOTION`

No crear `engine_id` nuevo por defecto. Un nuevo ID exige auditoría de gap y decisión canónica separada.

## Fallos / HUMAN_REQUIRED

- `LOW_CONFIDENCE`: upstream incompleto o confianza < umbral.
- `SECURITY_INCIDENT`: cruce de empresa o datos/secretos prohibidos.
- `POLICY_CONFLICT`: intento de PROD/publicación/install/provider write o autoridad incompatible.
- `MONEY_LIMIT`: gasto, suscripción o API de pago no autorizada.
- demás razones: solo las ocho canónicas del proyecto.

## Durante la migración actual de la web

Mientras STAGING pasa a PROD:

- no tocar WordPress PROD desde esta rama;
- no fusionar esta PR por conveniencia;
- no usar la web nueva como baseline hasta que la promoción quede estable/verificada;
- seguir avanzando contratos, perfiles, scoring, adapters, tests y documentación en paralelo.

## Gate posterior a migración

Cuando la web oficial quede estable:

1. verificar versión/deploy/estado vivo;
2. capturar baseline visual/técnica con evidencia autorizada;
3. asociarla a `site_ref` versionado;
4. ejecutar comparación visual/funcional en PREPROD;
5. cualquier mejora propuesta pasa por LAB/OLD vs NEW/rollback antes de PROD.

## Tests

CI específica:

```bash
node --test \
  cerebro/tests/channel-intelligence-runtime-v1.test.mjs \
  cerebro/tests/channel-intelligence-multicompany-adapter-v1.test.mjs

cd cerebro
npm run validate
```

La segunda orden protege el Registry/Factory canónico frente a alteraciones accidentales.

## Promoción

No promover mientras:

- haya CI roja;
- no exista evidencia exact-head;
- falten contratos/dependencias/runbook/backup-rebuild;
- la migración web esté inestable;
- exista una excepción humana abierta;
- publishing/provider binding no haya sido diseñado y probado separadamente.

V1 puede considerarse PREPROD GREEN cuando los tests y la evaluación del alcance estén verdes. Eso no la convierte automáticamente en autónoma PROD.
