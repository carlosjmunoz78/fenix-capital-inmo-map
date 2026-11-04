# ZEUS / SUPERAGENTE JARVIS · B5 CORTE 04 · GATEWAY, VOZ Y FINOPS LAB
Fecha: 2026-11-04 (Europe/Madrid). Estado general: **PARCIAL, LAB GREEN, PROD NO OPERATIVO**.

## Baseline, alcance y cambios diferenciales
Continuado desde B5 Corte 03, PR #15 DRAFT sobre PR #14 B4 DRAFT sobre PR #13 B2/B3 DRAFT. Código previo `2d960fd0bde9d8b592da3d2e220ee7e0fbd1faaf`; ningún cambio en `main`, `src/cerebroVoice.ts`, PR #12, App, CRM, WordPress, DNS, Trading o PROD de motores. No reabrir auditoría B1–B4 completada.

## Implementación nueva / reparada
1. `jarvis-b5-speech-port.mjs`: B2 exige arrays reales de `roles` y `authorizedCompanies`, no cadenas con coincidencia de subcadenas ni objetos que simulen `includes()`. Se exige `ownerId` válido. Pruebas adversarias exactas.
2. `jarvis-b5-intent.mjs`: STOP compatible con la voz Fénix actual para «para ya», «calla» y «detente»; sin tocar la UX heredada.
3. `jarvis-b5-browser-voice-bridge.mjs`: STT sin valor numérico de confianza no queda listo para ejecutar una orden; solo se permite interrupción local, rechazo sensible o escalado de riesgo.
4. `jarvis-b5-gateway-readonly.mjs`: primera composición **solo lógica**, no endpoint HTTP/deploy, de control OFF, rate limit, B2, B3, compilación de intención, diálogo, clasificador de privacidad y Router. Ignora datos de permiso, privacidad o pago suministrados por el cliente. `mayExecute=false`, `modelCalled=false`, `spentEuro=0`.
5. `jarvis-b5-model-router.mjs`: prueba de saldo de DeepSeek vinculada también al proveedor; los importes de gasto confirmado deben corresponder a DeepSeek, empresa y entorno; no existe ejecución de pago.
6. `audio-lab/b5-espeak-tts-smoke.sh` + workflow: síntesis española con eSpeak NG OSS, audio de ejemplo no sensible, archivo WAV efímero validado y eliminado tras prueba; no conectada a App ni a STT.
7. `finops-lab/b5-atomic-prepaid-ledger-candidate.sql` + `b5-atomic-prepaid-ledger-lab.sh` + workflow: SQL **candidato SOLO LAB**, sin despliegue a PROD, sin grants públicos. PostgreSQL 17 real, reservas concurrentes, idempotencia, límite por empresa/entorno, balance con TTL 15 minutos, reconciliación, liberación y restore/rollback en base sintética aislada.
8. Tests `jarvis-b5-cut04-voice-security.test.mjs` y `jarvis-b5-gateway-readonly.test.mjs` + casos adicionales de proveedor DeepSeek; no se relajan tests previos.

## OLD vs NEW — alcance demostrable en LAB
| Contrato | OLD conservado | NEW probado |
|---|---|---|
| UX de voz | `src/cerebroVoice.ts`, umbrales 0.85/0.60 y comandos de parada | adaptador compatible, STOP ampliado, confianza STT ausente→CLARIFY |
| Autorización | B2/B3 aún sin certificación física | invocaciones de Preview/Gateway en LAB deniegan role-string, tenant-string, sesión no válida y B3 DENY |
| Gateway | ninguna conexión B5 activa | contrato server-only bajo control y rate-limit; **no es endpoint desplegado** |
| IA | Model Router preview sin llamadas | prueba de saldo y ledger vinculados al proveedor DeepSeek; solo LOCAL candidato, pago OFF |
| Audio | sin prueba real STT/TTS B5 en backend | **TTS remoto sintético** en CI, sin certificación de calidad, STT no probado |
| Presupuesto | coste declarado ≠ saldo verificado | PostgreSQL sintético admite una reserva concurrente y rechaza sobrepasar el límite |

