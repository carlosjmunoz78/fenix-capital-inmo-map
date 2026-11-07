# CEREBRO OS · Owner-only IAM: Console → ACTGW-001 → Supabase Auth (V0)

**2026-11-05. Estado:** CÓDIGO + TESTS LAB; **sin conexión del usuario propietario real, sin producción ni nuevos gastos**.

## Objetivo

Garantizar que solo un propietario autenticado pueda emitir decisiones estratégicas, aprobar premios de mayor autonomía o solicitar acceso API, sin permitir que mensajes de otros agentes, correos, web, un simple campo `authorized:true` o una sesión inventada de Console usurpen esa autoridad.

## Implementación aditiva (preserva lo anterior)

- `cerebro/console/universal-excellence-console-binding-v0.mjs` registra una orden nueva en Console V0; NO modifica su código.
- `cerebro/gateway/universal-excellence-owner-binding-v0.mjs` registra en el Action Gateway V1 una capacidad limitada a LAB/PREPROD, con ticket interno de un solo uso. Antes de obtenerlo se exige la validación de sesión mediante una función de servidor de confianza.
- `cerebro/governance/supabase-owner-session-verifier-lab-v0.mjs` es un adaptador de identidad de servidor que consulta `GET https://<project-ref>.supabase.co/auth/v1/user` con el JWT de usuario recibido por canal protegido y una **publishable key existente**. El servicio de Auth comprueba la autenticidad del token; el verificador compara el UUID de usuario devuelto con el UUID privado del propietario del `company_id`.
- Nadie es propietario por su correo, nombre, `user_metadata`, rol declarado por el cliente o por una clave pública. La comprobación exige usuario confirmado, no anónimo, rol Auth autenticado y UUID registrado en una lista privada específica de la empresa.
- Ningún secreto ni token se guarda en archivos del repo, reportes o logs. Las pruebas usan datos falsos y respuestas simuladas.

## Configuración necesaria, NO realizada

La instancia de ejecución de confianza deberá inyectar, para cada empresa, `company_id`, `project_ref`, `expected_owner_user_id` (referencia segura al UUID de usuario Auth, NO en el repositorio), `publishable_key` existente y la sesión vigente suministrada por el backend. No confundir la autenticación del JWT con revocación instantánea de sesiones: este adaptador no consulta `auth.sessions` ni acredita esa revocación.

**Estado de despliegue:** los módulos no están montados en la App real ni en el Gateway productivo; la Console V0 es PREPROD de control lógico, no una instalación PROD nueva. No se afirma que las credenciales estén configuradas ni que el propietario ya haya sido autenticado físicamente.

## Evidencia y pruebas

[GitHub Actions: 42058753713](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42058753713) · 66/66 pruebas SEO y 22/22 pruebas nuevas de gobierno, identidad y consola. Sin JWT reales, sin acceso a usuarios reales y sin modificación de Auth, App, CRM ni Supabase.

## Próximas condiciones antes de activar el cambio de permisos

1. Inventario de la configuración real de autenticación del Gateway y enlace no invasivo del UUID privado, con autorización autenticada y sin publicar secretos.
2. Prueba física de sesión real vía Auth en canal seguro; verificar expiración, multiempresa, revocación y auditoría.
3. Capacidad real de revocar permisos, observabilidad y rollback; validación de IAM de cada agente, QA, juez y meta-supervisor.
4. Pasar todas las pruebas OLD vs NEW y revisión de seguridad antes de promover a producción.

Los premios sin privilegios (prioridad en cola LAB) y la suspensión LAB se conservan. Las nuevas APIs y facultades **no se activan únicamente por obtener una puntuación excelente**.

**Referencias:** https://supabase.com/docs/reference/javascript/auth-getuser y https://supabase.com/docs/guides/auth/jwts.
