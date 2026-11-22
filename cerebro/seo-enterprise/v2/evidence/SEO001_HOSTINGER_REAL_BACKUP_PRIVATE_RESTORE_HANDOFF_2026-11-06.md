# CEREBRO SEO · Backup real Hostinger y restauración privada · Contrato de aceptación

**Fecha:** 2026-11-06 · **company_id:** fenix · **engine_id:** SEO-001 · **environment:** PREPROD · **version:** V0.1 · **PR:** #22 DRAFT.

## Estado real

- **HECHO —** restauración física de **base sintética** MariaDB aislada y prueba idempotente `42247533380`. No equivale a WordPress real.
- **HECHO —** WordPress real inspeccionado en solo lectura por Cowboy MCP; WordPress 7.1.4, PHP 8.5.12, MySQL/MariaDB 11.8.9. El guardia `fenix-core-guard/health` confirmó de nuevo `environment=production` y `operational_writes_allowed=false`.
- **HECHO —** navegación autenticada de lectura a `https://hpanel.hostinger.com/websites`. No hay herramienta de clic/descarga en Opera Connector de este chat; no se ha descargado una copia ni creado backup nuevo.
- **HECHO —** búsqueda de correos recientes de Hostinger (90 días) en Gmail conectado sin coincidencias de mensajes de entrega de backup. Esto no excluye que el correo esté en otra cuenta.
- **BLOQUEADO —** descarga de backup auténtico, cifrado/recepción en vault privado, aislamiento completo, restauración de archivos+SQL real y prueba de rollback con ese contenido.
- **BLOQUEADO —** autorización de borrador WordPress y publicación autónoma.

## Cómo obtener el backup legítimo sin tocar producción

Fuente oficial actualizada: `https://www.hostinger.com/support/5981435-how-to-download-backups-at-hostinger/`.

Con la sesión de hPanel autenticada, navegar a `Websites → Manage site → Backups → Restore and download → Website backup`, elegir la copia más reciente que incluya el dominio `fenixcapital.es`, seleccionar **Download website** y **Send link to email**. Hostinger envía el enlace al correo registrado del propietario de la cuenta. Si no hay copia de sitio único, descargar archivos `.tar.gz` y base `.sql.gz` por separado. **NO seleccionar Restore website** en el panel de producción: ese botón sustituye archivos y base actuales.

Para ejecutar estos clics sin intervención manual repetida, usar **ChatGPT Work en navegador cloud** con sesión/permiso de Hostinger. El conector Opera de Chat normal únicamente permite navegación y lectura. Se requiere conservar el enlace sensible fuera de chats y logs.

## Seguridad al introducir un backup real

Una copia auténtica puede contener wp-config.php, hashes de cuentas de usuarios, formularios, PII de clientes, API keys, credenciales y bases de datos. **Nunca** subir copias `.tar.gz`, `.sql.gz`, enlaces de backup o secretos a GitHub, Actions artifacts públicos, adjuntos de chat o repositorios. Descargarla a destino privado cifrado con control de acceso, rotación y retención limitada, sin servidor público, sin envío de email, sin cron externo, sin conexión a DB real y sin posibilidad de alterar Hostinger PROD.

El destino debe ser un entorno privado aislado con WordPress y extensiones necesarias, acceso solo a administradores autorizados y egress filtrado. Restaurar los archivos y SQL en clones temporales, comprobar:
1. SHA256 de los **dos** backups reales contra los archivos recibidos.
2. Tablas, prefijos, versión de WordPress, plugins, temas, `wp-content/uploads` y estructura completa.
3. Post/page counts coherentes con inventario actual y variaciones por fecha; no utilizar conteos rígidos 45/180 como sustituto de reconciliación.
4. Navegación privada de la copia, páginas, recursos CSS/JS, media, formularios **sin enviar datos**, y sin llamadas a proveedores externos.
5. Un borrador de prueba **solo en la copia**, edición y posterior rollback físico probado; ningún cambio en el sitio real.

## Gate de evidencias criptográficas preparado, no ejecutado sobre backup real

`runtime/seo-wordpress-private-restore-attestation-v0.mjs` valida una declaración técnica de restauración firmada Ed25519 por un **runner privado de confianza con clave pública fijada externamente por el Vault**. Rechaza identidades autoafirmadas, firmas inválidas, SHA alterados, antigüedad, restauraciones parciales, egreso de red permitido o indicios de cambios de producción. No acepta **bytes** de backups ni contiene secretos.

[Pruebas 5/5 del gate](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42274216064): comprueban únicamente **recibos sintéticos firmados con claves generadas durante el test**. No existe un runner privado conectado ni una clave de certificación real registrada; no se debe afirmar `REAL_BACKUP_RESTORE=HECHO` sobre esos tests.

Incluso un recibo real correctamente firmado devolvería estado de validación técnica y **`publish_authorized=false`**; hace falta control editorial independiente, fotografías y derechos, IAM draft-only, aprobación por SHA y tribunal de producción.

## Imagen provisional no perteneciente al runtime UMS

En este chat se creó **una muestra original B2C con la generación de imágenes integrada de ChatGPT**. Se convirtió de forma determinista a WebP 1200×630, SHA256 `f581c018552174353ccf04e8b6ffe88826ec9d8f40d991f16a9e3549a86ac79e`, pHash DCT `37dd91a260616e2d`, tamaño 180308 bytes, documentada en un ZIP solo de revisión entregado al propietario.

**No es entrega de imagen generada por CEREBRO Gateway ni fotografía de una propiedad real**. No se ha validado inventario global, licencia independiente ni derechos por el tribunal; no se ha subido a WordPress. Se registró y descartó un fallo del generador de visualización: produjo infografías con estados técnicos falsos. **No usar ninguna de esas infografías como pruebas** ni enviarlas a producción.

## Pendientes físicos y autonomía

- Backup real Hostinger → Vault privado → WordPress restaurado en aislamiento → contrato firmado por runtime confiable: **BLOQUEADO**.
- Dos imágenes originales válidas por UMS-001, proveedor/cloud credencial y coste verificados, inventario/derechos/QA: **BLOQUEADO**.
- Evaluación SEO/YMYL independiente de V4.1 y exact SHA de aprobación: **PENDIENTE**.
- IAM de borradores, último recheck de slug, física de un draft y rollback, publicación posterior gobernada: **BLOQUEADO**.

**Seguridad:** PR #22 DRAFT, no merge, Core Guard en producción con escrituras desactivadas, no compra/suscripción, cero llamadas de pago al API de fotografías en esta continuación. El hecho de que haya artefactos o tests verdes no demuestra una copia real restaurada.