## Evidencias GitHub verificadas
- `JARVIS Universal Core LAB Tests`: run **41747051593**, **262/262 PASS, 0 FAIL**.
- `CEREBRO Governed Main Integration V0`: run **41747051536**, SUCCESS; promoción real SKIPPED.
- `JARVIS B5 Open Source Spanish TTS LAB`: run **41747051464**, SUCCESS. En primer run de referencia **41746505405** se validó WAV real 5,12 s / 22.050 Hz / mono. **No implica reconocimiento ni calidad de voz aprobada**.
- `JARVIS B5 Atomic FinOps PostgreSQL LAB`: run **41747051440**, SUCCESS. El log contiene `B5_FINOPS_PG17_LAB_GREEN`.
- `JARVIS B4 Real PostgreSQL Concurrency LAB`: run **41747051610**, SUCCESS, sólo datos sintéticos.

## Estado real y NO-GO
- Supabase PROD: proyecto `cluhljgonannaafpmblx`; registro `PRJ-SUPERAGENT-001` PARCIAL. B3 y B4 `enabled=false,kill_switch=true`. B4 eventos de memoria 0 en corte anterior. **Ninguna tabla de presupuesto B5 se ha creado en PROD**.
- B5 no dispone de Gateway desplegado, voz real integrada, certificación de restauración de PROD ni identidad OWNER_ROOT en E2E. **NO OPERATIVO en PROD**.
- DeepSeek: saldo real, secreto, autorización B3 y reconciliación con proveedor aún SIN VERIFICAR. **0 llamadas de IA pagadas, 0 suscripciones nuevas**. Presupuesto limitado a menor de 50 € y saldo real, sin recargas.
- Tests SQL con contrato monetario en céntimos y funciones `SECURITY INVOKER` son sólo candidatos; requieren auditoría RLS, RBAC y adaptación a las tablas canónicas reales antes de cualquier instalación.
- No generar servicio separado cuando pueda usarse el Gateway/worker compartido. FACT-001, multiempresa, policy y tribunal siguen siendo requisitos.

## Gates pendientes remotos
1. Contratos actuales y permisos B2/B3 reales, incluidos Vault, scopes, session binding y revocación. No ejecutar sin evidencia.
2. Recuperación/restauración de **Supabase PROD** en entorno separado, no sólo fixture PostgreSQL; permisos, coste y dependencias verificados antes de crear copia.
3. Modelo de integración Gateway bajo OFF, revisión independiente, observabilidad y seguridad con pruebas efectivas server-side, no solo adapters.
4. Balance DeepSeek y prueba de credencial en canal seguro con autorización y reserva atómica duradera, DLP y límites por request; no activar por un saldo declarado.
5. STT real en español, benchmark de calidad/latencia/privacidad, reversibilidad y compatibilidad de la interfaz existente.
6. Certificación de B6–B10 según plan canónico; evitar despliegue automático fuera de gates.

## Solo para PC / HUMAN_REQUIRED genuino
Autenticación MFA efectiva y contexto OWNER_ROOT si requiere sesión humana; micrófono y permisos de navegador; prueba real móvil↔PC; recuperación del equipo y consentimientos/firma/límites económicos humanos. **No bloquear tareas remotas por estas dependencias.**

## Rollback
Revertir únicamente commits propios de PR #15 posteriores a `2d960fd0bde9d8b592da3d2e220ee7e0fbd1faaf` o cerrar PR #15. El SQL B5 permanece archivo de laboratorio; no existe rollback de B5 PROD. No eliminar ni modificar B3/B4, App, CRM, main, voz heredada ni tablas existentes.

## next_block
`B5_CUT05_AUTHENTICATED_GATEWAY_AND_PROVIDER_PREPROD_PROOFS_UNDER_OFF` — conectar mediante contratos y pruebas con servicios reales autorizados donde sea seguro; mantener B5 apagado y no promover sin restauración real certificada y controles aprobados.
