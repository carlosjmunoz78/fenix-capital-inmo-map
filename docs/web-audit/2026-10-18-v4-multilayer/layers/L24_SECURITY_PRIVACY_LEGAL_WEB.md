# L24 · Security, Privacy & Legal Web

**Owner:** WEB-001 + SEC/Policy + Legal · **Auditoría:** HECHO · **Resultado:** PARCIAL

## Hallazgos
- El corpus usa HTTPS y el análisis HTML no detecta assets mixtos HTTP.
- Existen aviso legal, privacidad y política de cookies.
- El snapshot no certifica CSP/security headers, hardening WordPress, permisos, vulnerabilidades, tratamiento real de datos ni suficiencia legal.

## Acciones
- Revisar headers, hardening y dependencias y probar formularios sin datos reales.
- Validar legal/privacidad con autoridad correspondiente si hay cambios materiales antes de PROD.
- No convertir una comprobación técnica en certificación jurídica.