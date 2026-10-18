# L04 · URL, Canonical & Redirect Hygiene

**Owner:** SEO-001 + WEB-001 · **Auditoría:** HECHO · **Resultado:** PARCIAL

## Hallazgos
- 204 URLs de contenido estables; 0 redirects a nivel de contenido.
- Solo `/author/fenixcapital/` y `/author/mrbogart/` redirigen a home.
- Canonicals vacíos en STAGING por política de entorno.

## Acciones
- Resolver enlaces internos a autores si no forman parte de arquitectura objetivo.
- En PROD exigir canonical decidido por URL y test de cadenas/bucles/redirecciones.

## V5 · `URL_STANDARD_GATE` obligatorio

Referencia: `docs/governance/CEREBRO_WEB_GOLD_STANDARD_V1_2026-10-18.md`.

Cada una de las 204 URLs debe auditarse por arquetipo y recibir PASS/FAIL/PARCIAL en:

- intención propietaria y ausencia de duplicación material;
- legibilidad humana y lenguaje de audiencia;
- slug descriptivo, estable y sin keyword stuffing;
- jerarquía coherente con el árbol real;
- canonical objetivo;
- ausencia de parámetros/fragmentos que creen variantes indexables;
- ausencia de cadenas de redirect e inlinks hacia redirects evitables;
- seguridad de cualquier cambio de slug: mapa OLD→NEW, 301, actualización de inlinks y rollback.

**Regla:** una URL “más corta” no es automáticamente mejor. Si una URL actual ya es estable, comprensible y propietaria de su intención, se conserva. No se migra por estética SEO.