# L04 · URL, Canonical & Redirect Hygiene

**Owner:** SEO-001 + WEB-001 · **Auditoría:** HECHO · **Resultado:** PARCIAL

## Hallazgos
- 204 URLs de contenido estables; 0 redirects a nivel de contenido.
- Solo `/author/fenixcapital/` y `/author/mrbogart/` redirigen a home.
- Canonicals vacíos en STAGING por política de entorno.

## Acciones
- Resolver enlaces internos a autores si no forman parte de arquitectura objetivo.
- En PROD exigir canonical decidido por URL y test de cadenas/bucles/redirecciones.