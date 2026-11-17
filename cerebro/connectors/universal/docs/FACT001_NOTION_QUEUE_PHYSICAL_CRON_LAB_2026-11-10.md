# FACT-001 · Notion queue · Prueba autónoma física LAB · 2026-11-10

**ESTADO: HECHO, VERIFICADO FÍSICAMENTE Y RETIRADO.**

## Infraestructura previamente existente (no duplicada)
- Worker `cerebro-fact001-notion-queue-lab`, código del GitHub DRAFT **coincidente exactamente con el desplegado** (recuperado en respuesta multipart por API Cloudflare). Worker propio no público, `workers_dev=false`, `preview_urls=false`, sin rutas.
- Único binding `FACT001_D1` → `1305f791-7c44-47f9-946b-f330a09c88aa` (D1 Recovery LAB EU), sin credencial global `D1 Write`. El acceso de escritura del Worker solo llega a esa DB.
- Esquema Notion queue ya presente: `fact001_notion_queue_config_v1`, `fact001_notion_queue_jobs_v1`. `operation` SQL CHECK solo permite `notion.lab.queue.probe` — **imposible ejecutar operaciones de escritura Notion por esta cola v0**, incluso al activar enabled. `provider_writes_enabled=0` forzado por CHECK, `max_additional_cost_eur=0` forzado por CHECK.
- Estado previo: config enabled=0, cron=[], jobs=0. Snapshot de continuidad: bookmark previo `0000007b-00000004-0000511f-389f3ceeeddb5bd83cca6fd7ec5049a2`.

## Ejecución real única
1. Se creó en la D1 real un trabajo sintético exacto `FACT001-NOTION-SYNTHETIC-QUEUE-LAB-20261110-01`, scope `fenix-capital/FACT-001/LAB/1.0.0`, client `cerebro`, operation `notion.lab.queue.probe`, sin payload ni token Notion.
2. Se habilitó la config de cola (solo 1 job por tick, coste adicional máximo 0), y exclusivamente el Cron temporal del Worker de Notion `* * * * *`. El Worker Recovery original no se modificó.
3. Se verificó en D1 que Cloudflare Cron ejecutó físicamente el trabajo: **state=COMPLETED, attempts=1, updated_at=2026-11-10T19:53:27.944Z**. No hay llamada a Notion, no hay credenciales externas en el Worker, no hay publicación de ninguna página.
4. Se devolvió la config Notion `enabled=0`, `provider_writes_enabled=0`, `max_jobs_per_tick=1`, `max_additional_cost_eur=0`. Se retiró el Cron temporal y GET API Cloudflare confirmó `schedules=[]`.
5. GET final confirmó subdominio y previews desactivados, binding único D1 correcto, job `COMPLETED/attempts=1`, y D1 totales 9 (sin recursos extra).
6. El Worker Recovery original retiene binding D1 y `*/5 * * * *`, Supabase `cerebro-fact001-headless-provider-lab` v13 ACTIVE sin rutas Notion de escritura, PR #44 DRAFT.

## Resultado exacto (no confundir los gates)
- **D1 write scoped via Worker binding: VERIFIED PHYSICAL LAB** sin crear token Cloudflare account-wide.
- **Cola automática interna por Cron: VERIFIED PHYSICAL LAB**: trabajo sintético ejecutado exactamente una vez, job persistente en D1.
- **Notion write real autónoma: PENDING**: la operación permitida en el SQL es únicamente `notion.lab.queue.probe`; no existe canal de servicio autenticado Worker → broker Vault → Notion para un trabajo real, ni permisos `approved=1`, ni ruta Notion de escritura activa.
- **Full workspace backup y promoción PROD: PENDING**: ChatGPT localiza decenas de páginas CEREBRO en Notion (al menos 50 por búsqueda), pero CEREBRO Notion integration solo tiene acceso limitado a Wiki. Hasta verificar cobertura total y restauración de contenidos, tribunal no puede dar PROD verde.
- El nuevo `notion-workspace-promotion-gate.mjs` y seis pruebas en `tests/notion-workspace-promotion-gate.test.mjs` bloquean por defecto cualquier promoción con backup D1 parcial, raíces faltantes, inventario incompleto, costes o restauración sin evidencia. CI de seguridad de la rama: [#42889919376](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42889919376), SUCCESS.
- Ningún cambio main, PROD, App/CRM, DNS, WordPress, otros Workers/D1, ni nuevas suscripciones.

## Siguiente gate
Implementar transporte y credencial Worker → broker Notion con autenticación de servicio limitada, firma y protección replay; adaptar cola a operación Notion sintética **en esquema paralelo**, con snapshot, auditoría, coste y rollback; pruebas negativas y E2E con acceso autorizado. Resolver integración Notion sobre todos los roots antes de backup integral. No habilitar simplemente operaciones de escritura en tabla CHECK actual.
