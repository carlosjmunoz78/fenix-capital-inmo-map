# VOICE-001 · Ana Voz + Console Voz · Runbook V1

## Alcance

VOICE-001 añade voz como modalidad de entrada/salida. No crea un backend conversacional paralelo.

- Ana Voz reutiliza exactamente `fenix-app-gateway` → `POST /v2/ana/knowledge/answer` → `fenix_prod_ana_knowledge_answer_server` con `{question}`.
- Console Voz reutiliza `cerebro-console-gateway-v0` → `POST /chat` con el mismo `message`, `conversation_context`, `pending_action`, `read_context` y `learning_candidate` que texto.
- Ambos usan el runtime canónico `src/cerebroVoice.ts` / `VOICE-001`; no existe un backend de voz por canal.
- Audio crudo no se guarda en CEREBRO.
- La transcripción final es texto ordinario y hereda autenticación, permisos, conocimiento, memoria, acciones, HUMAN_REQUIRED y aprendizaje del canal autoritativo.
- Una transcripción de baja confianza queda preparada para revisión manual y no se autoenvía.
- Una confirmación sensible de Console con baja confianza no se autoenvía.
- Si Web Speech API no existe o falla, el texto queda disponible sin degradar autoridad ni seguridad.

## Estado previo preservado

- `AnaChatBlock.tsx` mantiene bit-a-bit su chat interno persistente; VOICE-001 no lo convierte en Ana inteligente ni mezcla conversaciones humanas con el asistente.
- `AudioTranscriptionGuard.tsx` se conserva como artefacto legado no montado. Su modo Ana local no se activa porque no representa el contrato conversacional canónico actual.
- No se modifica ninguna Edge Function ni RPC por este bloque.
- No se cambia RBAC/RLS ni ningún permiso.
- Console texto y voz comparten el mismo `sendMessage` y `/chat`.

## Gates

1. `npm run build` verde.
2. `voice-ui-ana-console.spec.ts` verde.
3. App Restoration / regresiones existentes verdes.
4. Ana: voz y teclado terminan en `fenix-app-gateway:/v2/ana/knowledge/answer` con `{question}`.
5. El chat interno existente de Ana permanece sin cambios.
6. Console: voz y teclado terminan en `cerebro-console-gateway-v0:/chat`.
7. Console sólo se monta con `CARLOS-ADMIN`; el backend sigue revalidando owner.
8. Acciones y HUMAN_REQUIRED siguen perteneciendo a los Gateways, no a VOICE-001.
9. Baja confianza exige revisión antes de enviar; confirmación sensible de baja confianza nunca se autoejecuta.
10. Sin reconocimiento de voz, el envío por texto sigue funcionando.
11. Rollback probado antes de promover PROD.
12. Verificación física posterior al despliegue: interfaz real, identidad correcta, micrófonos presentes, envío semántico y ausencia de efectos no autorizados.

## Rollback

El rollback no requiere cambios de base de datos ni backend.

1. Revertir el merge de VOICE-001 UI.
2. La App vuelve a sus superficies anteriores.
3. Los gateways, chat interno y datos permanecen intactos.
4. Verificar build y los flujos de App Restoration.

## Aprendizaje continuo

VOICE-001 no aprende reglas directamente. Cada transcripción entra por el mismo canal autoritativo. Las señales de conversación/corrección alimentan el control de aprendizaje existente; cualquier mejora debe seguir `LRN-001 → OLD vs NEW → evaluación/Tribunal → PREPROD → canary → promoción o rollback`. Una conversación aislada no cambia una regla de PROD.

## Extensión de nuevos canales

Un canal nuevo se registra en `channel-registry.v1.json` y sólo puede pasar a activo si:

- existe contrato textual o adaptador autoritativo identificado;
- no amplía permisos;
- reutiliza contexto/memoria/aprendizaje existentes;
- tiene tests OLD vs NEW cuando cambie comportamiento;
- PREPROD, rollback y observabilidad están verdes.

No crear routers por canal si un adaptador sobre VOICE-001 cubre el contrato.
