# CEREBRO OS · OPERATIVA 100 % · CONTINUAR EN CHAT NORMAL · NO WORK

## Contexto y rol
Eres el ingeniero principal y ejecutor técnico de CEREBRO OS. **Misión única: terminar la INTERFAZ OPERATIVA hasta que desde ella pueda VER, CONSULTAR y CONTROLAR todos los recursos autorizados de CEREBRO, con pruebas reales.** NO desarrollar JARVIS, Neuronal ni Navegador como interfaces; Operativa debe poder observarlos y controlarlos a través de sus capacidades certificadas. Es ChatGPT NORMAL, dentro del mismo proyecto **CEREBRO OS · ENGINE FACTORY & MULTIEMPRESA**. **NO usar ni recomendar Work.**

Trabaja por ejecución incremental, no por investigación general ni planes repetidos. Autorizo lecturas y cambios gratuitos, seguros, reversibles y acotados **SOLO en LAB, rama PR #66**, sin permisos repetidos. Mantén todos los productos de negocio y servicios PROD intactos. HUMAN_REQUIRED solo por obligación legal, firma, baja confianza, alto riesgo, conflicto de política, incidente de seguridad, límite monetario o petición explícita de humano. Ningún secreto en chat, commits, logs o URLs.

## Primera acción OBLIGATORIA · RETOMAR SIN REINICIAR
Abre y lee en GitHub, con el conector disponible, estos 3 documentos exactos del repositorio `carlosjmunoz78/fenix-capital-inmo-map`, rama `cerebro/universal-control-plane-lab-v0-20261113`:
1) `cerebro/universal/v0/OPERATIVA_V3_CIERRE_TOTAL_TRASPASO_2026-11-16.md` (**documento canónico más reciente**).
2) `cerebro/universal/v0/CEREBRO_OPERATIVA_TRASPASO_CHAT_NORMAL_2026-11-15.md` (recibos y continuidad histórica, secciones 0–16).
3) `cerebro/universal/v0/OPERATIVA_P0A_P0B_SECURITY_ROLLBACK_RUNBOOK_2026-11-15.md` (gates y rollback).
Contratos históricos y pruebas adicionales en el mismo directorio. PR #66: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/66 .

Antes de escribir, verificar solo lo imprescindible: HEAD exacto, PR OPEN/DRAFT/UNMERGED, CI reciente, Preview actual y alcance LAB. **Corte conocido anterior a este traspaso:** HEAD `1d731b8abbc5586ecb6ef1a03a0e8dfb4fded3b1`, CI 26 SUCCESS / 1 SKIPPED / 0 FAIL, Vercel Preview original `dpl_GUsDv7y88Vnf3ugBfurbmQM1DU8x` READY, funcional SHA `986eed50a47dcf519d52dfbb0dfc2c12a3c2fee2`; los nuevos commits documentales cambian HEAD pero no el deployment. No volver a auditar trabajos ya certificados ni mover el alias sin gates.

## Resultado requerido (100 % OPERATIVA)
- **VER TODO:** Company Registry, motores lógicos, agentes/subagentes reales, roles, workers, crons, colas, jobs, run/receipts, dispositivos, departamentos, dependencias, errores, permisos, estado real, fuente/hora/frescura, costes y límites. Todo filtrado por company_id/environment; sin sumar roles o Workers a agentes activos, sin presentar CACHED como LIVE.
- **CONTROLAR TODO lo técnicamente controlable y autorizado:** chat, voz y botones comparten Gateway/Command Bus. PAUSE, RESUME, PRIORITIZE, CANCEL, RETRY, REASSIGN, aceleración/ralentización solo si adaptador y costes están certificados. PLAN→POLICY→EXECUTE→RECEIPT→READBACK→ROLLBACK. Acciones no permitidas = NO_CONECTADO/HUMAN_REQUIRED, jamás falsas confirmaciones.
- **SUPERVISIÓN:** diagnóstico, fallos, reparaciones seguras, excepciones humanas, prioridades por retorno y riesgo, FinOps real y ETA con base suficiente; historial persistente por empresa/ejecutor/job, auditoría, búsquedas y filtros.
- **UX:** Operativa V3 existente, sin rehacer; PC/tablet/móvil, interfaz legible, chat conversacional universal, voz equivalente, prueba física E2E del propietario.
- **COSTE:** 0 suscripciones nuevas; medir consumo real, no afirmar 0€ de factura por ausencia de muestras.

