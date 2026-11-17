# FACT-001 · Notion primer lote de 25 páginas · CONTENIDO CIFRADO VERIFICADO
Fecha: 2026-11-10 · company_id=fenix-capital · engine_id=FACT-001 · environment=LAB · PR #44 DRAFT

## HECHO FÍSICO
- Lote autenticado del inventario de 6.632 objetos: `batch_ref=50fc9fc1d7d6fd985dc58e238604fe534d3b536af9b86ccc77ad52fe2a1ea1c7`, posiciones 0..24 (offset lógico siguiente 25). Hash SHA de ID-index: `205ca4905aafee82d1205c11b90685349b90e8c86062e4cca0dbb5edf4ca79ca`.
- [GitHub Actions ejecución real #42921160489](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42921160489): SUCCESS, 25/25 sobres cifrados con AES-256-GCM, 0 fallos, 0 escrituras en Notion, 0 traslado de checkpoint durante el job. `FACT001_OIDC_ANON_401=PASS`, `FACT001_OIDC_FORGED_401=PASS`, `FACT001_OIDC_PROD_403=PASS`.
- Cada página se leyó con GET, descendientes y paginación, verificación de `last_edited_time` antes/después, cifrado autenticado y reconstrucción en memoria con misma clave Vault, sin salida de texto claro. 25/25 banderas `verify_roundtrip=true`.
- [GitHub Artifact 13812640522](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42921160489) — ZIP 454715 bytes, 25 archivos `page-NN.aes256gcm.json` + `proof.json`. ZIP SHA-256: `e38acdbaea08a7e79ca7e74636fb2781b39b483db346f1bc3d6fa5509c7e2f65`.
- [Google Drive privado · ZIP 25 contenidos cifrados](https://drive.google.com/file/d/1sGt2mXOLwK0AJCxfRNr8fY-dYVHjrR5p/view?usp=drivesdk), ID `1sGt2mXOLwK0AJCxfRNr8fY-dYVHjrR5p`, carpeta existente `1xQe5jd-AIQLDUlfZDktVod2qSJkS4M1E`. Descarga autenticada independiente de Drive a contenedor diferente, 454715 bytes, SHA-256 **exactamente igual** `e38acdbaea08a7e79ca7e74636fb2781b39b483db346f1bc3d6fa5509c7e2f65`. ZIP CRC PASS; 26 archivos, 25 sobres diferentes; 25/25 esquemas válidos y 25 estados `SEALED_AND_MEMORY_REBUILT`.
- Nuevo servicio **aislado** `cerebro-fact001-notion-content-export-lab` ACTIVE v1 en el proyecto Supabase ya contratado, con OIDC verificado en aplicación y sin cron/colas. No se sustituyó el broker original `cerebro-fact001-headless-provider-lab`, que sigue ACTIVE v33, hash `645ae3995fa0cf478d589871f00f029be2ee6bfe6228b2e1a8ef1645b98022ec`.
- GitHub CI candidato 12/12 local y remoto VERDE. No nuevas suscripciones, ni App/CRM/main/DNS/Notion originales modificados. Consumo dentro del plan existente, coste marginal sin medición externa independiente.

## Checkpoint
- El operador corrió con `checkpoint_committed=false` para no moverlo antes del readback.
- Tras comprobar el SHA del archivo recuperado desde Drive, **se registra** un checkpoint de evidencia durable en GitHub: `services/notion-content-export-lab/checkpoints/first-25-content-readback.v1.json`, `content_next_offset=25`, con copia offsite verificada y prueba de integridad.
- **NO declarar checkpoint D1 CAS hecho:** `d1_cas_checkpoint_committed=false`. Antes de la ejecución autónoma de lotes posteriores, integrar CAS durable, reanudación, deduplicación y auditoría.

## NO HECHO · requisitos para backup integral Notion
- Quedan otros 6.607 objetos del inventario buscable sin contenido respaldado por este ciclo (sin afirmar que todos sean páginas), y se deben incluir filas/propiedades de 186 fuentes.
- No se han descargado los binarios, comentarios, datos borrados/versiones ni permisos; un URL firmado de adjunto puede caducar.
- No hay custodia independiente de la clave fuera de Vault ni restauración física de los 25 bloques en una cuenta Notion LAB aislada.
- Comprobación global sigue **PARCIAL 6/11**; no aprobar backup integral ni autonomía PROD.

## Protecciones y reversión
- PR #44 DRAFT, alcance fijo LAB, lectura de Notion, OIDC exacto, RESTORE OFF, cron OFF, cola OFF, sin escrituras ni migraciones.
- Si hubiera incidente, desactivar únicamente la nueva función LAB y no tocar el broker original. Los ZIP y ledger permanecen en Drive y GitHub.
