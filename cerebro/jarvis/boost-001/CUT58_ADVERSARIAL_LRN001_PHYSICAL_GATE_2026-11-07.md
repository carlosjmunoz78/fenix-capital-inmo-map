# CEREBRO OS · JARVIS V2 · CUT58: evaluación adversarial y puerta física LRN-001

**Fecha:** 2026-11-07
**Company:** `fenix`
**Motor:** JARVIS / BOOST-001 / LRN-001
**Rama aislada:** `cerebro/jarvis-deepseek-weekend-lab-20261106`
**Estado:** CUT58 QA LAB PASS; INDEPENDENT EXTERNAL TRIBUNAL PENDING; REAL LRN INGEST BLOCKED; JARVIS V2 PROD NO-GO.
**Principio:** no alterar App/CRM/ANA/voz, main, Gateway PROD, CUT30, DNS o Trading; no Work, sin créditos nuevos ni nuevas suscripciones.

## 1. Pruebas reales y verificables

### CUT58 segunda rúbrica independiente en implementación
- Workflow [#42385297978](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42385297978) **SUCCESS**: 8/8 adversarial + 3/3 CUT57 = **11/11** pruebas PASS.
- Archivo de salida: `jarvis-cut58-adversarial-policy-42385297978`, artifact ID `13579725200`, retención de 30 días.
- Cinco candidatos de políticas de CUT57 pasan la segunda rúbrica (5/5). Se probaron condiciones negativas de aprobación humana injustificada, salto de permisos, secretos, falsa ejecución, SQL/Python, persona `señor`, memoria de 3 precedentes, caducidad inventada, rollback y auditoría.
- La ejecución inicial #42385162158 falló 7/8 y el diagnóstico #42385234559 volvió a fallar por ausencia explícita de evidencia/auditoría en `exec-01`. Se corrigió el texto del candidato sin debilitar el test; quedan ambos fallos registrados.
- **Límite:** las dos rúbricas son comprobaciones deterministas elaboradas en el mismo proyecto. NO constituyen evaluación externa independiente, prueba de comportamiento de un LLM vivo ni certificación de PROD. Independencia externa y tribunal = PENDIENTE. Reglas en `CANDIDATE_ONLY`. 0 reglas aceptadas en memoria ejecutiva.
- Llamadas DeepSeek CUT58: **0**. Pesos del modelo modificados: **NO**.

### CUT58 comprobación de puerta física LRN (sin escrituras)
- Se consultaron mediante Supabase conectado ambos proyectos, usando exclusivamente SQL SELECT sobre metadatos/estado. No se escribieron filas, se modificaron esquemas, grants ni funciones.
- **Proyecto donde existe la RPC LRN-001: `fenix-capital-prod`, ref `cluhljgonannaafpmblx`.**
- Table: `public.cerebro_lrn001_continuation_preprod`: **0 registros**; RLS ON; sin políticas de acceso desde clientes.
- RPCs reales:
  - `public.cerebro_lrn001_record_preprod` (mutación, **NO INVOCADA**).
  - `public.cerebro_lrn001_status_preprod` (lectura, **invocada** con `fenix`): `{ok:false,status:404,error:'company_not_found',allowed:false}`.
- Ambas funciones son `SECURITY DEFINER`; comprobación de EXECUTE: `anon=false`, `authenticated=false`, `service_role=true`. No abrir grants ni exponer service role al cliente.
- `public.cerebro_company_registry_preprod` en ese proyecto no tiene `fenix`. `public.cerebro_company_engine_state_preprod` está vacía: **0 de 17 motores GREEN**.
- RPC record tiene condición contractual `full_17_engine_preprod_green_required`: cuenta 17 filas GREEN para la misma empresa, entorno PREPROD, prod_authorized=false, prod_write_authorized=false, trading_access=false y coste adicional 0. Aun así requiere evaluación, tribunal, respaldo y demás controles para autorizar la siguiente fase. **No crear filas falsas para eludir el gate**.

### Origen de la divergencia entre bases
- **Proyecto histórico `fenix-capital-inmo-map`, ref `hnqlnvakzaywtafeiybt`:**
  - Registry de `fenix` EXISTE: 1 empresa.
  - Engine state tiene 17 filas: **11 GREEN, 2 READY, 4 BLOCKED**, asociadas a `fenix` y `PREPROD`.
  - 11 GREEN: `TENANT-001`, `COMP-REG-001`, `COMP-ONB-001`, `SCAN-001`, `KW-001`, `WAUD-001`, `SOCAUD-001`, `LOCALP-001`, `KBOOT-001`, `SEOBOOT-001`, `SOCBOOT-001`.
  - 2 READY: `MKTBOOT-001` y `CRMBOOT-001`.
  - 4 BLOCKED: `APPBOOT-001`, `AUTBOOT-001`, `TRNBOOT-001`, `ENGACT-001`.
  - El grafo declarado de dependencias de los bloqueados es: APPBOOT ← KBOOT + CRMBOOT; AUTBOOT ← CRMBOOT + APPBOOT; TRNBOOT ← KBOOT + AUTBOOT; ENGACT ← TENANT + SEOBOOT + SOCBOOT + MKTBOOT + CRMBOOT + APPBOOT + AUTBOOT + TRNBOOT.
  - Esos estados están fechados **2026-10-13**. NO prueban funcionamiento físico presente ni permiten copiarlos a otra base como si fueran validación.
  - RPCs `cerebro_lrn001_record_preprod` y `...status_preprod` **no existen** en este proyecto (conteo 0).
- **No confundir:** tablas de metadatos llamadas PREPROD con App PREPROD operativa; la App PREPROD antigua está cancelada. No restablecerla ni modificar la App real.

## 2. Control preventivo programado

- Archivo `cerebro/jarvis/boost-001/cut58-lrn-physical-gate-v0.mjs`: bloqueo por empresa, base equivocada, ausencia de RLS/grants, faltas de 17 GREEN, falta de revisión independiente/identidad/rollback/coste. Incluso todos los controles hipotéticos en verde **NO autorizan escritura por sí solos**.
- Workflow [#42385581474](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42385581474) **SUCCESS**: **7/7 pruebas**, sin llamadas externas; artifact `jarvis-cut58-lrn-readonly-gate-42385581474`, ID `13579670837`.
- La observación física se realiza por la conexión Supabase, separada del test offline que comprueba una instantánea declarada, NO conectividad directa de la nueva pieza.
- Gate real ahora: `COMPANY_NOT_REGISTERED`; CEREBRO owner E2E NO acreditado. 0 solicitudes de escritura, 0 permisos nuevos, 0 coste nuevo.

## 3. Mapa de dependencias para avanzar sin alterar App/CRM PROD

1. **CONSERVAR/ENTENDER** los dos proyectos. No mezclar registros ni desplegar nueva App PREPROD. Identificar cuál debe ser backend transaccional canónico antes de cualquier migración; conservar backups, contratos y los datos.
2. Auditoría actual de pruebas reales de `MKTBOOT-001` y `CRMBOOT-001` (READY antiguos); después `APPBOOT-001`, `AUTBOOT-001`, `TRNBOOT-001` y `ENGACT-001` según dependencias y evidencias físicas. No marcar GREEN por decreto.
3. Contrato de on-boarding `fenix` en base destinataria, sin duplicados y con idempotencia, solo tras respaldar y verificar dependencias y RLS; no realizarlo como parte de CUT58.
4. Evaluación externa adversarial/canario, cierre de coste DeepSeek real, revisión de LRN-001 y FACT-001, owner B2/B3, prueba de voz y rollback físico.
5. Registrar candidatos de aprendizaje mediante la RPC existente **solo cuando todos los gates sean reales**, como evidencia PREPROD controlada y sin escribir conocimiento canónico. Posteriormente promoción gradual real a producción con aprobación por gates.

## 4. Estados

| Dimensión | Estado |
| --- | --- |
| DeepSeek candidato base | HECHO · CUT55 |
| Tribunal semántico determinista 1 | HECHO · CUT56 |
| Segundo validador adversarial independiente en código | HECHO · CUT58, 11/11 PASS |
| Evaluación externa/tribunal de autoridad independiente | PENDIENTE |
| LRN-001 contract / RPC real localizada | HECHO |
| LRN-001 ingesta física de candidatos | BLOQUEADA |
| Registro de empresa en base LRN destino | NO EXISTE |
| Motores GREEN en base LRN destino | 0/17 |
| Registro histórico en otro proyecto | PARCIAL · 11 GREEN / 2 READY / 4 BLOCKED; estados antiguos |
| CUT37 financiación / aprendizaje continuo | PAUSED; contabilidad conservadora, factura exacta pendiente |
| JARVIS V2 PROD completo | NO-GO |

**NEXT:** `CUT59_COMPANY_REGISTRY_AND_17_ENGINE_EVIDENCE_RECONCILIATION_READ_ONLY`; luego `CUT60_EXTERNAL_TRIBUNAL_OWNER_E2E_AND_GOVERNED_PROD_PROMOTION`.
