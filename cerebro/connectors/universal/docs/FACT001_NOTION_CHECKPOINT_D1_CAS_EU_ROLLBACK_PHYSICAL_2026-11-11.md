# FACT-001 · D1 CAS Notion LAB UE · Prueba física y rollback
Fecha 2026-11-11 · PR #44 DRAFT · company_id=fenix-capital / engine_id=FACT-001 / environment=LAB / version=1.0.0

## HECHO
- Se creó **una D1 nueva** exclusivamente para checkpoint: `cerebro-fact001-notion-checkpoint-lab-eu`, UUID `bc085807-a6ca-4c56-a288-fe56716fec6f`, jurisdicción **EU**. Antes había 9 D1; ahora 10/10 en el plan Free. Ninguna suscripción nueva. **Esta creación ocupa la última plaza D1 gratuita**; no crear más bases ni contratar ampliaciones sin inventario/decisión.
- Fuente de esquema `services/notion-checkpoint-cas-lab/schema.sql`, SHA-256 `9fe5fb2dbe989c457f374a2104221d5f7215216029406cdad73d601d5d8964b7`. **2 tablas, 4 triggers**, sin cambio de objetos existentes. 6 tests aislados y [CI local SQL CAS #42924240468](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42924240468) superados.
- Checkpoint **real** inicial 25/v1 con primer ZIP cifrado recuperado de Drive, y actualización atómica 25→50/v2 con segundo ZIP cifrado recuperado de Drive. La consulta CAS repetida devolvió **0 filas, 0 cambios, 0 nuevas auditorías**.
- Se tomó bookmark `00000000-0000000c-00005120-c2494fa0d8dcc8f7dd99bc67053a92f8` de 25/v1; tras 50/v2 se probó **Time Travel restore físico** a ese bookmark. Lectura posterior: posición 25, v1, auditoría 0, seis objetos de esquema preservados. Se volvió a ejecutar CAS 25→50 y se verificó **posición 50, v2, auditoría exactamente 1**, SHA último ZIP `d8e93417190470f1d9ed34ffdd40962ff33a869869378b5ee580b1fca1641026`.
- Bookmark final `00000001-00000002-00005120-0c8f68f2e989b70ef0b41038a39ed857`. [Evidencia JSON física](../services/notion-checkpoint-cas-lab/evidence/physical-checkpoint-and-restore-20261111.v1.json).
- D1 original `cerebro-fact001-recovery-lab-eu` UUID `1305f791-7c44-47f9-946b-f330a09c88aa`: **0 objetos** con prefijo `fact001_notion_content_checkpoint_`; no se ha modificado por este bloque. Broker Supabase original sigue v33/hardening original.
- La exportación nativa de la D1 original ha completado y producido bookmark, pero **la descarga de SQL externa devuelve 403**; no declarar copia física SQL externa actual de la original. Esta carencia es precisamente la razón del checkpoint en D1 separada.

## ESTADO Y LÍMITES
- **Checkpoint D1 manual físicamente VERIFICADO, NO autonomía.** No existe todavía vínculo de servicio privado con permisos de escritura limitados a esta D1; la actualización se hizo mediante Cloudflare REST administrativo autorizada. No hay nuevas rutas públicas, ni cron, ni cola.
- Contenidos Notion cifrados en dos ZIP independientes con readback Drive: 49 páginas y 1 fuente con 68 filas / segundo lote 949 bloques. Fuente [evidencia segundo lote](FACT001_NOTION_SECOND_25_MIXED_CONTENT_PHYSICAL_BACKUP_VERIFIED_2026-11-11.md).
- No backup integral: otras 6.397 páginas y 185 fuentes sin exportar en esta secuencia; faltan binarios, comentarios, escrow independiente de AES, restauración física en Notion LAB, automatización CAS segura y medición de coste. Notion global **PARCIAL 6/11**.
- **Nunca modificar la D1 original, App, CRM, Notion PROD, DNS, main, ni promocionar la PR #44 por esta prueba.**

## Runbook de recuperación
1. Desactivar únicamente cualquier futuro escritor CAS privado (actualmente NO existe). No tocar otros Workers ni D1.
2. Consultar estado de D1 aislada y auditoría, cotejando contra checkpoint JSON y ZIP cifrados en GitHub/Drive.
3. Si corrupción localizada, usar Time Travel dentro de la ventana Free de 7 días y volver a aplicar únicamente las transiciones verificadas. Para pérdida fuera de esa ventana, reconstruir D1 NUEVA desde SQL versionado y registros Git + archivos Drive; nunca reemplazar la D1 original.
4. Validar los 6 objetos de esquema, 1 fila de checkpoint, versión y offset, auditoría y SHA de último ZIP. No habilitar tareas automáticas sin control de coste, autenticación OIDC, actor y CAS transaccional verificados.
