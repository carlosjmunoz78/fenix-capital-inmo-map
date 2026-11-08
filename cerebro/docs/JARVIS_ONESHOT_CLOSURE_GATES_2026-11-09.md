# JARVIS · One-shot closure gates · 2026-11-09

Estado: **PARCIAL / NO PROMOVER A PROD**. Auditoría operativa realizada sin modificar App, CRM, DNS, main, gh-pages ni Trading.

## Alcance y control

- Empresa `fenix` · motor `CONSOLE-001` / JARVIS · entorno controlado `PROD` solo en la cola auxiliar de trabajos.
- Coste: ninguna suscripción, servicio de pago ni modificación de facturación. GitHub Actions sobre repositorio público, runners estándar.
- Política: no reactivar consumidores automáticos, no hacer `workflow_dispatch` de flujos con `rearm`, no introducir secretos en logs.
- Fuente pública principal `carlosjmunoz78/fenix-capital-inmo-map`.

## Estado comprobado

| Gate | Resultado y evidencia |
| --- | --- |
| AUTH / E2E autenticado | VERDE previo; `41605782462` (credencial JWT temporal, caducidad a vigilar) |
| `GIT_STATUS` | `SUCCEEDED`; resultado `GIT_SAFE_PROD_CONTROL_GREEN`, trabajo `9e0b4d57-0afd-43ae-9539-dd491a733e2e` |
| `SEARCH_CODE` | `SUCCEEDED`, `PHYSICAL_PROD_GREEN`, exit 0, 18 coincidencias `SAFE_BRANCH`; trabajo `d3a98ed2-c63a-42b5-9a01-c84ddd5cf9bf` |
| Contratos del consumidor | VERDE; run `42534711112` |
| Consumidor one-shot | VERDE; run `42534711045`; paso `rearm` SKIPPED |
| Recuperación offline | VERDE; run `42534629144`, artefacto `13638896839` |
| SHADOW salud / autenticación negativa / CORS | VERDE; run `42535468830`, sin ejecutar negocios ni escritura |
| SHADOW funcional OLD vs NEW | PENDIENTE |
| Restauración real del dominio | PENDIENTE, requiere control de alto riesgo |
| Voz y aceptación física en el PC | PENDIENTE |
| Promoción de JARVIS a PROD | NO EJECUTADA |

## Causa raíz corregida

La búsqueda original en la cola tenía una expresión regular JavaScript sintácticamente inválida: `f.replace(/^.//`. La única corrección en el payload de **ese trabajo** fue escapar la barra: `f.replace(/^.\\//` (representación textual; en JavaScript es una barra escapada en la regex).

- Previamente: `RETRY_WAIT`, 1/2 intentos, `WORKER_FAILED:PHYSICAL_PROD_FAILED`.
- Diagnóstico aislado: run `42535021309`, salida 0 y 18 coincidencias, sin red ni escritura.
- Parche SQL: UPDATE de un único `jsonb` path `{command,2}`, con guardas de ID, entorno, estado, intentos, ausencia de lease y SHA inmutable.
- Después: `SUCCEEDED` en 2/2, error_code null, `MATERIALIZED_EXACT_SHA`, `network=DENY`, `workspace_mount=READ_ONLY`, `prod_touched=false`, `trading_touched=false`.
- Snapshot previo del cambio de campo: `JARVIS_SEARCH_CODE_PREPATCH_SNAPSHOT_20261109.json` (entregado fuera del repositorio).
- **No modificar el payload tras `SUCCEEDED`**, ni revertir el código registrado de una ejecución ya completada.

## Riesgo de rearm / cambio aislado

El worker existente rearmaba ciclos de GitHub de hasta 45 minutos. Se modificó **solo en rama técnica** `cerebro/jarvis-work-codex-complete-20261102`:

- Commit de ejecución limitada: `39bc098f322c6981d0d703c5813a7234a5742e8f`.
- `actions: write` → `actions: read`.
- Espera: 45 minutos → 45 segundos; timeout: 48 → 2 minutos.
- `rearm: if` → `false`, verificado SKIPPED.
- Copia anterior completa: `backup/20261109-jarvis-work-worker-before-oneshot` en `cfacd6c9044daae387575461d58cb91f6fc98629`.
- El consumidor Git Safe quedó manualmente desactivado en GitHub; mantenerlo desactivado hasta replantear ciclos de forma finita y con control de costes.

## Rollback sin publicación

- `main`: `862ee543036070bc2cbb3ccaffc6c81af6d6a225` igual a `backup/20261108-jarvis-prod-cutover-main`.
- `gh-pages`: `01650c6fb728aa9d41dc4877dd4bee243372be68` igual a `backup/20261108-jarvis-prod-cutover-gh-pages`.
- Marcador desplegado en gh-pages: `PROD_SOURCE_SHA.txt` = `10efb154840e32bde4f3cf527c88a417d4526d42`.
- Artefacto offline compilado con PROD: `jarvis-rollback-once-862ee543036070bc2cbb3ccaffc6c81af6d6a225`, digest `sha256:c2b2efdb3e01ff20ec3b044915ba7a02993003262fc32026034a6ccacf3bace9`.
- La prueba no demuestra rollback **real** en infraestructura ni autoriza cambios DNS o publicación.
- No revertir el cambio one-shot en el consumidor mientras haya riesgo de reactivar el bucle; restauración futura desde la rama backup tras revisión y en ventana controlada.

## Pendientes para promoción

1. SHADOW comparativo auténtico OLD vs NEW y regresión completa.
2. Aceptación física de App / CRM / JARVIS / micrófono / voz y rutas directas.
3. Prueba de restauración supervisada con métricas, rollback ensayado en entorno seguro y verificación de dominio.
4. Autenticación E2E durable en lugar de copiar JWT personal efímero a GitHub.
5. Validación de permisos, auditoría y ausencia de nuevos costes.
6. Solo tras completar gates, decisión explícita sobre producción.

**Regla:** conservar → entender → envolver → probar → mejorar → migrar. Nunca afirmar PROD promovido cuando solo han pasado pruebas de lectura.
