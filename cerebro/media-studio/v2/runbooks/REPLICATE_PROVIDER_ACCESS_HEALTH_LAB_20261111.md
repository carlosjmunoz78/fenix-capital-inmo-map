# CEREBRO UMS-001 · acceso continuo a Replicate · RUNBOOK LAB

Fecha: 2026-11-11. Estado: **AUTH VERIFIED / OPERATIVE PROVIDER RUNTIME PENDING**.

## Evidencia real
- GH secret existente `REPLICATE_API_TOKEN`, nunca leído ni copiado fuera de GitHub.
- `https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42927197709`: 5/5 tests, account HTTP 200, FLUX model HTTP 200, cero predicciones y coste API 0 EUR.
- Nueva lane health: `.github/workflows/cerebro-ums-replicate-connection-health-lab-v0.yml` en rama `cerebro/ums-replicate-flux-paid-lab-v0-20261108`.
- Source: `cerebro/media-studio/v2/runtime/replicate-credential-health-lab-v0.py`; registro: `cerebro/media-studio/v2/registry/replicate-provider-access-health-lab-v0.json`.

## Usar sin pedir de nuevo credenciales
1. CEREBRO con permiso de escritura en **esta rama LAB** abre `cerebro/media-studio/v2/requests/REPLICATE_HEALTH_LAB_REQUEST.json`.
2. Actualiza **solo** `request_id` a un nuevo identificador único. No poner claves, usuarios, cuentas ni prompts en ese archivo.
3. El GitHub Action de la rama hace exactamente dos GET autenticados: `/v1/account` y `/v1/models/black-forest-labs/flux-1.1-pro`.
4. Obtiene estado `AUTH_AND_MODEL_GREEN` o un código de bloqueo. Registro del resultado en el resumen del workflow y logs redaccionados, SIN datos de la cuenta ni valor de la credencial.
5. Si falla, CEREBRO debe diagnosticar sin rotar la clave salvo que la cuenta la haya revocado/caducado; no solicitar al propietario autenticación ordinaria.
6. Todas las comprobaciones son READ_ONLY, idempotentes y sin coste de inferencia. En repositorio público los runners estándar de GitHub Actions no consumen cuota facturable.

## Limitaciones y puertas pendientes
- Esta lane está **activa para comprobación en la rama LAB**, pero el proveedor no está conectado al runtime vivo del motor UMS-001 para inferencia de imágenes. Un workflow de comprobación no equivale a un servicio de generación.
- `workflow_dispatch` no está disponible de forma general hasta que GitHub reconozca el workflow en la rama por defecto; la ruta LAB verificada es la actualización controlada de `REPLICATE_HEALTH_LAB_REQUEST.json`.
- La programación `schedule` de GitHub Actions solo corre desde la rama por defecto; **no** se activa aquí para preservar `main`.
- El usuario quiere que CEREBRO siempre pueda acceder a Replicate. Esto requiere que CEREBRO Gateway/Tool Router pueda invocar un ejecutor seguro con este token sin pasar por ChatGPT. Aún no implementado.
- Las generaciones de pago están `execute_enabled=false` en el registry original: no habilitar sin verificar saldo, auto-reload OFF, ledger FINOPS atómico, límite económico, retención de imágenes, webhook firmado, QA y rollback.
- El proveedor externo puede sufrir caídas, revocaciones y rate limits: no prometer disponibilidad absoluta.

## Conexión final prevista
Gateway privado CEREBRO → autorización/política → Job UMS-001 → Model Router → Worker/runner autorizado con token cifrado → Replicate API → callback seguro → almacenar el resultado duradero → QA → entrega, sin publicar.
Evitar copiar tokens en chats, Notion, WordPress o KV en texto. Si el runtime definitivo no es GitHub, trasladar el secreto a la tienda de secretos cifrada del runtime por un mecanismo aprobado y auditable.

## Estado del lote creativo
`https://github.com/carlosjmunoz78/cerebro-assets-autonomous-lab/issues/2`: 4 imágenes pendientes. No se ha realizado inferencia vía Replicate todavía. No atribuirle imágenes generadas en ChatGPT.

## Rollback
Revertir únicamente el nuevo workflow y sus ficheros auxiliares en la rama LAB; nunca borrar la clave existente ni desconectar otros flujos. `main`, App, CRM, SEO, WordPress, supabase PROD y Cloudflare PROD: intactos.

## Auditoría
Gate autenticación: VERDE comprobado en GitHub; Gate ejecución paga: ROJO; persistencia y webhook: POR AUDITAR; promoción: BLOQUEADA.
