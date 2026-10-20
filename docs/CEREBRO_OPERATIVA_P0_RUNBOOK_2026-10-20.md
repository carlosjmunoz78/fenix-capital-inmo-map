# Runbook · CEREBRO OPERATIVA P0

1. Validar build/tests del candidato.
2. Inspeccionar diff y confirmar que no hay cambios de Gateway, Trading o PROD.
3. Desplegar solo por carril gobernado a candidate/PREPROD.
4. Para `cerebro-console-activity-v0`, usar el pipeline existente de Edge Functions; no editar la función viva a mano.
5. Ejecutar checklist físico de voz, conversaciones y procesos.
6. Si falla voz inicial: revertir lead-in antes de variar más de una causa.
7. Si falla historial: mantener chat V0 disponible y revertir módulos de history sin tocar Gateway.
8. Si falla diagnóstico: la UI debe degradar a resumen+evidencia; revertir lectura `run_id` si es necesario.
9. Solo con gates y aceptación en verde promover gradualmente.
