# CEREBRO E2E · Renovación autónoma del JWT · 18/11/2026

**ESTADO: PREPARADO Y TESTABLE EN LAB, NO ACTIVADO.** No modificar duraciones globales de JWT de Supabase, Auth de App/CRM, ni insertar owner refresh tokens en CI.

## Diagnóstico físico
- `src/supabase.ts` de la App ya usa `autoRefreshToken:true` en el navegador, pero el secreto GitHub `CEREBRO_E2E_USER_JWT` es una copia fija y caduca.
- Nombres de secretos existentes en GitHub: `CEREBRO_E2E_USER_JWT`, `PROD_SUPABASE_PUBLISHABLE_KEY`, `VERCEL_TOKEN`; NO existen `CEREBRO_E2E_TEST_EMAIL`, `CEREBRO_E2E_TEST_PASSWORD`, `CEREBRO_E2E_TEST_USER_ID`, `CEREBRO_E2E_REFRESH_TOKEN` registrados en el listado examinado.
- En Supabase `auth.users` (consulta de agregados, sin datos personales) hay **0** usuarios identificados como cuenta E2E independiente bajo dominio @fenix.test o `raw_app_meta_data.e2e=true`. Esto no demuestra que jamás haya otras cuentas, pero no hay una identidad de CI auditable reconocida.
- Los refresh tokens de Supabase son rotatorios de un solo uso; guardar un refresh token personal de propietario en GitHub Actions con actualización persistente requeriría un PAT con capacidad Secrets WRITE, elevando el riesgo.
- `GITHUB_TOKEN` estándar NO sirve para reescribir Repository Secrets. Ninguna herramienta conectada actual tiene acción confirmada para editar secrets sin interfaz humana.

## Implementación segura preparada
- `e2e-ephemeral-token.mjs`: inicio de sesión temporal de **usuario QA dedicado**, usando Supabase Auth existente y verificación de `user.id`, email y `app_metadata.cerebro_e2e_readonly=true`. La contraseña no se imprime. El refresh token devuelto no se guarda. El JWT se marca como secret en runner y se pasa por `GITHUB_ENV` solo al resto de pasos del MISMO job (caduca y se descarta automáticamente). No cambia `CEREBRO_E2E_USER_JWT` ni concede permisos.
- QA offline `cerebro-e2e-ephemeral-auth-qa.yml`: mocks de login, expiración, identidad, secret absent, rutas y seguridad. Por diseño no intenta login real.
- NO hay schedule conectado ni tests owner reemplazados. Hacen falta una identidad de QA específica y una comprobación de que su ámbito solo permita diagnósticos READ-ONLY, sin RLS extendida. **Nunca atribuirle el rol completo CARLOS-ADMIN** ni copiar la contraseña personal a GitHub. La función owner actual no permite una identidad de prueba con privilegios limitados; habilitarla requiere contrato RBAC separado y aprobación de seguridad con pruebas negativas.

## Gates pendientes antes de activar
1. Aprobar identidad E2E de pruebas en Supabase Auth, de forma segura y sin usar la cuenta personal. Estado: HUMAN_REQUIRED / HIGH_RISK si se necesita cambiar auth/roles de PROD.
2. Guardar los secretos de esa identidad en GitHub Actions solo si existe una política que impida que la cuenta escriba en App/CRM y el backend reconozca el alcance de lectura adecuado.
3. Integrar el JWT efímero solo en workflows E2E autorizados; probar cross-tenant 400, POST 405, anónimo 401, owner read-only 200, origen y expiración. No reemplazar de golpe secretos o workflows.
4. Promoción gradual, rollback del workflow y monitoreo. Solo entonces activar schedule.

**Alternativa inmediata actual:** la App sí renueva la sesión del usuario en navegador, pero CI sigue usando `CEREBRO_E2E_USER_JWT` que caducará. No afirmar renovación autónoma ya en funcionamiento.

Coste adicional de subscripciones: 0 €. No hay cambios en PROD ni en Supabase Auth.

## Progreso posterior: cuenta E2E dedicada
Código simplificado a un secreto, tras aprobación del correo. Ver [bootstrapping de cuenta técnica](CEREBRO_E2E_DEDICATED_ACCOUNT_BOOTSTRAP_2026-11-18.md). **No activado:** cuenta aún no creada en Auth, primer login real no probado, CEREBRO_E2E_USER_JWT fijo sigue usado por CI. No cambiar tiempos de sesión globales.