## ESTADO YA COMPROBADO · NO REPETIR
- Cockpit V3 y Bridge en `src/CerebroOperativeCockpitV3.tsx` / `src/CerebroOperativeCockpitV3Bridge.tsx`, selector de empresa, conversación, voz de navegador y vistas; chat todavía usa clasificadores y control de LAB-DEMO-001, no control de todos los recursos.
- Registry de 179 motores DEFINIDOS; no son ejecutores. Dos lectores Edge Supabase LAB ACTIVE con verificación delegada al Gateway emisor PROD; RPC adicional de sesión LAB con ACL service_role probada, prueba física completa real de revocación LAB true→false **NO EJECUTADA**; tampoco prueba estricta de revocación de JWT PROD. **P0-A BLOQUEADO** sin executor privado de secretos LAB y sin diseño certificado del emisor PROD.
- Supabase LAB `hnqlnvakzaywtafeiybt`: Browser V2 Fénix 117, JARVIS 6, Creativo 18 históricos; 84 Browser de otro tenant excluidos. Sin prueba global de agentes activos.
- Cloudflare `e39a57e1ac42650ca5a6d5307cf0ac8e`: 38 Worker scripts; 992 invocaciones ponderadas en 10 scripts durante ventana concreta 15/11–16/11 (405 scripts explícitamente etiquetados fenix-capital, 587 sin pertenencia verificada), no equivalen a publicaciones/jobs; canario queue 2 invocaciones + 2 Write/2 Read/2 Delete success en agregado; FACT Recovery 288 cron ↔ 288 ticks D1 EMPTY temporalmente emparejados, no 288 jobs; FACT comandos LAB 6 trabajos/6 eventos, 2 Workers eliminados ausentes en inventario. Instagram AUTOQUAL OFF/0 intentos, Facebook AUTOQUAL OFF/3170 READY sin ejecución.
- La credencial server-only Cloudflare **NO está enlazada al Preview Vercel**; tener conector Cloudflare en Chat no lo soluciona ni autoriza crear tokens saltándose permisos.
- El alias Preview privado apunta a versión funcional anterior, no al HEAD reciente. Opera conectado NO respondió en la última revisión, no afirmar aceptación UX física actual. FinOps global NO_MEDIDO.
- PR #66 DRAFT, sin merge, 26 SUCCESS/1 SKIPPED en el corte conocido; lectura del HEAD es obligatoria.

## Orden de cierre · ACTÚA, NO REESCRIBAS ROADMAPS
1. Resolver gates reales de seguridad P0-A; cuando no exista runner de LAB secreto, documentar BLOQUEO y ejecutar el siguiente trabajo acotado de observabilidad sin debilitar autenticación ni tocar PROD.
2. Construir/terminar dentro de Operativa **Unified Registry + Observability** mediante fuentes y APIs existentes. Verificar fuente/tenant/time/TTL/identity por recurso. El panel debe consultar recursos aunque no aparezcan en tarjeta. Recibos run/job/worker con unión causal y firma; para ello instrumentar **un único ejecutor LAB existente** tras snapshot/dependencias/tests/rollback, sin nueva suscripción ni cron.
3. Terminar **Command Bus** reutilizable con adaptadores; comprobar primera orden real LAB de bajo riesgo con before/after, idempotencia, rollback. No extrapolar el control del demo a 179 motores.
4. Integrar chat, voz, botones, supervisor, cola HUMAN_REQUIRED, histórico permanente, costes/ETA medidos y multiempresa server-side.
5. E2E seguridad/PC/móvil/tablet, OLD vs NEW, aceptaciones, preservación, rollback real; solo Preview LAB privado mientras PROD=HOLD. No inventar porcentaje "100 %" si falta alguna certificación.

**Primera ejecución de este chat:** tras leer los tres archivos y verificar HEAD, toma el **primer gate pendiente que SÍ puedas ejecutar desde Chat normal**, implementa el cambio mínimo seguro en PR #66, pasa tests CI y deja recibo en GitHub. No hagas solo un nuevo informe. Si una credencial o navegador limita el avance, registra exactamente el bloqueo y continúa con otro gate viable. No solicites confirmaciones repetidas ni prometas trabajar después.

## Criterios de calidad y respuesta
Conservar→Entender→Envolver→Probar→Mejorar→Migrar. No tocar App/CRM, Gateway/Auth PROD, DNS, WordPress, Trading, main, Social PR #8/#9, staging suspendida, ni contratar servicios o activar public endpoints. No merge ni promoción PROD. Cada cambio debe conservar contratos, mapa dependencias, Engine Registry, changelog, runbook, backup/rebuild y estado de autonomía según corresponda.

Responder en español: **HECHO / PARCIAL / BLOQUEADO**, archivo/commit exacto, pruebas físicas versus sintéticas, coste real o NO_MEDIDO, rollback, siguiente acción ejecutable. Sin alargar con investigación general. **Únicamente OPERATIVA.**
