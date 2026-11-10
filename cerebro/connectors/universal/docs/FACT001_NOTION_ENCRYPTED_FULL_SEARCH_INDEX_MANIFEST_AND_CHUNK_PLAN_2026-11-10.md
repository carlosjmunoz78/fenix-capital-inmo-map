# FACT-001 · Notion — Manifiesto completo cifrado de IDs y base para lotes
Evidencia: 2026-11-10 · Rama `cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109`, PR #44 DRAFT · company_id=fenix-capital / engine_id=FACT-001 / environment=LAB / version=1.0.0

## HECHO: inventario de objetos Notion buscables, exportado y conservado
- Acceso independiente de CEREBRO a 58/58 raíces previamente acreditadas. La API Notion `POST /v1/search` con versión 2026-03-11 recorrió **67 páginas** (`page_size=100`) y terminó en `has_more=false`.
- **6632 objetos buscables accesibles al token**: 6446 páginas y 186 fuentes de datos. Se conservaron por objeto `id`, `object`, `parent`, `last_edited_time`, SIN títulos ni contenidos. No asumir que la búsqueda incluye basura, versiones históricas, archivos binarios, comentarios, permisos o elementos invisibles a la integración.
- Código `notion-encrypted-index-manifest.mjs`: no tiene operaciones de escritura, máximo 85 páginas por consulta, deduplicación y cursores anti-loop, SHA-256 de IDs ordenados y cifrado AES-256-GCM con IV aleatorio; clave bajo nombre Vault `cerebro_fact001_notion_backup_aes256_lab_v1`. Devuelve exclusivamente el manifiesto cifrado, métricas y hashes.
- [GitHub Actions #42914542679](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42914542679) **SUCCESS**, firmado GitHub OIDC: ANON_401=PASS, FORGED_401=PASS, PROD_403=PASS, `INDEX_MANIFEST_SEARCH_COMPLETE=true`, `INDEX_MANIFEST_RECONSTRUCTION=PASS`, `PROVIDER_WRITES=0`.
- Hash SHA256 del conjunto de IDs **`205ca4905aafee82d1205c11b90685349b90e8c86062e4cca0dbb5edf4ca79ca`**, coincide **exactamente** con el inventario independiente anterior (acciones #42905185981).
- Archivo JSON AES256-GCM interno: **2.143.534 bytes**, SHA256 `582d5bf5eab871c6f86fdb0256bb2bf2785b8f4a284b65f6ba50cb378f2b7957`; texto claro original de solo metadatos bajo autenticación AES de **1.607.074 bytes**, descifrado íntegro verificado en servicio (no revelado ni almacenado públicamente).
- ZIP GitHub Artifact **13808862248** (solo JSON cifrado), **1.614.735 bytes**, SHA256 `9c2c31831683c89186d76e466ec19de74eaa0eb20d1a2676aea21e56dbe3a702`, expiración de Actions **2027-02-08**.
- Google Drive existente, carpeta [FACT-001 · NOTION · BACKUPS CIFRADOS LAB](https://drive.google.com/drive/folders/1xQe5jd-AIQLDUlfZDktVod2qSJkS4M1E), archivo [ZIP del manifiesto Notion](https://drive.google.com/file/d/1NtAmHbYda-JBTgI8DJdKRRM-Ey-J2F9J/view?usp=drivesdk), ID `1NtAmHbYda-JBTgI8DJdKRRM-Ey-J2F9J`. Se descargó de Drive, tamaño y SHA256 ZIP cotejados con el artefacto original (**EXACT MATCH**). Un único miembro `notion-search-id-index-aes256gcm.json`; ninguna página en texto claro.
- El broker LAB temporal `notion-index-manifest-{seal,verify}` y el trigger de orden de un solo uso fueron retirados. `cerebro-fact001-headless-provider-lab` volvió a **v31 ACTIVE**, hash byte a byte original del broker read-only `645ae3995fa0cf478d589871f00f029be2ee6bfe6228b2e1a8ef1645b98022ec`. Sin rutas Notion de escritura.
- Ninguna nueva suscripción, DNS, App, CRM, main ni Worker/D1 original modificado.

## HECHO · Candidato FACT-001: planificador de lotes de objetos
- `notion-content-batch-planner.mjs`: ingiere el índice CIFRADO, valida AES/alcance/integridad, selecciona máximo **25 objetos** consecutivos, sella la lista de IDs y metadatos en otro sobre AES-256-GCM con **batch_ref determinista** por hash de índice + `offset` + `next_offset`. Guarda el siguiente desplazamiento numérico, NO concede operaciones de escritura.
- Test de 52 entradas confirma **25/25/2** sin duplicados ni fuga de IDs; reintentos tienen mismo `batch_ref` con IV distintos; llave falsa, cursor fuera de rango o índice parcial fallan cerrados.
- No hay aún un trabajador conectado a esos sobres ni cron/cola activada. No declarar backup de cuerpos o filas por existir el plan.

## Pendientes para declarar backup integral
1. Motor de exportación chunked de cuerpos de 6446 páginas y propiedades de 186 fuentes con checkpoint durable, reanudación, cambios durante la copia y validación de cobertura.
2. Exportación de binarios y comentarios, expiración de URL firmada y control de no recuperables.
3. Clave de emergencia fuera de Vault (escrow independiente bajo control del propietario), sin guardar la clave junto a los ZIP.
4. Restauración **física** sobre destino Notion LAB aislado y evidencia de paridad de bloques/ficheros; no tocar originales.
5. Gobernanza de escritura OIDC + roles, D1 CAS, auditoría, coste, PREPROD, comparación y rollback. Cron/notion writes OFF hasta pasar estos gates.

**Estado Notion global permanece 6/11 VERIFICADOS. El archivo de índice NO es un backup integral de contenido.**


## FÍSICO · Primer lote real de 25 objetos derivado del manifiesto cifrado
- Módulo `notion-content-batch-planner.mjs`: recibe exclusivamente un manifiesto autentificado AES-GCM y crea sobres cifrados de máximo 25 objetos, con `batch_ref` reproducible SHA-256 de `id_list_sha256:offset:next_offset`. Cursor determinista sin lista de IDs en texto claro.
- CI TESTS SUCCESS [#42915511239](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42915511239): 52 objetos => lotes 25/25/2, reintentos con referencia estable y nonce distinto, índices incompletos/alterados rechazados.
- Acciones [#42916209247](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42916209247) **SUCCESS**: descargó dentro del runner GitHub con token de acciones de lectura el ZIP de inventario `13808862248`, confirmó su hash exacto antes de abrirlo y envió solo el cifrado a la función LAB autorizada mediante JWT OIDC. `ANON_401=PASS`, `FORGED_401=PASS`, `PROD_403=PASS`.
- Lote #1 `batch_ref=50fc9fc1d7d6fd985dc58e238604fe534d3b536af9b86ccc77ad52fe2a1ea1c7`: **25 páginas, 0 data sources**, offset `0`→`25`, `has_more=true`. Estructura e índice fueron reconstruidos correctamente mediante clave Vault. `BATCH_ROUNDTRIP=PASS`, `QUEUE_ACTIVATED=false`, `CONTENTS_BACKED_UP=false`, `PROVIDER_WRITES=0`.
- Archivo JSON AES-GCM: 9387 bytes, SHA256 `daa4030cc8d9023d1c4369ca6c5afa2928b0f35e4f40f1466bb252b6f53d320a`; GitHub artifact ID **13808673839**, ZIP 7293 bytes, SHA256 `f041759233b1ad746466c3d3a1e275f5c49f286c2425429c7ae6fc840ed0d0b4`.
- Archivo DRIVE [ZIP primer lote cifrado](https://drive.google.com/file/d/1X1uO7YZNG0G075tGYvs1G_GoSMFbQUJa/view?usp=drivesdk), ID `1X1uO7YZNG0G075tGYvs1G_GoSMFbQUJa`, en carpeta ya existente. Readback 7293 bytes, SHA256 **EXACT MATCH**.
- Trigger de un solo uso, `actions: read` provisional, solicitud de orden y rutas `notion-index-plan-*` retiradas. Broker Supabase LAB **v33 ACTIVE** hash byte a byte original v31 `645ae3995fa0cf478d589871f00f029be2ee6bfe6228b2e1a8ef1645b98022ec`, sin escritor. PR #44 DRAFT.
- **Siguiente paso:** trabajador del lote 0→25 que abra cuerpos de páginas y genere archivos cifrados con checkpoint, sin exponer IDs ni datos personales, y ensayos de recuperación/escrow. El lote actual es **PLAN**, no copia de contenidos ni ejecución automática.

## No se promociona
La cobertura física de contenido continúa limitada a Wiki (64 bloques) y fuente de marketing (esquema y 11 filas), previos a este ensayo; `backup_and_rollback` global y la autonomía permanecen pendientes. Nada de PROD.

## HECHO FÍSICO · 25 contenidos cifrados con readback externo
- [Run #42921160489](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42921160489): **SUCCESS**, 25 páginas del lote 0→25 exportadas en modo read-only, 25 sobres AES-256-GCM autenticados, 0 fallos, autenticación ANON_401 / FORGED_401 / PROD_403 = PASS. GitHub Artifact `13812640522`.
- Copia cifrada [Google Drive](https://drive.google.com/file/d/1sGt2mXOLwK0AJCxfRNr8fY-dYVHjrR5p/view?usp=drivesdk) privada, bytes recuperados **454715**, SHA256 ZIP **`e38acdbaea08a7e79ca7e74636fb2781b39b483db346f1bc3d6fa5509c7e2f65`**, igualdad exacta con GitHub y CRC PASS. 25/25 paquetes individuales válidos.
- [Evidencia detallada](FACT001_NOTION_FIRST_25_CONTENT_PHYSICAL_BACKUP_VERIFIED_2026-11-10.md) y [checkpoint de respaldo offsite](../services/notion-content-export-lab/checkpoints/first-25-content-readback.v1.json), `content_next_offset=25`. Este checkpoint es **evidencia durable en GitHub**, NO checkpoint transaccional D1 CAS.
- Nuevo servicio LAB **independiente** `cerebro-fact001-notion-content-export-lab` v1; broker original `cerebro-fact001-headless-provider-lab` **v33 ACTIVE sin cambios de hash**.
- Sin modificaciones de contenido Notion, App, CRM o main, sin cron ni cola. No se declara backup integral: archivos binarios, comentarios, filas y restauración física quedan pendientes. Estado global **PARCIAL 6/11**.
