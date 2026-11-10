# FACT-001 · Notion: exportador de contenido por página (LAB candidato)
Fecha 2026-11-10 · PR #44 DRAFT · company_id=fenix-capital · environment=LAB

## Implementado en la rama (no desplegado)
- `notion-content-page-export.mjs` valida un lote autenticado AES-256-GCM y obtiene una página seleccionada mediante llamadas **GET** a Notion, con paginación y bloques anidados, y cifra el resultado sin devolver identificadores ni texto claro en el sobre externo.
- Seguridad fail-closed: límites de solicitudes/tamaño, errores API, bucles de paginación, identidad/alcance del lote y autenticidad AEAD. No ejecuta escrituras, no actualiza checkpoints y no inicia cron/cola.
- Pruebas aisladas: `node --test cerebro/connectors/universal/services/provider-headless-lab/tests/notion-content-page-export.test.mjs` (8 escenarios). El CI de la rama recoge automáticamente los ficheros `tests/*.test.mjs` al hacer push.

## Estado físico y siguientes gates
- **Solo candidato Git / CI**. Las 25 páginas de `batch_ref=50fc9fc1d7d6fd985dc58e238604fe534d3b536af9b86ccc77ad52fe2a1ea1c7` todavía **NO** están exportadas. Offset de planificación 0→25 no equivale a checkpoint de backup completado.
- **Pendiente**: conectar por runtime seguro con acceso a Vault y OIDC a una identidad de lectura legítima; leer el paquete cifrado ya existente sin revelar clave/IDs, enviar cada item a exportación; almacenar resultados cifrados en Drive y verificar readback SHA256 por item antes de avanzar CAS durable.
- **Pendiente**: binarios, comentarios, control de cambios durante snapshot, manejo de páginas excesivas mediante fragmentación, restauración en Notion LAB aislado, escrow independiente y finops antes de considerar 7/11 controles.
- **Bloqueos activos**: nadie debe abrir una ruta HTTP pública que acepte plan de otro cliente, leer secretos en GitHub ni utilizar PROD como destino. `notion-content-page-export.mjs` usa Node `node:crypto`: su ejecución en un Supabase Edge Function no está probada; no importarlo directamente a un broker vivo sin adapter y tests.
- Prohibido: modificar Notion original, App, CRM, main, DNS, cron/colas, cuentas Cloudflare, o fusionar PR #44.

## Reversión
Commit exclusivamente aditivo. Rollback: revertir este commit en rama DRAFT, sin despliegues ni cambios de esquema.