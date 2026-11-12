# FACT-001 · Notion — Backup cifrado real + recuperación verificable (piloto LAB)
Fecha de prueba: 2026-11-10 · company_id=fenix-capital · engine_id=FACT-001 · environment=LAB · version=1.0.0

## HECHO · Evidencia física, no simulación
- La cuenta CEREBRO Notion conserva las 58 raíces conocidas con GET verificado y el índice paginado alcanzó 6632 objetos (6446 páginas, 186 fuentes de datos), 67 llamadas Search. Esto no acredita backup de contenido ni visibilidad de objetos fuera del índice.
- Se generó una clave aleatoria AES-256 dedicada en el Vault existente de Supabase, **nombre solamente**: `cerebro_fact001_notion_backup_aes256_lab_v1`. Nunca exponer/registrar valor o copiar a GitHub. Es independiente del token Notion `cerebro_notion_service_token_v1`.
- `notion-encrypted-pilot.mjs` produce cifrado AES-256-GCM por ejecución con IV aleatorio de 96 bits y AAD de versión fija, SHA-256 del plaintext, sin devolver datos legibles. Alcance fijo al recurso `Wiki Fénix Capital` ID `1c481b1a-756d-8002-813d-f3efdd4ecd89`.
- Proceso real firmado GitHub OIDC → broker CEREBRO LAB → Vault token Notion + clave AES → Notion API GET page + GET first 100 root blocks → AES-GCM → JSON cifrado → verificación de descifrado en memoria sin contenido en logs → GitHub Actions `upload-artifact` pinned SHA. Las órdenes anónimas y falsificadas devolvieron 401; PROD devolvió 403.
- [GitHub Actions #42909468033](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42909468033) **SUCCESS**, ambos pasos de snapshot y upload artifact; `FACT001_NOTION_BACKUP_DECRYPT_ROUNDTRIP=PASS`. Un archivo cifrado de **4452 bytes**, hash SHA-256 del JSON `600d5e9f0c28ae534417dd1a6b1b2b231703eb56a5c96e63915f6705bbb3f5af`; `block_count=3`, `nested_block_count=1`, `media_block_count=0`, `remaining_blocks=false`.
- Artefacto GitHub **ID 13805893693**, nombre `fact001-notion-wiki-encrypted-pilot-20261110`, tamaño ZIP 3555 bytes, SHA-256 ZIP `c0515a9fedee10932cebfb2e269157b6b97f13f3307d6deeb6396900ef05490f`, caduca **2027-02-08**, enlace a run anterior. **No es archivo permanente**.
- También se transfirió ese mismo ZIP **sin descifrar** al Drive existente, en carpeta nueva bajo `CEREBRO`: [FACT-001 · NOTION · BACKUPS CIFRADOS LAB](https://drive.google.com/drive/folders/1xQe5jd-AIQLDUlfZDktVod2qSJkS4M1E); archivo Drive ID `1-UTxTWSBEKD3TcxneEOZteR_IULbctGO`, [ZIP](https://drive.google.com/file/d/1-UTxTWSBEKD3TcxneEOZteR_IULbctGO/view?usp=drivesdk). El archivo se re-descargó desde Drive como ZIP original de 3555 bytes y su SHA-256 se comparó con el original y con el digest GitHub: **EXACT MATCH**. El ZIP contiene **un único JSON cifrado**, hash plaintext-ciphertext-file 600d5e9f0c28ae534417dd1a6b1b2b231703eb56a5c96e63915f6705bbb3f5af. No se publica el contenido privado.
- Después de una prueba real única se eliminó la orden y trigger one-shot del workflow y se retiraron ambas rutas temporales `notion-pilot-seal`, `notion-pilot-verify`. Broker `cerebro-fact001-headless-provider-lab` **v26 ACTIVE**, hash original exacto `645ae3995fa0cf478d589871f00f029be2ee6bfe6228b2e1a8ef1645b98022ec` (idéntico a v24): 12 archivos, sin escritura Notion. No se modificó APP, CRM, main, DNS, WordPress ni Cron original.
- Sin contratación adicional; almacenamiento existente Drive y GitHub Actions. No consta un presupuesto de coste de backup full-workspace medido.

## Qué acredita y qué NO
| Control | Estado |
|---|---|
| Token Notion independiente para lectura | VERIFICADO previamente |
| Clave AES-256 propia, en Vault | VERIFICADO |
| Cifrado real de contenido (página + tres bloques raíz) | VERIFICADO |
| Descifrado, reconstrucción JSON e integridad sin mostrar contenido | VERIFICADO, en memoria |
| Archivo ZIP reproducible en GitHub Actions | VERIFICADO |
| Copia independiente Drive y readback SHA256 exacto | VERIFICADO |
| Bloque hijo anidado completo | **PENDIENTE**: 1 bloque con hijos sin recorrer |
| 6446 páginas + 186 data sources, sus propiedades/filas/comentarios/adjuntos | **PENDIENTE** |
| Restauración física en un espacio Notion LAB separado | **PENDIENTE**; el roundtrip en memoria NO la sustituye |
| Custodia/escrow independiente de la clave para desastre de Supabase | **PENDIENTE**: la clave reside por ahora en Vault existente |
| Retención, versionado y backup incremental recurrente | **PENDIENTE** |
| Escritura autónoma y cola con permisos específicos | **PENDIENTE/OFF** |
| Aprobación de promoción PROD | **PENDIENTE** |

## Procedimiento de recuperación (controlado, sin exponer claves)
1. Recuperar el ZIP cifrado de Drive (archivo con ID verificado arriba). Comprobar SHA-256 ZIP `c0515a9fedee10932cebfb2e269157b6b97f13f3307d6deeb6396900ef05490f`.
2. Extraer el único JSON `notion-wiki-pilot-aes256gcm.json`. Verificar SHA-256 `600d5e9f0c28ae534417dd1a6b1b2b231703eb56a5c96e63915f6705bbb3f5af`.
3. Solo en servicio autenticado de CEREBRO LAB, leer la clave de `vault.decrypted_secrets` por **nombre**. Llamar `verifyEncryptedNotionPilot({encryptionKey,artifact})` después de validar versión, alcance y firma de la orden. El módulo usa autenticación AES-GCM, comparaciones SHA-256 y recuperación de la estructura JSON en memoria. No registrar el JSON descifrado.
4. Restaurar objetos Notion en **espacio LAB aislado** es OTRO paso **no ejecutado**: requiere autorización, reconciliación de IDs, notas sobre ficheros, prueba de reconstrucción, borrado/rollback seguros y aprobación del tribunal. No sobrescribir la Wiki ni una base real.
5. En pérdida de Vault, la copia cifrada no se puede descifrar sin escrow independiente; resolver antes de usar esto como backup de desastre integral.

## Siguiente bloque técnico
`FACT001_NOTION_RECURSIVE_CONTENT_CHUNKS_ENCRYPTED_DRIVE_OFFSITE_RESTORE_KEY_ESCROW`: adaptar el piloto a paginación recursiva con límite de bloques, registrar cursores, enumerar filas de 186 fuentes de datos, adjuntos binarios/comentarios, diseñar canales de almacenamiento privado con comprobación de integridad y escrow de clave. Hacer restore completo LAB sobre fixtures sintéticos. Después enlazar `notion-connected-parent-gate.mjs` y `notion-governed-operator.mjs` al runtime CEREBRO bajo transport firmado, D1 CAS, snapshots y auditoría. No habilitar PROD ni declarar 11/11 sin evidencia.

**Regla:** CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR. Los 58 accesos ya fueron verificados; no pedir nuevas conexiones para ese inventario.
