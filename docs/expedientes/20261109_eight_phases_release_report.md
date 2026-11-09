# Expedientes · transición a 8 fases · 2026-11-09

## Estado de ejecución
- **HECHO (backend):** transacción conservadora de 4 expedientes Análisis → Documentación, con subpaso Análisis en `payload_operacion.cerebro_fases_v2` y 4 entradas en `expediente_stage_history`; 0 en Oferta.
- **HECHO (UI):** Entrada → Documentación (↳ Análisis) → Banco → Tasación → FEIN (↳ Oferta) → Notaría → Firma → Cierre. Menú manual y masivo sin Análisis/Oferta como fases principales; visual responsive de 8 columnas con desplazamiento horizontal en móvil.
- **HECHO (protección):** el cómputo de `is_active`, el orden activo primero / fecha finalización, y los filtros no se modificaron.
- **VERIFICADO Supabase:** total 50; activos 6; Documentación con subpaso Análisis 4; fases antiguas 0.
- **VERIFICADO CI:** Playwright de 8 fases, geometría escritorio/móvil, orden y contador de activos, compilación prod; run #42627168847.
- **HECHO despliegue:** publicación final controlada por GitHub Actions run #42627451481, artefacto `https://fenix-capital-preprod-6xxwedyw1.vercel.app`, ID `37gd5X8DN23HaC7QouVbFvKN5y2e`. Promoción sin nueva compilación.
- **PENDIENTE POR VERIFICAR:** interacción real en Opera con sesión (el conector de navegador no respondió a la inspección tras publicar).

## Rollback
- Despliegue público anterior: `Cw6AbxvyhrT5sGmBy1XRrgMb2jJG` (ocho fases versión inicial); respaldo previo de JARVIS: `7aC5UAcpbEj57KxE763kqTYxKDAE`.
- Datos: `docs/expedientes/20261109_eight_phases_data_rollback.sql`. NO ejecutar si alguno de los cuatro expedientes tuvo nuevos cambios, porque contiene una guarda de versión para evitar pérdida de datos.
- Migración: `docs/expedientes/20261109_eight_phases_data_migration.sql`; identificador `expedientes_8_phases_20261109`.
- Los workflows Vercel usan `VERCEL_TOKEN` cifrado en GitHub Actions y el proyecto específico; no hay nuevos servicios de pago.
