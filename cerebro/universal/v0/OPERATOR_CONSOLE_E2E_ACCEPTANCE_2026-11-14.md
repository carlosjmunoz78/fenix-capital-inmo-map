# CEREBRO OS · Operativa LAB · Consola de órdenes, aceptación E2E

**Fecha:** 2026-11-14. **Rama aislada:** `cerebro/universal-control-plane-lab-v0-20261113`, PR #66 DRAFT. **Sin merge a main ni promoción a producción.**

## Implementación física
- Nuevo planificador determinista y estrictamente allowlisted `cerebro/universal/v0/operator-instruction-lab.mjs` con tests de comandos permitidos, negaciones, acciones de riesgo y destinos externos.
- Endpoint del Gateway `/api/cerebro-universal-preview` con acción `plan_instruction`; verifica entorno Preview, dominio del deployment, mismo origen, tamaño de payload, sesión existente Fénix, identidad de propietario, alcance de empresa fenix y entorno LAB. La API jamás toma instrucciones del cliente para URL, destino o motor de negocio.
- Cliente `src/cerebroOperatorChatLabApi.ts`: valida procedencia y contrato antes de mostrar un plan.
- Interfaz `src/CerebroOperatorChatLab.tsx` integrada en `src/CerebroUniversalOperativaLabPanel.tsx`. Comandos permitidos: ayuda, estado registro de motores, controles JOB-001, suspensión de staging, última certificación FACT-001, simulación FACT-001 y certificación FACT-001 con confirmación expresa.
- La operación de certificación reutiliza `executeFactRegistryAttestationLab` y el ejecutor existente; confirma éxito solo cuando recibe un justificante persistido. La simulación FACT-001 usa la auditoría duradera PREPROD ya existente. Las lecturas no se anuncian como motores ejecutados.
- Conversación **temporal en la pestaña**, NO histórico persistente. El negocio general, los 179 motores y la ejecución PROD siguen sin activarse.

## Pruebas GitHub Actions
- El CI `CEREBRO Universal Gateway V0 LAB contract CI` ejecutó `node --test cerebro/universal/v0/*.test.mjs` con nuevos tests de clasificación positiva y bloqueo de instrucciones adversariales.
- La primera pasada detectó que `FACT-001` y `JOB-001` con guion no se normalizaban. Corregido antes de promoción. Segunda pasada **SUCCESS** en commit `b06427df9c2b059183a4fcb2bb27077c931fd4ea`, run `43589788120`.
- `CEREBRO Governed Main Integration V0` y `CEREBRO Enterprise Acceleration V0` también **SUCCESS** para ese commit.
- Vercel Preview `dpl_LH1FLQ6ecSbMZ9uehPPjFRisqzAw` pasó a READY; se comprobó físicamente desde una sesión de propietario de Opera la nueva consola y su campo de entrada, manteniendo el justificante duradero anterior.

## E2E real desde propietario autenticado
- Un disparador **temporal y de una sola vez**, solo en una URL Preview del usuario autenticado, ejecutó desde el mismo componente del chat la petición `planOwnerInstructionLab('estado de staging')` y luego la acción de lectura `readStagingSuspensionLab()` si el plan estaba permitido.
- Opera mostró el mensaje del propietario `estado de staging [QA lectura desde la consola]` y la respuesta efectiva: `Staging SUSPENDIDA POR EL PROPIETARIO. JOB-001 15/15 pausados; pg_cron 14/14; funciones SQL 4/4 protegidas. Aislamiento GLOBAL NO CERTIFICADO. No he visitado staging.`
- La prueba ejercitó la sesión real, el endpoint Preview, el intérprete de órdenes y el lector de estado PREPROD, **sin llamadas a staging ni escrituras**. **NO** prueba que se haya pulsado manualmente Enviar en Opera; la versión final no contiene el disparador.
- El disparador QA fue eliminado en commit `f31b1659dc670bcabd34ee4b2c18f72b5ab7b973`. Queda pendiente validación final CI + deployment sobre HEAD.

## Límites y gates pendientes de interfaz totalmente autónoma
- El intérprete solo admite comandos enumerados; **no es una IA conversacional general**.
- Solo `FACT-001/fact.registry.attest` dispone de ejecutor real y justificante persistido; no existe ejecución genérica de motor de negocio desde el chat.
- Historial de conversación no persistido; auditoría durable disponible para certificación y simulación, pero no para cada mensaje/consulta.
- No se ha certificado un ciclo completo de creación de motores desde la UI, control de pausa/arranque por motor, administración multiempresa real, UX móvil navegada ni 179 ejecuciones empresariales.
- Suspensión de staging hasta nueva orden, protección App/CRM/WordPress/DNS/main, sin servicios de IA pagos. No calificar toda la interfaz ni CEREBRO como plenamente operativo hasta superar estos gates.

## Recuperación
Desactivar mediante rollback aislado del commit de interfaz/endpoint en PR #66, manteniendo intactas las funciones y tablas PREPROD existentes. El chat no modifica los mecanismos de ejecución de los motores.


## Ampliación: consulta individual de motor registrado

**14/11/2026:** la consola acepta `estado del motor SEO-001` y otros IDs canónicos mediante `ENGINE_STATUS`, exclusivamente como lectura. El intérprete genera un candidato; el API propietario verifica que aparezca entre los 179 IDs de `engine-registry.v1.json`. El Gateway ejecuta `get_engine_status` y exige la respuesta `defined_in_registry=true`, `definition_environment='SCAFFOLD'`, `runtime='NOT_VERIFIED'`, `source='REPOSITORY_SNAPSHOT_NOT_LIVE'`. No se ejecuta el motor ni se presupone que esté operativo. Los IDs no registrados se deniegan. El cliente valida el contrato antes de mostrarlo.

**Pruebas:** `CEREBRO Universal Gateway V0 LAB contract CI` run `43590974986` finalizó `SUCCESS`, commit `be5aff3c5d9dea7dda4213d847b01a24e4fa779b`. Preview Vercel `dpl_2FK1vAtKhShZhJfDfibM5TVXhup2` READY. No es prueba de clic manual del nuevo comando individual. El E2E real autenticado anterior del chat sí verificó interpretación y lectura de staging. El CI también comprueba rechazo de POST anónimo al intérprete. Sin modificación de PROD, staging ni main.
