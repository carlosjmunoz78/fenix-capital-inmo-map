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


## CP108 · ACEPTACIÓN FÍSICA DE INGESTA · 2026-11-23

**HECHO**. Para disponer de recuperación on-demand sin cambiar frecuencia ni introducir nuevos crons, se habilitó `workflow_dispatch` firmado dentro del mismo trabajo de publicador. Reusable exacto **11571f23af27db8cf9a0e5236d883c2ccf0e99e4**; sender immutable **104c585aad6ca456c1a1f01cb8b634e667314b2b**. Su JWT se comprobó en GitHub run **45244448310** (SUCCESS). Worker `cerebro-zeus-lrn-auto-lab` está en versión **0e9d45fa-f731-4d9e-976a-91ecb6a4e2e0**, ruta workers.dev ON, previews OFF, crons vacíos. [PR #88](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/88) fusionado a main commit **1de04c96d71e8a0deb0d66ffe64c639f161055ab**; tests de contrato y replay PREPROD run **45244633021** SUCCESS.

**PRUEBA E2E REAL**. Se emitió un único `workflow_dispatch` del flujo Learning con un job temporal (run **45244826140**, SUCCESS), y se **eliminó inmediatamente** el workflow temporal de la rama LAB (commit **4018d40a3f6fb151701b5fb91f13a47209ae9f8e**). El root [run **45244840163**](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/45244840163) ejecutó `run-preprod-control-plane` job **137938779677** SUCCESS y `zeus-lrn-auto-append-only / attest-and-submit` job **137939008120** SUCCESS. Este último entregó un **recibo nuevo** a Cloudflare por JWT OIDC firmado: `RECORDED_AUTO`, `new_writes=1`, run **45244840163**, attempt **1**, commit durable **bd9b0beab7b5216a91a3dcf1257590d1d0bd4550**, `daily_result=NO_DAILY_RESULT`.

**D1 VALIDADO DESDE OTRO PROCESO**. SELECT independiente sobre `zeus_lrn_auto_receipts_v1` recuperó `fenix/LRN-001/PREPROD`, run exacto **45244840163**, publisher **137938779677**, commit durable y SHA256 **1bfb922a062c40ee5321eb4b5479dd86e40e96b4b43314a67b7b1b127be67613**. Un intento de reinserción SQL de la misma fila usando `ON CONFLICT DO NOTHING` produjo **0 escrituras** y se conservó exactamente un registro. Esto acredita idempotencia a nivel **D1**, no una nueva retransmisión OIDC. `zeus_lrn_auto_daily_v1` conserva **0** porque no hubo DAILY nuevo; cursor canónico `fenix:LRN-001:PREPROD:daily` posición **1**; observaciones FACT-001/LRN-001 intactas, `promotion_allowed=0`.

**CONSOLA EN DIRECTO**. Browser Opera sobre la vista propietaria Cloudflare Access confirmó texto real: `recibos automáticos: 1`, `bloqueos diarios deduplicados: 0`, `último run automático: 45244840163`; también FACT-001 `LAB_GREEN` y LRN-001 `GREEN_AT_OBSERVATION`. Ninguna modificación al código comercial App/CRM ni a DNS; vista LAB sigue en modo solo lectura.

**ESTADO FINAL DEL BLOQUE: HECHO E2E AUTENTICADO EN LAB / PARCIAL RECURRENCIA SIN INTERVENCIÓN**. El circuito (publicador → reusable OIDC → Cloudflare D1 → Console) se verificó físicamente y el modo manual de recuperación funciona. La ejecución probatoria fue disparada mediante `workflow_dispatch`, no mediante schedule. Sigue faltando observar **al menos una ejecución automática** por `schedule` o `workflow_run` posterior al commit 1de04c96, con recibo D1 y deduplicación como corresponde. No declarar `OPERATIVO EN PROD` ni `AUTONOMÍA TOTAL` sin ello. Cron existente mantiene minutos 7/22/37/52 (4/hora). Google/GitHub account-level delivery y rate budgets POR AUDITAR si siguen sin aparecer ejecuciones programadas.

**ROLLBACK**. Deshabilitar la ruta del Worker `cerebro-zeus-lrn-auto-lab`; revertir únicamente job de [PR #86](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/86) / ampliación [#88](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/88) en main; cron previo [PR #87](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/87) se revierte si es preciso. No borrar las tablas nuevas ni restaurar D1 globalmente sin expediente. Conservar biblioteca, FACT, TechScout, App/CRM y trading.

**CONTINUACIÓN**: resolver entrega automática real y decidir promoción gobernada de ZEUS, después FACT/FORGE (invocador interno privado) y Console/Gateway con gates. Sin comenzar otra auditoría general.
