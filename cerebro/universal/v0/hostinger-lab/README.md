# CEREBRO OS · Hostinger LAB V3 · respaldo reproducible

**Ámbito:** PR #66 DRAFT, rama `cerebro/universal-control-plane-lab-v0-20261113`. **No producir ni promover a PROD.**
Paquete fuente archivado: `CEREBRO_HOSTINGER_LAB_PREFLIGHT_0EUR_V3.zip`.
SHA-256: `b073f6dc221648d55b0655ff3a857c357030209442e9a33237fb42f3ba4414f1`. Git blob SHA: `ae50bedf1d7da674445059a36f1a69aaba6fac24`.
Fecha evidencias: 2026-11-16.

## Inventario
El ZIP contiene: `package.json`, `server.mjs`, `LEEME_HOSTINGER.txt`, `test/server.test.mjs`; Node 22.x, `npm`, sin build ni variables de entorno.

## Verificación local
Extraer a carpeta temporal aislada. Desde esa carpeta:
```sh
node --check server.mjs
node --test test/server.test.mjs
```
Resultado observado: 8/8 tests PASS, Node 22. `server.mjs` ejecuta `listen()` sin guarda para compatibilidad Hostinger. No contiene secreto ni acceso a LAB/PROD, solo GET/HEAD `/` y `/healthz`; 404 para rutas de ejecución y mutaciones.

## Verificación host
En la aplicación EXISTENTE `cerebro-lab.fenixcapital.es`, el usuario observó JSON `status=READY`, `probe_version=V3`, `owner_auth_test=NOT_RUN`, `prod_execution=DISABLED`, `background_jobs=DISABLED`.
No suponer que ese resultado implica ejecutar CEREBRO OS ni Auth E2E real.

## Seguridad de separación
No cargar `service_role`, `sb_secret`, variables de PROD, credenciales personales o runner privado en la Web App pública.
El runner del ciclo Auth LAB ya existe en `../security-lab/operativa-no-actions.mjs`, con modo `--live` bloqueado sin credenciales **solo LAB** y armado explícito.
La prueba real requiere un runtime privado independiente y gestor de secretos seguro. Mientras no estén acreditados ambos, `P0-A=BLOCKED`, `OPERATIVA_PROD=HOLD`.

## Rebuild / rollback
Si hace falta restaurar la sonda, desde Hostinger → Web App EXISTENTE → Despliegues → Redistribuir → Subir nuevo ZIP el archivo de arriba; conservar entry `server.mjs`, Node 22.x, npm, build None, sin variables. **NO crear nuevas apps ni tocar nameservers, DNS, web, App/CRM o WordPress**. La zona Cloudflare y A record siguen fuera de este artefacto.

## Evidencia del lector Supabase LAB
MCP consulta directa `hnqlnvakzaywtafeiybt`, `ACTIVE_HEALTHY`: función `public.cerebro_operativa_session_guard_lab_v0(uuid,uuid)` existe, solo `service_role` y postgres con EXECUTE; anon/authenticated denegados; sesión UUID inexistente = false. No hay cuenta temporal real creada. Estado, dependencia y changelog en documentos hermanos de OPERATIVA y Hostinger.

**Coste adicional de suscripción:** 0 €. **Consumo infra:** no medido.
