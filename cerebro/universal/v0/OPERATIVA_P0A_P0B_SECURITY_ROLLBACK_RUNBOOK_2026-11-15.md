# OPERATIVA · P0-A/P0-B · Runbook verificable para cierre y recuperación · 2026-11-15

**Ámbito:** exclusivamente CEREBRO Operativa, PR #66 `DRAFT`, rama `cerebro/universal-control-plane-lab-v0-20261113`. Ninguna instrucción de este documento autoriza modificar PROD, App/CRM, gateway propietario, DNS o servicios de pago.

## 1. Resultado existente (hechos con evidencia física)
- 8 negativas GET reales en Opera sin credenciales: cuatro sin Authorization y cuatro por `company_id=otraempresa`; respuesta denegada, sin trabajo ejecutado.
- Dos Edge lectores LAB ACTIVE v1; ambos `verify_jwt=false` porque delegan al resolver PROD de otra instancia y no aceptan públicamente el selector ajeno. **No considerar esto por sí solo garantía de autenticación.**
- RPC identidad `SECURITY DEFINER` con `anon/authenticated EXECUTE=false`, servicio interno EXECUTE=true (verificación SQL read-only).
- Siete tablas LAB con RLS habilitada y sin SELECT directo a anon/authenticated; service_role SELECT=true.
- Vercel Preview candidato READY `dpl_GUsDv7y88Vnf3ugBfurbmQM1DU8x` (SHA funcional `986eed50a47dcf519d52dfbb0dfc2c12a3c2fee2`); candidato recuperación READY `dpl_4i9nQzAxgRY5GyDcftutkWmxzTfb` (SHA `202e3264e0129c762c9172a71dd2d8403e8a31f6`). URL directa de recuperación muestra login Fénix; contenido tras autenticar NO probado.

## 2. Security gate que aún NO pasa
A. Una sesión autenticada ajena debe recibir 403 en **proxies + Edge** (sin leer datos de otra empresa).
B. JWT vencido debe ser rechazado; demostrar que acceso token e issuer son verificados por el origen autorizado.
C. JWT firmado válido de sesión revocada debe ser rechazado con garantía estricta **si se exige revocación inmediata**, comprobando `session_id` contra `auth.sessions` en componente seguro autorizado. El Gateway existente usa `getUser` + contexto actor; no se ha observado ese lookup adicional. No inyectar roles/claims del usuario como sustituto.
D. HTTP métodos no GET, origen extraño, paths no válidos, headers inconsistentes, tamaño límite, redirección/SSRF y errores deben denegar sin datos ni invocación de trabajos. Parte tiene tests sintéticos CI; POST reales siguen pendientes.
E. Logs deben ser seguros: jamás registrar JWT, service_role, refresh tokens, datos de clientes, job IDs internos ni payload.
F. Sin evidencia real, todos los estados de agente/actividad autónoma se muestran DESCONOCIDO/NO_VERIFICADO.

**Acción segura actual:** mantener la lectura LAB bajo owner resolver y no promover ni habilitar control real. No modificar gateway ni tokens PROD. Para test revocación, usar identidad de prueba autorizada, creada en entorno aislado; nunca invalidar sesiones reales del propietario.

## 3. Rollback Preview: preflight antes de cualquier cambio
1. Comprobar rama exacta, SHA, PR DRAFT y dos deployments READY en el mismo proyecto privado `prj_tz5NfMwhscoVj2OCBOIvb0oXC6jc`.
2. Leer **destino ACTUAL** por API de alias con id/deployment+team inequívoco. La API GET /v4/aliases devolvió 404 desde la conexión y list_deployment_aliases devolvió registros del mismo alias para ambos deployments. Por tanto **mapeo sin certeza = BLOQUEAR**, no hacer `assign_alias`.
3. Comprobar Vercel Authentication/SSO vigente en proyecto, el alias de Preview no ligado a App real, y que los dos despliegues pasan GET directo sin filtración.
4. Registrar en recibo destino alias previo exacto, ID de despliegue, SHA, estado previo, fecha y operador; sin copiar credenciales.
5. **Solo con gates 1–4 VERDES**, conmutar alias PREVIEW al despliegue de recuperación READY (nunca dominio PROD). Leer de nuevo alias para confirmar ID/sha, ejecutar smoke autenticado autorizado con usuario de test, confirmar que no hay cross-company.
6. Restaurar alias al target original exacto; GET readback, smoke real, comparar OLD vs NEW. Si falla restauración: `HIGH_RISK/SECURITY_INCIDENT`, no continuar ni afirmar éxito.
7. Recibo: before/after/recovered, timestamps, pruebas, errores, rollback físico y coste. Mantener ambiente aislado.

**Estado actual:** pasos 1 y parte de 3 documentados; paso 2 BLOQUEADO por respuesta 404 y ambigüedad histórica; pasos 4–7 **NO EJECUTADOS**. No simular una promoción/rollback.

## 4. P0-B: identidad y telemetría que sí puede integrarse
- `cloudflare.script_exists` prueba recurso existente, no heartbeat ni ejecución.
- `cloudflare.cron_count=0` demuestra ausencia de cron en esos cuatro scripts, no ausencia total de activaciones por fetch/Queue.
- `access.allow/email` demuestra regla de acceso configurada, no 403 HTTP físico para un visitante externo.
- `supabase.work_job_v1.worker_id` y `browser_worker_metric_v2.worker_id` son **referencias históricas**, no identificaciones firmadas actuales.
- Conteos 6/117/18; 0 leases vigentes; 0 latidos recientes en fuentes consultadas. Únicamente los proveedores con un heartbeat timestamp de runtime autenticado + TTL + recibo de ejecución actual pueden acreditar actividad. Sin esa unión: estado NO_VERIFICADO.
- Evitar nuevos servicios, 150 agentes/servers, consumos de IA o planes para resolver falta de telemetría.

## 5. Condición de promoción
`P0-A_AUTH_NEGATIVES_REAL=GREEN` + `REVOCATION_POLICY=VERIFIED` + `PREVIEW_ROLLBACK_READBACK=GREEN` + `P0B_EXECUTOR_PROVENANCE=VERIFIED` + `FINOPS_MEASURED` + `POLICY/TRIBUNAL` + `OLD_VS_NEW=GREEN`. Hasta entonces: **`PROD=HOLD`, `AUTONOMOUS_CONTROL=false`**.

**Rollback de este documento:** revertir su commit de documentación únicamente, sin tocar servicio. **Coste nueva suscripción:** 0 €, consumo marginal NO_MEDIDO.

## 6. Ensayo ya realizado · cierre del gate de alias 2026-11-16

**Los pasos 1–2 que antes estaban BLOQUEADOS han sido resueltos sin cambiar configuración de proyecto:** `get_deployment({idOrUrl: alias})` confirma el destino REAL actual aun cuando `get_alias` responde 404. Se ejecutó `assign_alias` a la versión recuperable, readback `READY` del deployment viejo, carga en Opera de pantalla `Acceso seguro`, `assign_alias` al original y readback `READY` del original; SSO verificado después. **Resultado: PASS en rollback/restauración física del alias Preview; NO E2E login propietario, Edge ni PROD.** Referencia principal `cerebro/universal/v0/OPERATIVA_PREVIEW_ALIAS_ROLLBACK_RECEIPT_2026-11-16.md`.

La sección 3 debe interpretarse como PRECAUCIÓN PARA FUTURAS REPETICIONES, no como bloqueo pendiente del ensayo ya concluido. No repetir salvo necesidad funcional, especialmente para evitar cambios de tráfico y gastos innecesarios.
