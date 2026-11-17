# Console real → FACT-001 → NIA · corte v37 · 17/11/2026

## ESTADO · DESPLEGADO CON GATE PENDIENTE
Se actualizó **únicamente** la Supabase Edge Function `cerebro-console-gateway-v0`, proyecto `fenix-capital-prod`, de v36 a **v37**. App React, CRM, WordPress, D1, NIA/FACT Cloudflare Workers y GitHub main **no se modificaron**. El usuario autorizó continuar con la conexión de Console real tras el ensayo privado LAB. No se habilita autonomía de producción ni IA nativa de Notion: solo lectura de la Skill NIA en LAB mediante orden explícita del propietario.

**Contrato anterior** respaldado 4/4 archivos en `cerebro/backups/console-gateway-v36-20261117/`, SHA del artefacto Supabase v36 `236eafba0c4c3a401df2cd4c05fedeb7b635aa9658488a155622a4f52360e041`.

**Versión nueva** v37 `7642123e75ccd00249dc54cc53ae4b836037a48f3fed2fac79f0dac242d84b53`. Misma `withSupabase({auth:'user'})` y `authorizedOwner` (Auth `getUser` + RPC `fenix_prod_actor_context_by_auth_server`, exige `CARLOS-ADMIN`). Solo se añadió una importación en `index.ts` y dos líneas dentro de `chatReply` para reconocer `consulta NIA` o `NIA: [tema]`; **14/14** casos de selección probados. Otros archivos funcionales v36 idénticos byte a byte. El frontend sigue apuntando al endpoint habitual; no hay actualización React.

## Credencial aislada y prueba de transporte real
- Cloudflare permiso **Queues Write** comprobado por `cerebro-nia-queue-credential-bootstrap-lab` usando emisor previo de Vault (no reutilizaron claves generales como token de ejecución).
- Token nuevo con permiso único Queues Write de ámbito cuenta, almacenado en `vault.secrets` con nombre `cerebro_nia_cf_queues_write_lab_20261117`, vencimiento **2026-12-01 00:00 UTC**. **Rotación obligatoria antes de esa fecha**. No está limitado a una cola a nivel Cloudflare; el código servidor fuerza ID de cola NIA. No se imprime ni expone a React/ChatGPT.
- Bootstrap Supabase v1 emitió token y lo guardó directamente cifrado; luego sustituido por **v2 inerte HTTP 404** (`verify_jwt=true`). No deja una API de emisión activa.
- Prueba real desde Supabase Vault hacia Cloudflare Queue: `pg_net` id **41041**, respuesta HTTP 200 y `QUEUE_HTTP_AUTH_PASS`. Cloudflare Observability registró `FACT_NIA_PRIVATE_RESULT=PASS` y `NIA_CENTRAL_RECEIVER_GATE=PASS`. El token no fue copiado fuera de Vault.

## Pruebas OLD vs NEW y rollback físico del paralelo
- Candidato aislado Supabase `cerebro-console-nia-v36-parallel-lab` activo con la misma SHA `7642123e...`.
- Solicitud sin Auth → **401** en original y candidato; JWT inválido → **401** en ambos.
- Rollback paralelo: desplegado código exacto v36 como versión **2**, confirmó SHA original; restaurado código NIA candidato como versión **3** con SHA del candidato; prueba posterior sin Auth = 401.
- Tras aplicar al endpoint real v37, sin Auth (id `41056`) y con JWT inválido (id `41057`) → ambos **HTTP 401**, `MISSING_CREDENTIALS` y `INVALID_JWT`.
- **No se ha ejecutado un smoke positivo con la sesión real del propietario**: requiere que desde CEREBRO Console se envíe `consulta NIA`, sin entregar ni pegar JWT en chat. Por tanto NO declarar el uso de UI E2E como verificado.
- El rollback **de producción v37 a v36** no se disparó (no hubo fallo de las pruebas de seguridad); el procedimiento seguro es desplegar los cuatro archivos exactos `cerebro/backups/console-gateway-v36-20261117` con `verify_jwt=false`, comprobar 401 negativos y después validar chat real.

## Límites
- El envío devuelve `status: QUEUED` y `executed:false`; confirma publicación a Queue, NO tarea terminada.
- FACT y NIA continúan con permisos HMAC, Durable Object SQLite antirreplay y Notion GET Skill en LAB. No invoca la IA nativa Notion ni escribe páginas.
- La auditoría entre Edge/Cloudflare existe como logs de estado, pero **no hay todavía traza durable actor-correlación de punta a punta**; bloquear producción autónoma hasta resolver.
- Tokens Cloudflare de cuenta pueden escribir en otras Queues a nivel API: minimizar acceso en el runtime, caducidad y sustitución programada; no ampliar permisos ni utilizar claves generales.
- El costo nuevo de suscripción es 0 €; consumo dentro de proveedores existentes aún no medido.
- GitHub Actions no utilizado; mantener PR #70 **DRAFT** sin merge.

**Siguiente verificación concreta:** desde la sesión ya abierta del propietario en `https://app.fenixcapital.es/cerebro`, escribir o dictar únicamente **`consulta NIA`**, observar respuesta `QUEUED` y después comprobar `FACT_NIA_PRIVATE_RESULT=PASS` y `NIA_CENTRAL_RECEIVER_GATE=PASS` con la marca temporal. Sin esa prueba, el gate de usuario real sigue pendiente.

## Ruta exacta del smoke del propietario · UI ya existente (sin editar App)

Comprobado en `main`: `src/CerebroConsoleHost.tsx` selecciona **JARVIS** por defecto, y selecciona `CerebroConsoleShell` de **Console V0** cuando `?section=legacy-v0`. Ese componente usa `src/cerebroConsoleApi.ts`, cuyo endpoint `src/cerebroConsoleAccess.ts` apunta por defecto a `cerebro-console-gateway-v0` (salvo override de entorno).

**URL precisa de la prueba:** https://app.fenixcapital.es/cerebro?section=legacy-v0

Dentro de esa pantalla, con sesión propia del propietario, escribir o dictar exactamente `consulta NIA`. Esperado: `status:QUEUED`, sin publicación ni modificación Notion. Confirmar después los logs de FACT y NIA. Si la prueba falla, restaurar el snapshot original v36 desde GitHub; no enviar tokens de usuario al chat.

La vista JARVIS por defecto no está acreditada como cliente de este endpoint y **no debe confundirse** con la Console V0. La integración de JARVIS con NIA sigue pendiente; este parche cubre la Console V0 existente.
