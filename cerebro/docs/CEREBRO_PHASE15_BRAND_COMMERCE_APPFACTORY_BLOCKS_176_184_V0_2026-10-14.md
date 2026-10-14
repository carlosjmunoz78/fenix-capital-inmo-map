# CEREBRO OS · FASE 15 · Marca, apps y commerce · bloques 176–184 · V0

Fecha: 2026-10-14  
Entorno: `PREPROD`  
Estado del documento: `PREPROD_CODE_HARDENED_PENDING_HEAD_CI`

## 1. Contrato canónico

Esta fase cubre exactamente:

- 176 · `BRANDBOOT-001` · reutilizar candidato LAB gobernado existente.
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

`BRANDBOOT-001` existe como candidato LAB gobernado en un vehículo separado. Esta fase **no lo reescribe**, **no lo promociona a PROD** y **no modifica el registro canónico**.

El registro canónico de `main` ya contiene **179 motores** por una extensión independiente que añadió `HCI-001` y `MOTION-001` sobre la base histórica de 177. `BRANDBOOT-001` no forma parte de esos 179 y esta PR no altera ese hecho.

Esta rama consume el contrato de `BRANDBOOT-001` únicamente como fuente de un `brand_contract_ref` opaco. No afirma disponibilidad canónica o productiva de BRANDBOOT.

## 3. Automatización ordinaria V0

El runtime `brand-commerce-appfactory-runtime-v0.mjs` automatiza en PREPROD el trabajo ordinario de planificación:

1. valida de forma exacta `company_id + engine_id + capability_id + environment + version` (`FACT-001`, `BRAND-COMMERCE-APPFACTORY`, `PREPROD`, `v0`);
2. consume un contrato de marca gobernado;
3. genera `design-tokens.json` / `brand.css` de forma determinista;
4. materializa explícitamente el bloque 178 como referencia de patrón sin provider binding;
5. prepara planes de Shopping/Merchant sobre `SALE-001`, `PAY-001`, `INV-001`, `COM-001` sin mutaciones reales;
6. prepara App Factory en bloque 181 sobre `FACT-001 + APPBOOT-001` y referencia los templates del bloque 183;
7. cataloga Blink y text-to-CAD sin instalación;
8. emite clave de idempotencia y telemetría metadata-only.

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

Gate requerido sobre el **head exacto** antes de merge:

- focused contract tests de FASE 15;
- JSON profile/evidence parseable;
- `npm run validate` del registry existente;
- `npm test` completo;
- Tribunal/Factory/Promotion shadow del repositorio cuando apliquen.

No promover ni fusionar solo porque el código compile. El estado `PREPROD_CODE_TESTED_PLAN_ONLY` solo es válido cuando los checks del head candidato a merge están verdes.

## 7. Rollback y rebuild

Rollback: revertir los commits aditivos de esta rama. No existe migración de datos ni mutación de Supabase/WordPress/CRM/PROD.

Rebuild: regenerar runtime/profile/tests/docs/evidence desde el contrato de bloques 176–184 y las interfaces existentes `FACT-001`, `APPBOOT-001`, `SALE-001`, `PAY-001`, `INV-001`, `COM-001`.

## 8. Estado de autonomía

- planificación PREPROD: automática;
- brand tokens deterministas: automática;
- referencia commerce 178: automática y sin proveedor;
- app scaffold plan: automático;
- commerce plan: automático;
- ejecución externa: deshabilitada;
- publicación/despliegue: deshabilitado;
- PROD autónomo: no autorizado;
- BRANDBOOT: candidato separado, sin promoción implícita.