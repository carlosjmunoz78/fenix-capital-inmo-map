# Console real v36 → FACT/NIA · candidato en paralelo · 17/11/2026

**Contrato que se conserva:** Supabase Edge `cerebro-console-gateway-v0` versión 36 (`ezbr_sha256=236eafba0c4c3a401df2cd4c05fedeb7b635aa9658488a155622a4f52360e041`), 4 archivos, `withSupabase({auth:'user'})` y `authorizedOwner` llamando a `auth.getUser` y al RPC `fenix_prod_actor_context_by_auth_server` para exigir `CARLOS-ADMIN`. Ninguna ruta actual cambia en el candidato salvo el comando de chat exacto `consulta NIA` o `NIA: [tema]`.

**Red:** Supabase → REST Cloudflare Queues Write con token exclusivo cifrado en Vault `cerebro_nia_cf_queues_write_lab_20261117` (emisión 17/11, vence 01/12/2026) → cola existente FACT → RPC firmado HMAC privado NIA → Notion API GET. El token no va al frontend, a commits ni a logs; sólo se descifra en Edge tras autorización real del propietario. `QUEUE_HTTP_AUTH_PASS` y `FACT_NIA_PRIVATE_RESULT=PASS` + `NIA_CENTRAL_RECEIVER_GATE=PASS` comprobados por prueba real separada de transporte `pg_net` con credencial en Vault, HTTP 200.

**Bootstrap:** `cerebro-nia-queue-credential-bootstrap-lab` se desplegó efímeramente, comprobó el grupo exacto Queues Write, creó un token de cuenta con ese único grupo y lo guardó en Vault; luego se reimplantó como 404 inerte (v2, verify_jwt=true). No se usaron GitHub Actions.

**Cambio canario:** incorporar en `chatReply` antes de memoria/conversación el callback `maybeDispatchNiaConsoleRead(req,message,authorizedOwner)`. Cuando la frase no coincide retorna null: el resto del código v36 sigue idéntico. La respuesta `QUEUED` no se confunde con `DONE` ni promete ejecutar Notion AI.

**Gates pendientes antes de cambiar el endpoint de producción:** despliegue aislado de `cerebro-console-nia-v36-parallel-lab`, validar CORS/JWT (403/401 sin identidad), test positivo real con usuario propietario (no falsificar JWT), OLD vs NEW por revisión de fuente, comprobar logs, políticas y rollback. Registrar auditoría por actor y trazabilidad asíncrona, rotación del token antes de su caducidad. **Nunca reemplazar v36 activo sin completar esos controles y promoción segura**.
