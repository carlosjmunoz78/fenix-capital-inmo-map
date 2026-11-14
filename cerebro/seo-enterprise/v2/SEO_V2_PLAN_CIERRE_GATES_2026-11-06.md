# SEO Enterprise V2 — Plan de cierre por gates (2026-11-06)

Estado: DEFINIDO, NO CERTIFICACIÓN. Fuente única: inventario congelado 2026-11-05 y evidencias existentes en esta PR. No auditar web, no usar STAGING ni cambiar PROD.

## Orden de ejecución sin duplicación
1. **IAM-001 (P0):** inventariar el router y roles existentes; exigir identidad autenticada por actor o delegación acreditada con scopes mínimos, separación autor/QA/juez, revocación, auditoría y pruebas negativas. Las 141 firmas efímeras actuales no son 141 principals IAM. Sin gate no promocionar.
2. **D32 (P0):** ejecutar respuestas nuevas de agentes reales sobre casos de especialidad del corpus aceptado; conservar entradas, salidas, modelo/runtime, coste y huellas. Las 423 respuestas deterministas son baseline, no exámenes.
3. **D31 + tribunal (P0):** evaluar calidad profesional independientemente, sin autoevaluación; rúbricas SEO, YMYL hipotecario, evidencia, citas, no invención, calidad editorial; registrar errores y reexamen. Ningún mérito o permiso automático.
4. **Gateway/JOB-001 (P1):** probar enlace durable e idempotente en entorno aislado, recibos, observabilidad, presupuesto 0, kill switch, backup de journal, recuperación y rollback; no fabricar 32 servidores.
5. **Certificación gradual (P1):** por cada departamento: binding real, identidad, tarea auténtica, QA independiente, tribunal, formación, observabilidad y rollback probados. Marcar LISTO únicamente con recibos verificables. Hasta entonces 0/32 PROD certificados.

## Protocolo de ejecución
- Comparar HEAD de PR #22 y evidencia antes de cada bloque; saltar lo ya acreditado.
- Cada cambio debe ser aditivo en rama DRAFT, con snapshot SHA anterior, test afectado, prueba negativa y rollback documentado.
- No fusionar, publicar, desplegar, conceder permisos, crear suscripciones ni consumir IA de pago.
- Si falta un acceso humano, registrar HUMAN_REQUIRED exacto y continuar otras tareas independientes.
- Informar únicamente de P0, regresión, decisión humana genuina o cierre material. No afirmar 32/32 por tests sintéticos.

## Criterio de salida
Un departamento certificado requiere identidad, ejercicio profesional no determinista, D31 independiente, tribunal, enlace Gateway persistente, monitorización y rollback demostrados. El cumplimiento de un contrato o test de hash no acredita autonomía.

## Estado inicial preservado
8 familias, 32 departamentos, 141 especializaciones, 200 URL (166 páginas + 34 artículos), 629 imágenes, 423 prácticas L0 deterministas. Pipeline L0 GREEN, 0 identidades IAM individuales acreditadas y 0/32 departamentos autónomos PROD certificados, salvo evidencia posterior comprobada.
