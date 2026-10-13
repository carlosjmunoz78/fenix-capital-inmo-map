# VOICE-001 · Ana Voz + Console Voz · Runbook V1

## Alcance

VOICE-001 añade voz como modalidad de entrada/salida. No crea un backend conversacional paralelo.

- Ana Voz reutiliza `fenix-app-gateway` → `POST /v2/ana/knowledge/answer` con `{question}`.
- Console Voz reutiliza `cerebro-console-gateway-v0` → `POST /chat` con el mismo `message`, `conversation_context`, `pending_action`, `read_context` y `learning_candidate` que texto.
- Audio crudo no se guarda en CEREBRO.
- La transcripción final es texto ordinario y hereda la autenticación, permisos, conocimiento, memoria, acciones, HUMAN_REQUIRED y aprendizaje del canal textual.
- Si Web Speech API no existe o falla, el texto queda disponible sin degradar autoridad ni seguridad.

## Estado previo preservado

- `AudioTranscriptionGuard.tsx` se conserva como artefacto legado no montado. No se reutiliza porque su modo Ana genera una respuesta local basada en reglas y no representa el contrato conversacional canónico actual.
- No se modifica ninguna Edge Function ni RPC por este bloque.
- No se cambia RBAC/RLS ni ningún permiso.

## Gates

1. `npm run build` verde.
2. `voice-ui-ana-console.spec.ts` verde.
3. App Restoration / regresiones existentes verdes.
4. Ana: voz y teclado terminan en `/v2/ana/knowledge/answer`.
5. Console: voz y teclado terminan en `/chat`.
6. Console sólo se monta con `CARLOS-ADMIN`; el backend sigue revalidando owner.
7. Acciones y HUMAN_REQUIRED siguen perteneciendo al Gateway, no al adaptador de voz.
8. Sin reconocimiento de voz, el envío por texto sigue funcionando.
9. Rollback probado antes de promover PROD.
10. Verificación física posterior al despliegue: interfaz real, identidad correcta, micrófonos presentes, envío semántico y ausencia de efectos no autorizados.

## Rollback

El rollback no requiere cambios de base de datos ni backend.

1. Revertir el commit/merge de VOICE-001 UI.
2. La App vuelve a sus superficies textuales anteriores.
3. Los gateways y datos permanecen intactos.
4. Verificar build y los cinco flujos de App Restoration.

## Extensión de nuevos canales

Un canal nuevo se registra en `channel-registry.v1.json` y sólo puede pasar a activo si:

- existe contrato textual o adaptador autoritativo identificado;
- no amplía permisos;
- reutiliza contexto/memoria/aprendizaje existentes;
- tiene tests OLD vs NEW cuando cambie comportamiento;
- PREPROD, rollback y observabilidad están verdes.

No crear routers por canal si un adaptador sobre VOICE-001 cubre el contrato.
