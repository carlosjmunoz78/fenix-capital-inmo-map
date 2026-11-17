# FACT-001 · Notion CONTENT BACKUP LAB · aislado

Scope: `fenix-capital/FACT-001/LAB/1.0.0`. PR #44 DRAFT. Objetivo: lote físico planificado 0→25 (`batch_ref=50fc9fc1d7d6fd985dc58e238604fe534d3b536af9b86ccc77ad52fe2a1ea1c7`). **No se declara respaldo completo hasta tener 25 sobres validados y copia offsite cotejada.**

## Arquitectura de ejecución (sin nuevos servicios de pago)
- `page-export.mjs`: módulo WebCrypto que valida AES-GCM de lote inmutable con 25 páginas, hace GET de página y paginación de descendientes, comprueba `last_edited_time` inicial/final, cifra TODO con AES-GCM y verifica la reconstrucción in-memory.
- `index.ts`: NUEVA función LAB independiente, sin modificar ni sustituir broker existente `cerebro-fact001-headless-provider-lab`. Requiere **GitHub OIDC de la rama LAB y workflow one-shot exacto** antes de leer Vault. Lee nombres privados de Vault, sin exponer claves. Solo acepta lote fijo, índice fijo, ítem 0..24. Cualquier fallo retorna código genérico sin datos.
- `run-once.mjs`: pipeline a ejecutar únicamente desde workflow propietario con request exacto. Descarga artefacto GitHub existente, valida SHA ZIP y JSON, envía lotes a servicio aislado con OIDC y guarda únicamente los ficheros CIFRADOS. Nunca registra claves/IDs/JSON descifrado. Los 25 sobres de salida solo se consideran recuperados si su artifact y copia externa en Drive se pueden leer y cotejar.
- Workflow `fact001-notion-content-export-once-lab.yml` separado. **Sin cron, sin workflow_dispatch, sin ejecuciones repetidas**. Sólo se activa con un commit de orden específico y del owner. CI en workflow separado.

## Gates obligatorios antes de ejecutar
1. Test local y GitHub CI verdes, static check de OIDC + GET only.
2. Registrar snapshot SHA de `cerebro-fact001-headless-provider-lab` v33; no despliegue sobre ese slug.
3. Comprobar que el nuevo slug aún no existe, desplegar SOLO él con `verify_jwt=false` porque utiliza OIDC validado criptográficamente dentro del handler; sin CORS ni rutas de contenido sin OIDC.
4. Prueba negativa: POST sin bearer y bearer inválido => HTTP 401, POST firma válida con scope PROD => HTTP 403.
5. Ejecutar lote 0→25 una única vez desde el workflow; en fallo abortar, guardar evidencia cifrada parcial sin mover checkpoint.
6. Subir ZIP cifrado de GitHub a carpeta Drive existente, leerlo de vuelta y cotejar SHA. Solo entonces documentar `25/25 archivadas`, manteniendo checkpoint pendiente de CAS durable.

## Limitaciones explícitas
No se guardan binarios/media ni comentarios de Notion, no se restablecen páginas en destino Notion, no se procesan filas de 186 data sources, no hay plan para páginas >2.1MB o >40 requests (se marcan BLOQUEADAS para futuro chunking). Ningún archivo de contenido o dato personal en plaintext debe escribirse a GitHub, Drive, CLI ni logs. El Vault sigue siendo un punto único hasta escrow independiente.

## Deshacer
Revertir únicamente commits de esta nueva carpeta y los 2 nuevos workflows en la rama DRAFT. Para deshabilitar la función aislada, re-desplegarla como `404` antes de retiro mediante panel seguro: la reversión nunca afecta broker v33. No fusionar a main ni activar PROD.