# Rollback · CEREBRO OPERATIVA P0 voz/historial/procesos

Candidato: `cerebro/p0-voice-history-process-20261020`
Base conservada: `47485459f1ee2d3060fac60df31a81d3134c1296`

## Alcance reversible

El candidato añade/cambia exclusivamente código frontend, tests, documentación y el código fuente read-only de `cerebro-console-activity-v0`.

No hay migraciones de base de datos, cambios de credenciales, Trading, escrituras productivas ni cambios del Gateway conversacional.

## Procedimiento

Antes de PROD, el rollback consiste en no promover el candidato o revertir su merge completo. Si la Edge Function de actividad llegara a desplegarse en PREPROD, restaurar la versión anterior del archivo `supabase/functions/cerebro-console-activity-v0/index.ts` correspondiente a la base indicada y ejecutar el pipeline gobernado de función.

El historial local usa claves nuevas (`cerebro_conversations_v1`, `cerebro_active_conversation_v1`). Al retirar el frontend nuevo esas claves quedan inertes; no afectan a App/CRM ni requieren borrado.

## Prueba de rollback requerida

La comparación OLD vs NEW debe confirmar que volver a la base mantiene la Console V0/OPERATIVA anterior, su chat, voz y actividad sin depender de los nuevos módulos de historial o diagnóstico.
