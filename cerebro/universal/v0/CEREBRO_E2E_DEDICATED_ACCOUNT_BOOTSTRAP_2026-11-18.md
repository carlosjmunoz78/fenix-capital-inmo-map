# CEREBRO · Cuenta técnica E2E sin privilegios · 18/11/2026

**Estado: PREPARADO. No hay renovación automática real activada todavía.**

Email autorizado por el propietario: `cerebro-e2e@fenixcapital.es`. Solo hay 3 identidades Supabase Auth existentes y **no existe** ese correo en `auth.users` en la consulta del 18/11/2026. El conector Hostinger Mail ve un buzón gestionable distinto y no dispone de acciones de creación de buzones ni alias. No se inventa el buzón.

## Cambios realizados en GitHub (rama de traspaso, no App PROD)
- Login efímero mediante Supabase Auth con correo fijo, **solo un GitHub Secret requerido**: `CEREBRO_E2E_TEST_PASSWORD`. Se reutiliza el secreto existente `PROD_SUPABASE_PUBLISHABLE_KEY`.
- Contrato de acceso: el usuario autenticado debe tener `email_confirmed_at`, JWT con issuer/sub/email exactos y `app_metadata.cerebro_e2e_readonly=true` establecida por un administrador. Rechaza `CARLOS-ADMIN` o tokens cercanos a caducidad. Ningún token de renovación o contraseña se persiste en Git.
- `cerebro-e2e-dedicated-identity-bootstrap.yml` permite probar login real cuando exista cuenta y secreto. Sin ellos deja estado PREPARADO. No cambia el secreto personal `CEREBRO_E2E_USER_JWT`, no abre gates ni modifica CRM.
- Cuenta técnica sin rol de propietario: **NO puede sustituir todavía las pruebas positivas owner-only**. Para habilitar esa prueba automática se necesita un contrato de auditoría READ ONLY que reconozca únicamente a esa identidad en endpoints concretos y deniegue el acceso a App/CRM. Implementar en paralelo y testear antes de producción.
- El GitHub connector disponible **no tiene una acción para crear secretos cifrados**. El navegador Opera de este chat solo puede leer/navegar, no pulsar formularios. El usuario debe crear la identidad mediante interfaz administrativa y guardar **la misma contraseña** una sola vez como secreto en GitHub sin compartirla en chat.

## Intervención humana puntual para habilitar
1. Correo/alias `cerebro-e2e@fenixcapital.es`: crear en Hostinger dentro de recursos existentes solo si no implica coste extra. Si no hay buzón, crear el usuario en Supabase Auth desde la consola admin con email confirmado no ofrece recuperación de contraseña: preferir alias de recepción verificable.
2. Supabase `https://supabase.com/dashboard/project/cluhljgonannaafpmblx/auth/users` → Add user → usuario técnico con correo anterior, contraseña fuerte generada localmente, email confirmada. **No seleccionar/admin-role ni copiar contraseña del propietario.**
3. En el usuario, añadir `app_metadata`: `{"cerebro_e2e_readonly":true}` (manteniendo los campos existentes). No en `user_metadata`.
4. GitHub `https://github.com/carlosjmunoz78/fenix-capital-inmo-map/settings/secrets/actions` → crear `CEREBRO_E2E_TEST_PASSWORD` con la contraseña técnica. El dueño no debe revelar el valor a ChatGPT.
5. Ejecutar [bootstrap](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/workflows/cerebro-e2e-dedicated-identity-bootstrap.yml) desde la rama `cerebro/operativa-runtime-p0-handoff-20261118`; comprobar autenticación real y negativa de permisos. No habilitar cron todavía.

No introducir duración global JWT diferente ni usuarios técnicos con permisos sobre clientes.
