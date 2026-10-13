# VOICE-001 · Ana Voz + Console Voz · Runbook V1

## Alcance

VOICE-001 añade voz como modalidad de entrada/salida. No crea un backend conversacional paralelo.

- Ana Voz vive dentro del chat persistente existente y reutiliza exactamente `fenix_prod_chat_send_user` → `fenix-app-gateway` → `POST /chat` con `body` + `idempotency_key`.
- Console Voz reutiliza `cerebro-console-gateway-v0` → `POST /chat` con el mismo `message`, `conversation_context`, `pending_action`, `read_context` y `learning_candidate` que texto.
- Ambos usan el runtime canónico `src/cerebroVoice.ts` / `VOICE-001`; no existe un adapter duplicado por canal.
- Audio crudo no se guarda en CEREBRO.
- La transcripción final es texto ordinario y hereda autenticación, permisos, conocimiento, memoria, acciones, HUMAN_REQUIRED y aprendizaje del canal textual.
- Una transcripción de baja confianza queda preparada para revisión manual en el textarea y no se autoenvía.
- Una confirmación sensible de Console con baja confianza no se autoenvía.
- Si Web Speech API no existe o falla, el texto queda disponible sin degradar autoridad ni seguridad.

## Estado previo preservado

- `AudioTranscriptionGuard.tsx` se conserva como artefacto legado no montado. Su modo Ana local no se activa porque no representa el contrato conversacional canónico actual.
- No se modifica ninguna Edge Function ni RPC por este bloque.
- No se cambia RBAC/RLS ni ningún permiso.
- Ana texto conserva su `fenix_prod_chat_send_user` existente; la voz llama al mismo helper de envío.
- Console texto y voz comparten el mismo `sendMessage` y `/chat`.

## Gates

1. `npm run build` verde.
2. `voice-ui-ana-console.spec.ts` verde.
3. App Restoration / regresiones existentes verdes.
4. Ana: voz y teclado terminan en `fenix-app-gateway:/chat` mediante `fenix_prod_chat_send_user`.
5. Console: voz y teclado terminan en `cerebro-console-gateway-v0:/chat`.
6. Console sólo se monta con `CARLOS-ADMIN`; el backend sigue revalidando owner.
7. Acciones y HUMAN_REQUIRED siguen perteneciendo al Gateway, no a VOICE-001.
8. Baja confianza exige revisión antes de enviar; confirmación sensible de baja confianza nunca se autoejecuta.
9. Sin reconocimiento de voz, el envío por texto sigue funcionando.
10. Rollback probado antes de promover PROD.
11. Verificación física posterior al despliegue: interfaz real, identidad correcta, micrófonos presentes, envío semántico y ausencia de efectos no autorizados.

## Rollback

El rollback no requiere cambios de base de datos ni backend.

1. Revertir el merge de VOICE-001 UI.
2. La App vuelve a sus superficies textuales anteriores.
3. Los gateways y datos permanecen intactos.
4. Verificar build y los flujos de App Restoration.

## Aprendizaje continuo

VOICE-001 no aprende reglas directamente. Cada transcripción entra por el mismo canal textual autoritativo. Las señales de conversación/corrección alimentan el control de aprendizaje existente; cualquier mejora debe seguir `LRN-001 → OLD vs NEW → evaluación/Tribunal → PREPROD → canary → promoción o rollback`. Una conversación aislada no cambia una regla de PROD.

## Extensión de nuevos canales

Un canal nuevo se registra en `channel-registry.v1.json` y sólo puede pasar a activo si:

- existe contrato textual o adaptador autoritativo identificado;
- no amplía permisos;
- reutiliza contexto/memoria/aprendizaje existentes;
- tiene tests OLD vs NEW cuando cambie comportamiento;
- PREPROD, rollback y observabilidad están verdes.

No crear routers por canal si un adaptador sobre VOICE-001 cubre el contrato.
