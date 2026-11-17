# FACT001 · Cloudflare CEREBRO headless autónomo · Resultado 11/11/2026

**Estado:** BLOQUEADO SOLO PARA PRUEBA AUTÓNOMA DE ESCRITURAS. No afirmar Cloudflare universal FULL, ni pasar a GitHub P1 por esta vía. Se preserva el recorrido ya en VERDE de credencial v2 mínima, GitHub OIDC, D1 heartbeat, y Worker/Pages CRUD vía Cloudflare OAuth ChatGPT.

## Evidencia de intentos
- Servicio independiente **nuevo** Supabase Edge `cerebro-fact001-cf-headless-worker-e2e-lab` ACTIVE v1; autentica RS256 GitHub OIDC con repo/rama/actor/workflow exactos. Sin acceso anónimo, peticiones de PROD denegadas y tests de política PASS: [CI #43010212628](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43010212628).
- [E2E 1 #43010449189](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43010449189) y [E2E 2 #43011004949](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43011004949): autentica correctamente; desde emisor v2 Vault Cloudflare **POST emisión de hijo Workers Scripts Write devuelve HTTP 400**. No se inventa ninguna capacidad no verificada. Reintento solo tras reconciliación, no bucle.
- Inventario real tras ambos intentos: ningún token hijo `CEREBRO-FACT001-HEADLESS-WORKERS-LAB-20261111`, ningún Worker objetivo `cerebro-fact001-worker-headless-e2e-20261111`; Vault conserva claim y acta de primer intento, sin secretos hijos. **No borrar los claims de auditoría**.
- Prueba aislada Cloudflare OAuth administrativo: emisión de un hijo temporal **Workers Scripts Write** permitida, metadata del permiso verificada y token revocado inmediatamente. Su valor no fue retornado al chat ni a un repositorio. Esto delimita el problema al contexto de delegación desde v2, no a la inexistencia del permiso.
- Un nuevo intento de **bootstrap automático de token administrativo → secreto privado de Worker** fue **bloqueado por controles de seguridad de la plataforma** antes de efectuar cambios. No reintentar por rutas alternas para eludir la restricción.

## Nuevo runtime privado preparado, NO operativo
- Código y tests: `cloudflare/headless-operator-lab/worker.mjs`, `schema.sql`, `tests/operator.test.mjs`. [CI política #43011782462](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43011782462) PASS.
- Supabase Vault no fue usado para trasladar en texto plano ningún nuevo secreto de Workers. No hay token nuevo persistente.
- Cloudflare Worker nuevo `cerebro-fact001-headless-operator-lab-20261111`: **workers.dev false, previews false, cero rutas/crons, única vinculación D1**. No secreto `CF_WORKERS_TOKEN`. No ejecuta órdenes.
- D1 existente y exclusivamente LAB `cerebro-fact001-recovery-lab-eu`, 10/10 D1 originales conservadas. Nueva tabla propia `fact001_cf_headless_worker_jobs_v1` creada tras snapshot/registro: fila `FACT001-CF-HEADLESS-CRON-E2E-20261111-001` con `QUEUED`, `attempts=0`. Otras tablas no alteradas. Bookmark previo: `0000013e-00000000-00005120-a9b741de7e9ce1d96077a608fbc907aa` (NO restaurar toda D1 por una tabla compartida).
- Inventario Workers pasó 13 → 14 debido únicamente al Worker nuevo OFF. Este nuevo recurso se mantiene privado e inerte como candidato; no se crea suscripción ni D1 nueva.
- Token v1 heredado disabled; emisor v2 active con sólo Account API Tokens Write; App/CRM, DNS, PROD y main intactos.

## Gate exclusivo para habilitarlo
Hace falta un método **autorizado por la plataforma** para aprovisionar dentro del Worker privado `CF_WORKERS_TOKEN` sin divulgar el secreto en ChatGPT, logs, GitHub, SQL ni capturas. Proceder mediante herramienta que apruebe expresamente este mecanismo o interfaz administrativa humana segura. No saltarse controles de seguridad.

Después:
1. verificar permiso Workers Scripts Write, vencimiento y secreto vinculado sin mostrar su valor;
2. correr el job firmado en LAB una vez, cron controlado, con comprobación real V1→V2→rollback V1→delete→rebuild→delete;
3. acreditar D1 `COMPLETED` attempts=1, replay bloqueado, cero rutas públicas, limpieza de objetivo;
4. retirar cron de prueba o mantener uno solo si hay operador/cola útil y costes medidos; documentar rotación. Proyecto Pages requiere prueba separada de deploy/rollback.
5. solo entonces certificar el **subgate** Worker headless; Cloudflare FULL requiere aún Pages y permisos/observabilidad/política por producto.

**No invocar `HUMAN_REQUIRED` por simple incompletitud**. Aquí hay una barrera real de política de seguridad en la transferencia de credenciales, que sí requiere ruta de provisión admitida, no simulación de éxito.
