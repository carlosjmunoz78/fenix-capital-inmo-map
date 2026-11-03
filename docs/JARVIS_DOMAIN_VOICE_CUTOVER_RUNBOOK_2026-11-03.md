# JARVIS · corte de dominio y aceptación física · 2026-11-03

Estado: **PARCIAL / NO PROMOCIONAR DNS**. Propósito: que JARVIS, voz, chat y App/CRM continúen funcionando al cambiar el origen del dominio.

## Evidencia real
- DNS externo de `app.fenixcapital.es`: Cloudflare; CNAME a `carlosjmunoz78.github.io.` (GitHub Pages).
- HTTP público: `Server: GitHub.com`; `/cerebro` devuelve 404 con HTML de fallback SPA. Esto explica que el dominio no sirva automáticamente commits desplegados en Vercel.
- Vercel: proyecto `prj_4ElVl8e2KzrHS7r5yvBGBban1DXV`; alias `app.fenixcapital.es` configurado, **pero** DNS externo incorrecto.
- Vercel recomienda CNAME `cname.vercel-dns.com.`. No se ha realizado ese cambio.
- Repo: `carlosjmunoz78/fenix-capital-inmo-map`. Mantener backups y rama `emergency-pages`; jamás eliminarlos.
- Gate de voz actualizado: mensajes de permiso denegado, audio-capture, network, no-speech. Pruebas con Chrome simulado no sustituyen una prueba de micrófono físico.

## Antes de modificar DNS (HUMAN REQUIRED)
- [ ] Backup GitHub Pages actual / referencia exacta de commit, incluidas las rutas de emergencia.
- [ ] Confirmar variables **efectivas de build** y configuración Supabase PROD en Vercel sin imprimir secretos: `VITE_FENIX_ENV`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`.
- [ ] Verificar autenticación real del propietario en deployment candidato y accesibilidad `/cerebro` sin SSO inesperado.
- [ ] Gates App Restoration, sesión, contratos JARVIS, voz, visual/QA y regresión OLD vs NEW verdes para SHA exacto.
- [ ] Identificar deployment READY y anterior para rollback en Vercel.
- [ ] Confirmación expresa del humano para reemplazar **solo** el registro Cloudflare `app`, sin tocar apex, www, MX, SPF, DKIM, CRM ni demás subdominios.

## Cambio controlado
1. En Cloudflare DNS, cambiar solo el **CNAME app** de `carlosjmunoz78.github.io` a `cname.vercel-dns.com` siguiendo la configuración vigente de Vercel. Evitar duplicados A/AAAA/CNAME del mismo host.
2. Usar inicialmente **DNS only**, sin proxy, si Vercel lo requiere; verificar resolución real desde varias redes.
3. Validar certificados TLS, ausencia de 404 en rutas SPA con recarga directa y caché de HTML.
4. Aceptación física: login/logout y roles; Inicio, Expedientes, Bancos y CRM no degradados; JARVIS, Operativa, Neuronal, Navegador; proyectos, chat, envío, archivos; **dictado real**, permiso micrófono, voz continua, error y recuperación; ancho 1440/1024/695; A−/A+ y persistencia.
5. Registrar evidencias, versión, coste y hora; abrir la promoción gradual solo después de validación.

## Rollback
- Ante rotura crítica: revertir **solo** CNAME `app` al valor anterior `carlosjmunoz78.github.io.` y verificar DNS, HTTPS, login y rutas; mantener la copia de GitHub Pages y todos los registros restantes.
- El cambio DNS puede tardar en propagarse; no afirmar rollback instantáneo.
- Si una nueva versión de Vercel falla tras promoción, utilizar el ID del deployment anterior validado y volver a verificar.
- Mantener HUMAN_REQUIRED por SECURITY_INCIDENT, HIGH_RISK o LOW_CONFIDENCE.

## Estado de pruebas
- CI sintético: evidencias verificables en el PR de corrección de voz (no garantiza permisos del PC).
- Micrófono físico en Chrome: **POR AUDITAR**, requiere presencia y permiso real del usuario.
- Migración DNS: **DEFINIDA, NO EJECUTADA**.
- Capacidad autónoma total de JARVIS: **PARCIAL**.
