# CEREBRO OS · FASE 15 · Marca, apps y commerce · bloques 176–184 · V0

Fecha: 2026-10-14  
Entorno: `PREPROD`  
Estado inicial del documento: `PREPROD_CODE_PENDING_CI`

## 1. Contrato canónico

Esta fase cubre exactamente:

- 176 · `BRANDBOOT-001` · reutilizar candidato LAB existente.
- 177 · brand tokens automatizados.
- 178 · Claude Commerce Agents · patrón de referencia, no dependencia.
- 179 · Shopping Agent capability.
- 180 · Merchant Agent capability.
- 181 · App Factory sobre Digital Build / FACT.
- 182 · Blink · referencia, no instalar.
- 183 · templates web app / PWA / mobile.
- 184 · text-to-CAD · catalogar capacidad especializada.

No se crean nueve motores. La implementación física V0 vive como capability compartida bajo `FACT-001`, componiendo motores existentes.

## 2. Conservación y dependencia BRANDBOOT

`BRANDBOOT-001` ya existe como candidato LAB gobernado en un vehículo separado. Esta fase **no lo reescribe** y **no cambia el registro canónico de main de 177 motores**. La migración 177→178 permanece separada, reversible y sujeta a GOV/FACT.

Esta rama consume el concepto contractual de `BRANDBOOT-001` únicamente como fuente de un `brand_contract_ref` opaco. No afirma que BRANDBOOT esté promocionado a PROD ni que esté en el registry canónico actual.

## 3. Automatización ordinaria V0

El runtime `brand-commerce-appfactory-runtime-v0.mjs` automatiza en PREPROD el trabajo ordinario de planificación:

1. valida `company_id + engine_id + capability_id + environment + version`;
2. consume un contrato de marca gobernado;
3. genera `design-tokens.json` / `brand.css` de forma determinista;
4. prepara planes de Shopping/Merchant sobre `SALE-001`, `PAY-001`, `INV-001`, `COM-001` sin mutaciones reales;
5. prepara App Factory sobre `FACT-001 + APPBOOT-001` con artifacts de tests/rollback/rebuild;
6. cataloga Blink y text-to-CAD sin instalación;
7. emite clave de idempotencia y telemetría metadata-only.

El flujo ordinario no requiere intervención humana mientras cumpla contrato y políticas. Los límites físicos siguen cerrados.

## 4. Límites deliberados

V0 no puede:

- escribir en PROD;
- desplegar o publicar apps;
- contratar/comprar suscripciones;
- instalar Blink u otros proveedores;
- invocar proveedores externos;
- cargar/cobrar/reembolsar pagos;
- emitir facturas fiscales reales;
- firmar documentos;
- guardar PII cruda, secretos o datos de tarjeta;
- tocar Trading LAB.

Los únicos motivos `HUMAN_REQUIRED` permitidos siguen siendo los ocho canónicos.

## 5. Coste

Coste adicional objetivo y contrato V0: `0 EUR`.

Claude Commerce, Blink y cualquier proveedor externo se tratan como referencia/patrón. No hay vendor lock-in ni API comercial obligatoria.

## 6. Tests y aceptación

Gate requerido:

- focused contract tests de FASE 15;
- JSON profile/evidence parseable;
- `npm run validate` del registry existente;
- `npm test` completo;
- Tribunal/Factory/Promotion shadow del repositorio cuando apliquen.

No promover ni fusionar solo porque el código compile. El estado se actualiza a `PREPROD_CODE_TESTED_PLAN_ONLY` únicamente tras CI verde sobre el head exacto.

## 7. Rollback y rebuild

Rollback: revertir los commits aditivos de esta rama. No existe migración de datos ni mutación de Supabase/WordPress/CRM/PROD.

Rebuild: regenerar runtime/profile/tests/docs/evidence desde el contrato de bloques 176–184 y las interfaces existentes `FACT-001`, `APPBOOT-001`, `SALE-001`, `PAY-001`, `INV-001`, `COM-001`.

## 8. Estado de autonomía

- planificación PREPROD: automática;
- brand tokens deterministas: automática;
- app scaffold plan: automático;
- commerce plan: automático;
- ejecución externa: deshabilitada;
- publicación/despliegue: deshabilitado;
- PROD autónomo: no autorizado;
- BRANDBOOT registry migration: gobernada por separado.
