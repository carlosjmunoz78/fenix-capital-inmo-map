# NIA · Alternativa LAB sin GitHub Actions

**Estado:** código en PR DRAFT; Cloudflare Worker LAB aislado; la prueba Notion desde la identidad dedicada **no se considera pasada** hasta registrar una ejecución manual del Scheduled handler.

## Motivo
GitHub Actions está bloqueado administrativamente. No se usará para NIA durante la restricción.

## Alcance
Worker nuevo: `cerebro-nia-notion-proof-lab`.
- Solo handler `scheduled`, **sin cron**. Cualquier `fetch` HTTP devuelve 404.
- `workers_dev=false`, `preview_urls=false`, cero rutas/DNS.
- `NIA_ENABLED=false` por defecto, sin secret hasta provisión independiente.
- Solo `GET /v1/pages/41a81b1a-756d-815a-b877-f0d264a6a0d4` y `GET /v1/blocks/{id}/children?page_size=1`, ambos con timeout, redirecciones prohibidas y salida sanitizada.
- Nunca se guardan el token ni los datos de la página en logs. No se modifica FACT-001, Fénix Notion Bridge, App, CRM ni PROD.

## Siguiente gate físico
1. En el dashboard Cloudflare del Worker LAB, **Settings / Variables and Secrets**, guardar un **Secret** llamado `CEREBRO_NIA_NOTION_READ_TOKEN` con el token de la integración exclusiva **CEREBRO NIA · Lectura LAB**. No copiar desde GitHub Actions: un secreto no se puede extraer en claro. No pegar en chat ni en repositorio.
2. Una vez verificado que no existen rutas públicas, activar temporalmente `NIA_ENABLED=true` solo en este Worker para una prueba manual del `scheduled` handler desde interfaz administrativa de Cloudflare. Mantener cron vacío.
3. Verificar salida `PASS_DEDICATED_NOTION_TOKEN_READONLY` sin cuerpos ni secretos. Si no pasa, volver a OFF, investigar error sanitizado.
4. Restaurar `NIA_ENABLED=false` tras la prueba. Registrar evidencias, backup/rollback y deuda de integración al CEREBRO Gateway. La prueba documental **no** implica que NIA/Notion AI sea invocable como modelo.

## Rollback
Eliminar exclusivamente el Worker nuevo o mantenerlo apagado, retirar su secreto Cloudflare. No tocar el secreto en GitHub ni integraciones existentes. Coste adicional 0 € mientras no se activen servicios de pago.

## Aceptación
- [x] Código no dependiente de GitHub Actions
- [x] Pruebas de FAIL-CLOSED en Node test
- [ ] Worker desplegado y subdominio, previews, crons verificados OFF
- [ ] Secret Cloudflare configurado (NO incluir valor en documentos)
- [ ] Prueba Scheduled con token dedicado PASS
- [ ] Motor ACTGW desplegado y autorizado (separado)
