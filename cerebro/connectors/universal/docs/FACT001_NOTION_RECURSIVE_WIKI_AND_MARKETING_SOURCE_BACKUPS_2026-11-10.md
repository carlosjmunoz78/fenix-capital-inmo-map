# FACT-001 · NOTION · Bloques recursivos + fuente de datos: backups cifrados reales en LAB
Fecha de evidencias: 2026-11-10 · company_id=fenix-capital · engine_id=FACT-001 · environment=LAB · version=1.0.0.

## Referencia preexistente, CONSERVADA
- 58/58 raíces conocidas: token Notion independiente CEREBRO + GitHub OIDC verificado.
- Índice de búsqueda accesible: **6632 objetos**, 6446 páginas, 186 fuentes de datos, paginación exhaustiva 67 consultas Search. Es índice, NO backup full-workspace.
- Backup inicial: Wiki raíz con 3 bloques directos, AES-256-GCM, artefacto Github y Drive; el bloque hijo todavía no se había exportado.
- Clave propia solo en Vault, nombre `cerebro_fact001_notion_backup_aes256_lab_v1`; el valor no está en GitHub, Drive, logs ni en este registro.

## HECHO · Backup recursivo de bloques Wiki, leído físicamente
1. Módulo `notion-recursive-chunk.mjs`, LAB candidato. Consulta exclusivamente `Wiki Fénix Capital` id `1c481b1a-756d-8002-813d-f3efdd4ecd89`. GET página y BFS por bloques hijos con cursores; límites 12 peticiones de bloques, 50 bloques por petición, profundidad máxima 4 y 4,5 MB de texto claro antes de sellar. Cualquier cola pendiente permanece dentro del archivo cifrado, NO se declara completa.
2. La prueba [Actions #42911324722](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42911324722) fue **SUCCESS**: 64 bloques capturados, 3 llamadas de bloques, 3 chunks, **0 tareas pendientes**, `complete_root_block_tree=true`; media referenciada=0 para los bloques observados. (El GET raíz es una petición adicional; el contador `api_requests=3` del manifiesto se refiere a las peticiones de bloques.)
3. Identidad: anónimo 401 PASS, firma falsa 401 PASS, orden PROD 403 PASS; Notion sin escrituras. Verificación AES-256-GCM con clave Vault, reconstrucción JSON de los bloques y SHA-256, **PASS en memoria**, NO restauración física en Notion.
4. Archivo JSON cifrado dentro del ZIP: 68245 bytes, SHA256 `d23e0b81cb21501ee789cf1d7d4d13c5856a9c1c1693dc583e13a1f3b36669fb`. ZIP GitHub Actions artefacto **13806529150**, tamaño 51631 bytes, SHA256 `f4b219a7710fe9bd589e62a954e01dbc3a24f4f5c363e60893e3299313ba470e`, retención hasta **2027-02-08**.
5. Segunda copia **Drive de CEREBRO / FACT-001 · NOTION · BACKUPS CIFRADOS LAB**:
   - carpeta ID `1xQe5jd-AIQLDUlfZDktVod2qSJkS4M1E`;
   - archivo ID `1PWCm9wKOSB-LtGAly9-RfDqVUiVW3aYF`; [ZIP cifrado de Wiki](https://drive.google.com/file/d/1PWCm9wKOSB-LtGAly9-RfDqVUiVW3aYF/view?usp=drivesdk).
   - re-descargado desde Drive, `sha256` original EXACT MATCH, un solo miembro ZIP `notion-wiki-recursive-aes256gcm.json`, solo envelope AES sin documentos en claro.

**LÍMITE:** raíz de Wiki y descendientes accesibles como árbol de bloques; NO son los 6632 objetos restantes, ni los archivos binarios, comentarios o filas de otras bases.

## HECHO · Backup de propiedades de una fuente de datos real
1. Fuente fija de marketing `muestra_limpia_5_dias_redes_fenix_julio_2026` de Notion, data source ID `38981b1a-756d-81e0-9936-000b6a8c430c`, base contenedora ID `38981b1a-756d-8008-95e1-d1d80c2f7623`. Ambos IDs extraídos de la base existente (no inventados).
2. `notion-datasource-pilot.mjs`: GET esquema y POST al endpoint de consulta, **de solo lectura**, paginación máxima cuatro páginas de 50 resultados y cursor de continuación cifrado si queda pendiente. Sin descargar archivos ni cuerpos de bloques de registros.
3. CI del módulo (incluidos tests de falsificación, paginación y descifrado) PASS. Ejecución firmada [Actions #42912667491](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42912667491) **SUCCESS**: **11 registros**, 1 página de resultados, `has_more=false`. Se incluyeron esquema y propiedades de los 11 registros, con cifrado AES-256-GCM de clave Vault independiente; descifrado/verificación en memoria PASS; 0 escrituras.
4. Archivo JSON cifrado: 98743 bytes SHA256 `e66379d473b1e31c700dad2ef3434276babc1caf5da82e0e8fe470a7ec42e22a`. Artefacto Github **13807872192**, ZIP 74557 bytes SHA256 `7a58c584274077bfab0b3c0193f9c184dbca6e3aedb9f0adc6ae382630bcf8c3`, caduca 2027-02-08.
5. Copia independiente en el mismo Drive: archivo ID `1hQZmrLEgtxJJzOLjTfyYfW2pm3NXr-vn`; [ZIP cifrado de registros](https://drive.google.com/file/d/1hQZmrLEgtxJJzOLjTfyYfW2pm3NXr-vn/view?usp=drivesdk). Leído de nuevo de Google Drive (74557 bytes) con SHA-256 **EXACT MATCH**.
6. Fallo aislado y resuelto: la primera Actions #42912383835 se detuvo antes del piloto porque el test genérico de Cloudflare recibió `UPSTREAM_RATE_LIMIT` 503; ningún secreto expuesto. Segundo run acotó la prueba a Notion sin tocar el proveedor y PASS. La condición temporal de salto se eliminó después; el workflow normal vuelve al estado anterior.

## CIERRE: NO RUTAS DE EXPORT ACTIVAS
- Trigger/orden única eliminados tras cada ensayo y rutas provisionales del broker LAB desactivadas.
- Edge Function `cerebro-fact001-headless-provider-lab` **v29 ACTIVE**, hash byte a byte original `645ae3995fa0cf478d589871f00f029be2ee6bfe6228b2e1a8ef1645b98022ec`, 12 archivos, sin ruta de escritura Notion, OIDC intacto.
- PR #44 DRAFT sin merge; main, App/CRM, WordPress, DNS, otros Workers/D1 y Trading aislado intactos. Sin contratación adicional.

## GATES INTEGRALES QUE NO PUEDEN PROMOVERSE TODAVÍA
| Requisito | Estado |
|---|---|
| 58 raíces autorizadas | VERIFICADO en lectura |
| Índice accesible de 6632 objetos | VERIFICADO (solo Search) |
| Export cifrado recursivo de una Wiki | VERIFICADO (64 bloques, árbol completado) |
| Export cifrado de una fuente de datos | VERIFICADO (esquema y 11 filas) |
| Dos duplicados cifrados Drive con hash de readback | VERIFICADO |
| Archivo íntegro de 6446 páginas, 186 data sources y todos sus bloques, registros y adjuntos | **PENDIENTE** |
| Reproducción física en Notion LAB sin comprometer origen | **PENDIENTE** |
| Key escrow independiente de Supabase Vault y recuperación por desastre | **PENDIENTE** |
| Inventario de comentarios, historiales, permisos, ficheros expirados, papelera y objetos fuera de Search | **PENDIENTE** |
| Cola de escritura CEREBRO con orden firmada, CAS, snapshots, auditoría, coste y rollback integrados | **PENDIENTE/OFF** |

El estado de gates Notion global **continúa 6/11 VERIFIED**. Las copias piloto NO autorizan pasar a PROD.

## Siguiente bloque técnico sin coste adicional
- FACT001_NOTION_BACKUP_ENGINE_V0: diseñar chunking por `page_id`/`data_source_id` con checkpoint y lote, almacenar artefactos cifrados y hash en Drive, checksum end-to-end sin almacenar secretos; observar costes y caducidad.
- Una segunda ubicación para una **clave de recuperación** no puede ser solo otra copia del ZIP: requiere custodia independiente segura, por ejemplo clave envuelta con secreto que controle el propietario. **No copiar la clave Vault en el repositorio ni guardarla junto a los ZIP.**
- Preparar espacio/restauración LAB sintética y tribunal verificable antes de autonomía. Mantener el runtime de Notion OFF.
