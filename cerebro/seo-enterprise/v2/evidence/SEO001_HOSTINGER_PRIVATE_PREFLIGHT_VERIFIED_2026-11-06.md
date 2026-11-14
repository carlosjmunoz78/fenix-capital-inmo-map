# CEREBRO SEO · Hostinger private backup preflight · Verificación 2026-11-06

**Empresa:** fenix · **Motor:** SEO-001 · **Entorno:** PREPROD / PRIVATE_BACKUP_PREFLIGHT · **Versión:** 0.1.0 · **PR:** #22 DRAFT.

## HECHO: inspección offline de backup genuino preparada y probada con fuentes sintéticas

Se añade `runtime/seo-hostinger-private-backup-preflight-v0.py`, sin dependencias distintas de Python estándar. El módulo **no descarga copias**, **no extrae contenidos** y **no importa SQL**. Debe ejecutarse en un destino privado, cifrado, protegido en el sistema de archivos y con variable `CEREBRO_PRIVATE_BACKUP_ROOT`, que identifica explícitamente la carpeta cuyo propietario autorizó la inspección.

El módulo solo admite `.tar.gz/.tgz/.zip` para la web y `.sql/.sql.gz` para la base de datos. Procesa TAR mediante streaming, limita archivos, límites de descompresión y tamaño máximo, comprueba CRC de ZIP, bloquea saltos de directorio, rutas absolutas dentro del archivo, enlaces simbólicos y dispositivos. Identifica estructura WordPress mínima `wp-admin`, `wp-includes`, `wp-content`, `wp-config.php` y `wp-admin/index.php` bajo un único árbol. Comprueba presencia estructural de diez tablas WordPress centrales con un prefijo común **sin registrar su nombre**. Exige carpeta privada 0700 y escribe un informe metadata-only 0600 con SHA256 de los archivos originales.

**No se comprueba compatibilidad funcional SQL, contenido fiable, derechos, malware o integridad semántica.** Un archivo con estructura plausible puede no ser auténtico; no basta para certificar backup completo.

**[GitHub Actions run 42279663231](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42279663231): SUCCESS, 8/8 PASS.** Todas las pruebas se hicieron con estructuras y tablas ficticias: `test...py`. El script productivo rechaza ejecutarse bajo `GITHUB_ACTIONS=true` o `CI=true`; la suite de pruebas aísla temporalmente esas variables exclusivamente para los fixtures, pero **ningún archivo real se importa a GitHub**.

## BLOQUEADO: acceso y restauración del WordPress real

No existe backup auténtico accesible en la ejecución de este chat. Opera Connector aporta navegación y lectura de Hostinger hPanel, pero no control de clic/descarga. El Gmail conectado tampoco contiene un enlace reciente de descarga conocido. La API Hostinger oficial incluye backups de VPS, pero no se ha acreditado un endpoint de descarga del backup completo de WordPress en hosting web.

Fuente de procedimiento oficial `https://www.hostinger.com/support/5981435-how-to-download-backups-at-hostinger/`: en hPanel, Websites → Manage site → Backups → Restore and download → Website backup → Download website → Send link to email. El enlace se envía al correo del propietario de Hostinger. **Prohibido pulsar Restore website en PROD**.

Al obtener los archivos reales, el flujo seguro obligatorio es:

```
HPanel (solo export)
  → almacenamiento cifrado y privado
  → preflight privado .tar.gz/.zip + .sql.gz
  → verificación de origen, integridad y malware
  → restauración completa en laboratorio local aislado
  → comprobar WordPress Core/plugins/tema/medios/DB
  → pruebas de navegación sin envío de emails ni crons
  → rollback físico en laboratorio
  → firma Ed25519 con pin de identidad del runner
  → verificador CEREBRO
  → tribunal RELEASE_HOLD hasta QA/UMS/IAM/aprobación
```

El verificador de restauración privada **ya existente** `seo-wordpress-private-restore-attestation-v0.mjs` pasó 5/5 pruebas sintéticas en [42274216064](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42274216064). No supone que exista un ejecutor privado real instalado ni firma de certificado válido de un backup real.

## Pendientes y estados

| Contrato | Estado |
|---|---|
| Guard WordPress PROD, PR #22 DRAFT | VERIFICADO en lectura |
| D13 Gemini Free, contenidos V4.1 | HECHO / QA editorial independiente pendiente |
| UMS receptor WebP y huellas | HECHO / productora autónoma pendiente |
| Backup privado, inspección de estructura | HECHO con fixtures / **backup real no inspeccionado** |
| Copia Hostinger completa descargada | BLOQUEADO |
| WordPress restaurado desde backup real aislado | BLOQUEADO |
| IAM de borradores y prueba física de creación | BLOQUEADO |
| Publicación autónoma | BLOQUEADO |

**Seguridad:** no se ha pagado un servicio nuevo, enviado una imagen a WordPress, modificado una página publicada, fusionado una PR ni divulgado secretos. El gate de estructura no reemplaza la restauración real ni los controles de legislación, SEO y privacidad.

**Próxima acción para operación asistida por navegador:** ejecutar la exportación en ChatGPT Work Cloud Browser bajo sesión autenticada del propietario y almacenar la copia en destino privado cifrado, nunca como adjunto de conversación, artefacto GitHub Actions ni archivo de repositorio.
