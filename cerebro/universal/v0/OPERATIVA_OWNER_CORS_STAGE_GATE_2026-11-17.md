# CEREBRO OPERATIVA · P0 AUTH/CORS · Stage aislado 17/11/2026

## Origen y protección
- Repo: `carlosjmunoz78/fenix-capital-inmo-map`. PR #66 DRAFT, rama `cerebro/universal-control-plane-lab-v0-20261113`.
- Baseline PROD protegido: `app.fenixcapital.es`, deployment previo documentado `dpl_6n6KMNTWNEqpUUDBwn3V4UccXjPJ` (verificación del alias viva aún pendiente).
- Proyecto Vercel existente `prj_4ElVl8e2KzrHS7r5yvBGBban1DXV`; scope `team_qnh6u1Ofy2WPp0MGEKlyMA50`.
- **SÓLO** staged production build `--prod --skip-domain`, con SSO intacta; prohibidos `request_promote`, cambios en alias/DNS y Supabase PROD.
- Sin suscripciones nuevas, coste marginal de Vercel/CI **NO_MEDIDO**.

## Incidente de identidad, ya aislado
- A las 19:15–19:42 UTC: 66 GET `session/context` y 4 GET `navigation` respondieron 401. El `sub` era propietario registrado, pero Auth mostraba `session_not_found` para numerosas peticiones. No atribuir todos los 401 a la cuenta equivocada; JWT no expirado tampoco garantiza sesión activa.
- La nueva sesión creada 20:53 UTC no permitió recuperar el menú en el candidato porque el navegador recibió sólo OPTIONS 204. Gateway PROD v22 devuelve `Access-Control-Allow-Origin: https://app.fenixcapital.es` a orígenes no permitidos, incluida la candidata `.vercel.app`. El GET posterior queda bloqueado en el navegador.
- Código correcto de negocio y permisos de propietario: `fenix_prod.actors` activo con `CARLOS-ADMIN`, RPC de asociación `ok=true`. No cambiar cuentas, grants, RLS ni CORS global de PROD.

## Cambio aislado en PR
1. `api/cerebro-owner-bootstrap.ts`: endpoint GET same-origin propietario, sólo recursos `context` y `navigation`, limita hostname Vercel de candidato + `VERCEL_ENV=production`, valida origen, exige JWT + publishable key y verifica `CARLOS-ADMIN` contra el Gateway existente antes de cualquier devolución; no crea ni modifica registros.
2. `src/supabase.ts`: el frontend usa ese endpoint **sólo** para esas dos rutas en el hostname del candidato. `app.fenixcapital.es` conserva su contrato directo anterior.
3. `cerebro/universal/v0/operativa-staged-owner-bootstrap.test.mjs`: prueba denegaciones por host/entorno/origen/método/token/tenant y lectura correcta mockeada.

## Evidencia previa al Stage
- Commit de código: `e72f08e8379ba1bec088ba0931ea3994c333c408`.
- Workflow `CEREBRO Governed Main Integration V0`: SUCCESS para este commit.
- Workflow `CEREBRO Universal Gateway V0 LAB contract CI`: pasos Zero-IO universal tests, TypeScript/Vite build, aceptación de directorio 2506 y negativas de permisos SUCCESS; el resto de la suite seguía ejecutándose al preparar este documento.
- Sin pruebas físicas nuevas; este documento no acredita acceso real de propietario ni E2E.

## Aceptación obligatoria de esta candidata (NO promoción)
1. Verificar deployment READY sin alias y con origen Vercel SSO protegido.
2. Desde sesión de propietario actual en la URL recién desplegada: `GET /api/cerebro-owner-bootstrap?resource=context` devuelve 200 y `actor_code=CARLOS-ADMIN`; `navigation` devuelve 200, visible en la UI.
3. Panel `Operativa → Agentes` obtiene GET autenticado de `/api/cerebro-agent-directory?company_id=fenix` y directorio documentado de 2506 registros; no confundir registros con agentes ejecutores vivos.
4. Validar host de producción, token ausente, usuario ajeno y mutaciones = denegado, SSO y regresión App/CRM intactas; OLD vs NEW, rollback del deployment y coste observado.
5. Si falta **cualquiera**: `PROD_PROMOTION=HOLD`.

## Estado
CODE_READY; UNIT_AND_BUILD_PASS; STAGED_E2E_PENDING; PROD_UNCHANGED; NEXT=STAGE_NO_DOMAIN_THEN_OWNER_E2E.

## 17/11/2026 · Autenticación física comprobada y reparación de sesiones multi-pestaña

### Evidencia real del candidato inicial (SHA `cf808c40575b7d570290053d7afac5178f241d10`)
- En Opera autorizada, `https://fenix-capital-preprod-k1d68fn2z.vercel.app/cerebro?section=operativa&visual_lab=cockpit-v3&op3_panel=agentes` presentó OPERATIVA/Agentes con listado `1–25 de 2506`, fichas, jerarquía y enlaces a motores asociados.
- Supabase PROD, observación agregada SOLO LECTURA: `GET fenix-app-gateway/session/context` 31 respuestas `200` y `GET /navigation` 9 respuestas `200` durante la ventana consultada, con últimos registros a 22:06:40Z y 22:06:39Z. Confirma que el Gateway volvió a devolver identidad y navegación. No se copiaron JWT, identificadores personales ni claves.
- Antes de ese acceso, CI del mismo SHA 3/3 GREEN, Vercel deployment `dpl_bZdX3vd2PUKa22h4ZPLVaJWJP8QS` READY sin alias. **No es certificación de PROD ni de los 2506 como procesos vivos.**

### Segundo incidente real tras abrir otra pestaña del mismo hostname
- Abriendo `/inicio` en pestaña independiente sin «Recordarme» apareció el login. Código anterior de `src/App.tsx` ejecutaba `supabase.auth.signOut()` GLOBAL cuando existía sesión local pero faltaba `fenix-session-active` de la pestaña. Esto puede revocar una sesión que sigue utilizándose en otra pestaña y explica un mecanismo reproducible para `session_not_found`; los registros de autenticación muestran errores de esa clase, pero no atribuir todas las trazas exclusivamente a este mecanismo.
- Reparación **sólo para hostname staged**: `src/stagedOwnerAuthStorage.ts` separa por `sessionStorage` las sesiones no recordadas, mantiene las recordadas en `localStorage`, permite migración controlada sólo en pestaña ya activa; `src/App.tsx` no ejecuta `signOut` global por abrir una pestaña staged distinta y sincroniza marcador antes de `signInWithPassword`.
- `src/supabase.ts` mantiene adaptador anterior para `app.fenixcapital.es` y no sintetiza identidad del propietario desde metadatos manipulables si falla el Gateway en staged. Se mantienen las negativas de permisos y la conexión owner-only de lectura.
- Prueba independiente `operativa-staged-owner-tab-isolation.test.mjs` verifica separación entre pestañas, semántica de recordar, migración, ausencia de token persistente y fail-closed. Código en PR #66 DRAFT; no tocar producción.

### Gates a mantener
- Desplegar nuevo SHA candidato con `--prod --skip-domain` y SSO intacto; comprobar build, negativo anónimo, sesión real owner y logs sin secretos.
- **Pendientes:** E2E propietario en NUEVO hostname staged, regresión App/CRM OLD vs NEW completa, observabilidad/coste medidos, ejercicio real de rollback en entorno seguro. Si falta cualquiera: `PROD_PROMOTION=HOLD`.
- **No autorizada** ninguna modificación de usuarios/RBAC, Edge Functions Supabase PROD, CORS global, `main`, dominios ni alias de PROD. Coste marginal no auditado.
