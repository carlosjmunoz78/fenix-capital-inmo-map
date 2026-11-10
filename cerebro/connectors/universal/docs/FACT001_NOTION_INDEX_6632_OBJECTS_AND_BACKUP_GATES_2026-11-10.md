# FACT-001 · Notion / Inventario paginado independiente, backup y creación heredada
Fecha de evidencia: 2026-11-10. PR #44 DRAFT. Ámbito: fenix-capital / FACT-001 / LAB / 1.0.0.

## HECHO — inventario lógico de objetos accesibles (NO backup)
- Anterior: 58/58 raíces identificadas y verificadas individualmente mediante identidad independiente de CEREBRO; referencia E2E #42903411090 y tandas anteriores. Esto NO significa que 58 sean todos los objetos del workspace.
- Nuevo lector de metadatos `notion-search-index-inventory.mjs` utiliza integración de CEREBRO desde Vault y GitHub OIDC firmado; `POST /v1/search`, versión Notion `2026-03-11`, cursores opacos, `page_size=100`, sin títulos, bloques ni páginas devueltos. Cada consulta tiene límite; no admite SQL ni rutas arbitrarias.
- Primera prueba física [#42904757357](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42904757357) SUCCESS, 15 llamadas, 1500 resultados y `has_more=true`, por tanto **NO completa**.
- Segunda prueba física [#42905185981](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42905185981) SUCCESS, **67 llamadas a Search, 6632 objetos** y `has_more=false`: **6446 páginas + 186 data sources**. Hash SHA256 de IDs ordenados `205ca4905aafee82d1205c11b90685349b90e8c86062e4cca0dbb5edf4ca79ca`. Por tipo de padre: `workspace=42`, `page_id=758`, `database_id=186`, `data_source_id=5645`, `other=1`. Solo 44 de los 58 IDs previamente verificados aparecen como tales en el índice (no convertir esta diferencia en denegación de permisos: algunos recursos tienen tipo/representación distinta). Metadatos únicamente; sin contenido devuelto ni credencial en logs.
- Seguridad física del segundo ensayo: `ANON_401=PASS`, `FORGED_401=PASS`, `PROD_403=PASS`; sin escritura sobre Notion.
- **Esto es inventario de búsqueda de TODOS LOS OBJETOS ACCESIBLES por el token según la API de búsqueda, no certificación de TODO el workspace**. Deben validarse fuentes de datos/filas, bloques anidados, propiedades, comentarios, ficheros binarios, papelera, referencias entre páginas y contenidos inaccesibles, con paginación y snapshot consistente.

## NO DECLARAR VERDE
- `workspace_full_backup` sigue PENDING: NO hay todavía archivos completos ni export/restore físico de las 6446 páginas y 186 fuentes de datos.
- `production_promotion_policy`, `observability_and_audit`, `cost_guard_verified` integrales siguen PENDING.
- `autonomous_queue` global: sólo se ha probado 1 trabajo interno de Cron en LAB; no escrituras reales Notion.
- No procesar miles de páginas en una sola Edge Function con 70 ciclos de Search y 6446 GET de bloques; preparar trabajos acotados e idempotentes fuera del core transaccional.
- La exportación SQL privada verificada previamente corresponde a D1 Recovery FACT-001, **no sustituye** el respaldo de contenido Notion.

## FACTORY FIRST · especificación del backup completo sin suscripción nueva
1. Inventario raíz/índice y hash + checkpoint de cursor, vinculado a company_id/engine_id/environment/version (HECHO metadata).
2. Recorredor determinista con límites de API, cuotas, backoff controlado, paginación, registro de `data_source_id`, `block_id`, archivos y resultados por página. Separar payloads de auditoría y tokens.
3. Guardar snapshots cifrados de contenidos privados fuera de Supabase transaccional (destino existente a verificar: almacenamiento privado del propietario), hashes por chunk, manifest de cobertura, export independiente del runtime y política de retención.
4. Recuperación de prueba de una muestra representativa y después paridad completa en espacio aislado, sin alterar Wiki ni bases reales. Tribunal independiente con evidencia física; no afirmar fidelidad de comentarios, enlaces o archivos si su API no permite reconstrucción.
5. Integrar el controlador `notion-connected-parent-gate.mjs` para **nuevas páginas dentro de padres aprobados**, con GET inmediato bajo token CEREBRO y sin crear páginas raíz huérfanas. En el primer candidato `notion-connected-child-plan.mjs` SOLO la Wiki está aprobada como padre de creación; las demás 57 raíces están autorizadas para lectura, no son destinos implícitos de escritura.
6. Ejecutar una única creación sintética LAB por orden firmada, con ownership y readback persistentes, luego borrar/recuperar conforme a política y comprobar idempotencia y costes, antes de activar auto-creación normal.

## Estado de la fábrica
- Código de inventario de Notion y pruebas: CI SUCCESS #42905060286; físico SUCCESS #42905185981.
- Parent creation gate existente + módulo nuevo `notion-connected-child-plan.mjs`: pruebas CI verdes #42905586717, **todavía no conectado a ruta de creación autónoma**. Nunca considerar código por sí solo una creación real ni permiso global.
- Sin modificaciones en App/CRM, main, DNS, WordPress, otros Workers/D1; coste de contratación adicional 0 €. Mantener PR DRAFT.
