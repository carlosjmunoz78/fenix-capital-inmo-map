# FACT-001 · CEREBRO P5 · Cinco proveedores por una sola orden firmada · 2026-11-12

## HECHO / VERIFICADO FÍSICAMENTE
- Un único job `unified-five-read` en el workflow existente `fact001-headless-provider-service-lab.yml` ejecutó realmente Cloudflare, Vercel, Supabase, Notion y GitHub.
- Run [#43196619003](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43196619003): **SUCCESS**, líneas de proveedor `VERIFIED_READ` para los cinco, `CEREBRO_FIVE_PROVIDERS_REAL_READ=5/5`.
- Identidad CEREBRO sin OAuth ChatGPT: GitHub OIDC corto plazo validado por broker Supabase v33 para Cloudflare/Vercel/Supabase/Notion vía Vault; GitHub leído con el `GITHUB_TOKEN` propio del runner restringido al repositorio. Nada de secretos en código ni evidencia.
- Regresión [CI #43196521419](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43196521419) SUCCESS. Orden restringida al proveedor fijo, LAB, motor FACT-001, coste adicional 0, sin URL/token/SQL/escritura configurable. Evidencia mínima de auditoría en artifact GitHub (retención 30 días), aún NO cola duradera de producción.
- El job legado de tres proveedores se saltó expresamente en este commit, para no repetir pruebas.
- Ningún dato de Notion, Supabase/App, CRM ni recursos GitHub/Cloudflare/Vercel fue mutado. PR #44 DRAFT; main intacto.

## NO CONFUNDIR CON AUTONOMÍA GENERAL
El trigger actual exige un commit firmado del titular en la rama LAB. **No** demuestra que el runtime de CEREBRO genere una orden cuando necesite un proveedor. No están conectados todavía:
1. Identidad de automación registrada `registered_automation` al CEREBRO Gateway existente, con pruebas reales de prohibición de suplantación.
2. Cola atómica durable compartida (dedupe + auditoría + coste) y ejecutor consumidor con permisos por operación, sin crear otra D1 (10/10).
3. Origen CEREBRO interno → Gateway (sin la interfaz Console) → worker; verificación E2E y rollback de cada operación habilitada. Actualmente solo lectura conjunta real; LAB CRUD particulares tienen evidencias previas, pero NO un catálogo universal de escrituras por Gateway.
4. Reintentos limitados y revisión de `RECONCILE`, cuotas efectivas del proveedor, permisos mínimos, token rotation y backup del alcance ejecutado.
5. El alcance actual de GitHub es el repositorio donde corre el runner. La credencial GitHub App de administración multiplataforma documentada no está acreditada y no debe inferirse.
6. Operaciones PROD siguen bloqueadas por sus propios gates. La Console UI final queda expresamente fuera del objetivo actual.

## Uso y rollback
Para nueva orden segura de lectura, una nueva solicitud de la estructura `requests/order.v1.json` con request_id único y commit del propietario activa el job. El workflow de prueba original sigue intacto salvo su condición de skip al detectar el nuevo prefijo; basta revertir los commits de esta carpeta y el cambio aditivo al workflow para cancelar V0. No modificar el broker v33, Vault, D1, worker cron, Gateway PROD, App, CRM, SEO, DNS ni main. 

**Estado**: READ_5=VERIFIED_LAB; AUTONOMOUS_NEED_DRIVEN_EXECUTION=PENDING. No afirmar cinco conectores FULL o uso espontáneo autónomo por una prueba firmada.
