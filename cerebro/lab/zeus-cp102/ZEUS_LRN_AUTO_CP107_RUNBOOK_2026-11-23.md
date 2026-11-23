# CEREBRO OS · CP107 · LRN-001 → ZEUS AUTO · Runbook de continuidad

**Fecha** 2026-11-23 · **Entorno de los datos** fenix/LRN-001/PREPROD · **Estado** INSTALADO EN LAB; primera ingestión recurrente auténtica **PENDIENTE DE ACEPTACIÓN**. No confundir con PROD.

## HECHO VERIFICADO

1. GitHub Actions reusable verificado en run [45241315448](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/45241315448): JWT real GitHub OIDC contiene `job_workflow_ref` y `job_workflow_sha` del código de un reusable **inmutable** `e88ca2983ec9f6595f20f121bd31637d981a96e8`. Ejecuta el remitente inmóvil del commit `aab27139c62ca55f1a3cfbbdfb47b36177876849`, sin token persistente.
2. GitHub [run 45241677439](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/45241677439) SUCCESS: validaciones de manifiesto y separación multiempresa.
3. Worker **nuevo y aditivo** `cerebro-zeus-lrn-auto-lab`, versión `501aabc7-9709-46dc-a269-cc83de9e506b`, `workers.dev` ON, previews OFF, cero crons. Solo `POST /v1/publication` con JWT GitHub firmado y pinned reusable SHA, emisor, audiencia, IDs inmuebles del repositorio, workflow raíz en main, run/attempt; no lectura anónima ni API de escritura genérica. JWKS dinámico con fail-closed y `redirect:'manual'`.
4. D1 LAB existente `1305f791-7c44-47f9-946b-f330a09c88aa` con **dos tablas aditivas** `zeus_lrn_auto_receipts_v1` y `zeus_lrn_auto_daily_v1`, unicidad por run/attempt y por DAILY lock_key. Pre-migración Time Travel bookmark `00000f32-00000002-0000512c-877bb47f11f9a94e834435ae69d9f6a5`. No tocar tablas, cursor ni proyecciones ZEUS canónicos en una restauración global.
5. [PR #86](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/86) fusionado al workflow raíz `main`, commit `1d73c21f2e7c9ccd6f3d9f1ad4b64250d09fd5f1`: 17 líneas aditivas, job `zeus-lrn-auto-append-only`, depende del publicador real y reutiliza el schedule **existente**. CI de contrato y PREPROD replay run `45242080329` SUCCESS.
6. [PR #87](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/87) fusionado, commit `890adc5d51190a88742f32bdb720418b74f69648`: misma cadencia 15 minutos, desplazada a minutos 7,22,37,52 para evitar picos GitHub. Test de cron y PREPROD replay run `45242956226` SUCCESS. No añadir crons.
7. Console propietaria LAB actualizada para mostrar `recibos automáticos`, `deduplicados diarios` y último run, además del estado FACT/LRN original. Verificada en Opera con Cloudflare Access; nueva versión visual actualmente reporta **0 auto receipts** y **0 daily dedup**; no son recibos ficticios.

## TODAVÍA NO VERIFICADO / NO DECLARAR COMPLETADO

- Ningún job nuevo `zeus-lrn-auto-append-only` ha terminado y entregado un recibo auténtico después del merge, según lecturas de GitHub/D1 en este checkpoint. La primera aceptación física **GitHub scheduled or workflow_run → publisher job success → immutable reusable OIDC → Cloudflare Worker → D1 → lectura Console** está pendiente.
- Historial GitHub: el último run de Learning `schedule` encontrado fue `45150907763` (2026-11-23 09:52 UTC) y el último `workflow_run` completado `45198055197` (14:47 UTC), **ambos anteriores al nuevo job**. Los eventos `schedule` de GitHub son best-effort y pueden retrasarse o perderse. No deducir que el cambio de cron ya resolvió la frecuencia.
- El cursor diario canónico `fenix:LRN-001:PREPROD:daily` sigue en **1**. La nueva tabla de daily locks no reemplaza ese contrato ni permite afirmar que un DAILY haya sido publicado.
- `main` del repositorio de App no está protegida por branch protection. El receptor mitiga cambio de código mediante reusable y sender fijados por SHA, pero no convierte `main` en una rama protegida. No modificar sus protecciones sin inventario de workflows/demás dependencias.
- No dar como operativa una promoción a PROD, ni cambiar App/CRM, DNS, Trading, TechScout o costos.

## ACEPTACIÓN MÍNIMA PARA EL SIGUIENTE CHAT

1. Consultar GitHub Actions para la primera ejecución ordinaria (schedule o workflow_run) **posterior al merge 890adc5** y localizar job `run-preprod-control-plane` + `zeus-lrn-auto-append-only`, distinguir `skipped` por no existir publicación durable de fallo real.
2. Si error, inspeccionar **ese único job**, corregir la causa sin crear cron/servidores y revalidar una sola vez. Si no hay ejecuciones nuevas, diagnosticar estado real del scheduler/dispatcher del repositorio; no afirmar éxito.
3. Confirmar desde lectura D1 independiente `zeus_lrn_auto_receipts_v1`: primer recibo exacto; repetir entrega con mismo run/attempt = 0 escrituras; identidad/cross-company rechazadas; proyecciones FACT/LRN y cursor sin cambios.
4. Actualizar Console con el run real, registrar evidencia y retroceso, evaluar gates y promover solo el alcance autorizado cuando se acrediten.
5. Al cerrar, pasar inmediatamente al siguiente bloque prioritario operativo (FACT/FORGE invocador privado y/o gateway Console), no iniciar auditorías generales.

## SEGURIDAD / RECUPERACIÓN

- Si se detecta autorización indebida, apagar **solo** subdominio `cerebro-zeus-lrn-auto-lab`; revertir job aditivo main del PR #86. Conservar fuente D1 para auditoría, no hacer rollback global de la D1.
- La vinculación a SHA del reusable garantiza que modificar `main` no modifique por sí solo el ejecutor de escritura. El envío depende del `GITHUB_TOKEN` efímero del mismo run, nunca de un GitHub App o PAT nuevo.
- Documentar hechos físicos con run/job/commit/versión D1, duración, costo adicional medido y estado operativo exacto.
