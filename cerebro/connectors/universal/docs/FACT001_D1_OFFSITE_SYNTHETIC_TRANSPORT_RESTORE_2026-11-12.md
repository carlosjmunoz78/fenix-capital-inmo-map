# FACT-001 · D1 · Offsite + restore desde Drive · FIJACIÓN SINTÉTICA (12-11-2026)

**HECHO:** Prueba física de transporte independiente GitHub Actions → ZIP cifrado → Drive privado → descarga desde Drive → autenticación AES-256-GCM → recuperación SQLite in-memory. Es **SINTÉTICA, NO ES EL BACKUP DE D1 REAL**.

## Prueba
- Workflow aislado sin credenciales ni llamadas a proveedores: [GitHub Actions #43122699486](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43122699486), SUCCESS; artifact ID 13901038278.
- ZIP de 1403 bytes, SHA256 GitHub `4588c0ff2d5be31f707e34c8c413bc4ba9c6f4c9b9f32271e98f7b772521cb05`. Sólo incluye envelope y prueba sintética; no SQL en claro ni credenciales.
- [Archivo privado en Drive](https://drive.google.com/file/d/1vl7JDbBaKSYOAppzRDUcDpe2GACcNHp1/view), ahora archivado dentro de [PRUEBAS SINTÉTICAS · NO ES BACKUP REAL](https://drive.google.com/drive/folders/19xhE4wuzCXJnAfu1DbMFO95KubZbG7EW); permisos verificados, no compartido, sólo propietario.
- Se **descargó físicamente** el archivo de Drive a entorno aislado y se comprobó SHA256 exacto `4588c0ff2d5be31f707e34c8c413bc4ba9c6f4c9b9f32271e98f7b772521cb05`, ZIP CRC PASS.
- Se descifró el envelope AES-256-GCM con **clave pública de fixture** (0x53 por 32 bytes, NO usar con datos reales), autenticación PASS, hashes de payload PASS. SQLite en memoria: `PRAGMA integrity_check=ok`, 2 tablas / 3 registros, valor `COMPLETED` cotejado.
- Llamadas Cloudflare, Supabase y Notion de datos durante este ensayo: 0; sin mutaciones a proveedor. No se tocó la D1 existente ni App/CRM/main/DNS.

## Gates sin cerrar
- `cerebro-fact001-d1-backup-seal-lab` v1 continúa ACTIVAMENTE INERTE HTTP404; deploy candidato v2 **bloqueado por controles de seguridad**; no saltarse.
- La D1 real sigue **sin archivo cifrado offsite**. La clave AES real sí existe en Vault, pero no se extrajo ni utilizó aquí. La clave fixture es pública: esto NO verifica custodia privada ni restauración de datos productivos.
- Gate `backup_and_rollback=PENDING` y `production_autonomy=OFF`; faltan despliegue autorizado, export real cifrado, copia Drive + readback y restauración aislada, escrow independiente real.
- R2 no habilitado y cuota D1 10/10; coste adicional contratado 0 EUR; los minutos incluidos en GitHub Actions sí consumen cuota.

## Gate de caducidad confirmado · Cloudflare API 2026-11-12

`CEREBRO-FACT001-D1-READ-LAB-20261110` está actualmente **active**, pero expira a las **2026-11-17 00:00 UTC**, según GET oficial de Cloudflare. El token emisor v2 permanece active; no se usaron ni revelaron valores. El sidecar inerte impide la exportación real hoy. No renovar por duplicado ahora: antes de la fecha hay que cerrar despliegue autorizado o preparar una rotación de credencial con mínimo privilegio y sin secreto en chat. Después de la expiración no asumir funcional el candidato existente. Backup real `PENDING`.
