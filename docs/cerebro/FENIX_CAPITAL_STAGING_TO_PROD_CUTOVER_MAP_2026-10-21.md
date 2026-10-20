# FÉNIX CAPITAL · STAGING → PROD CUTOVER MAP · 2026-10-21

## Estado
PARCIAL · INVENTORY/DIFF IN PROGRESS · PROD CONTENT UNTOUCHED

## Regla de promoción
No se copiará la base de datos de STAGING sobre PROD. Se aplicará promoción diferencial: CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.

## PROD baseline verificado
- URL: https://fenixcapital.es
- WordPress: 7.1.3
- PHP: 8.5.11
- MariaDB: 11.8.9
- Theme: Astra 4.14.0
- Site Health: 7 GOOD / 2 recommended / 0 critical
- Páginas publicadas: 162
- Posts publicados: 32
- Redirect rules existentes: 135
- Elementor submissions: 21
- Fénix Core Guard PROD: 1.0.5
- Yoast PROD: 28.5

## Rollback baseline PROD
Checkpoint #20 creado antes de cualquier cutover:
- Label: CEREBRO · Before STAGING→PROD cutover · 2026-10-21
- Tables: 124
- Size: 38,061,933 bytes

## PROD-only · KEEP
Se han identificado 39 páginas publicadas que existen en PROD y no en STAGING. Deben conservarse; corresponden principalmente a landings locales recientes de Jaén, Sevilla, Granada y Málaga.

IDs KEEP:
52200, 52209, 52219, 52223, 52207, 52208, 52195, 52220, 52210, 52221, 52222, 52211, 52224, 52225, 52226, 52227, 52302, 52212, 52213, 52228, 52229, 52197, 52230, 52231, 52232, 52318, 52214, 52233, 52198, 52215, 52234, 52235, 52236, 52237, 52216, 52217, 52206, 52238, 52218.

Posts PROD-only KEEP:
- 52247 · documentacion-estudiar-hipoteca-jaen
- 52248 · cuando-preparar-hipoteca-compra-jaen

## STAGING shared candidates
- Páginas publicadas STAGING: 123
- Posts publicados STAGING: 30
- Los shared objects están mayoritariamente modificados en STAGING durante 2026-10-13 → 2026-10-18 y son candidatos UPDATE, pero todavía no se promoverán en bloque hasta cerrar el gate de HOME y el manifest por objeto.

## Plugins
NO migrar el stack STAGING sobre PROD. PROD conserva runtimes/capas específicas, entre ellas:
- cerebro-blog-index-prod-compat
- cerebro-blog-visual
- cerebro-os-universal-fenix-prod
- cerebro-seo001-city-form-prod
- cerebro-social-visual-renderer
- fenix-cerebro-maintenance
- Elementor Pro
- Fénix Core Guard 1.0.5

STAGING-only/PREPROD/NEXUS/Pro-Free no se copiarán automáticamente a PROD.

## Datos vivos PROD · PRESERVAR
No sobrescribir:
- lead/form submissions
- Elementor submissions/actions
- Redirection tables
- WPCode/snippets
- Core Guard history/snapshots/logs
- settings/credentials/integrations PROD
- cookies/consent/analytics configuration PROD

## HOME gate · BLOQUEADOR ACTUAL
La homepage configurada en STAGING apunta al post_id 52487, pero el objeto ya no existe físicamente. Resultado actual de STAGING `/`: HTTP 404.

Evidencia previa disponible:
- la Home Andalucía V2 estuvo físicamente GREEN y fue auditada a 390/768/1440;
- existen PDFs/screenshot artifacts de la versión aprobada;
- Core Guard snapshots 1039–1042 existen como referencias históricas del pulido; snapshot 1042 es el candidato más cercano al estado final antes de la última limpieza menor.

La restauración del snapshot está actualmente bloqueada porque Core Guard está en Observer + operations_locked. No se hará promoción a PROD hasta recuperar la home, devolver STAGING root a HTTP 200 y repetir QA.

## Próximo gate
1. Recuperar HOME final en STAGING.
2. QA 390/768/1440 + mobile menu + forms.
3. Completar object manifest KEEP/UPDATE/ADD/REDIRECT.
4. Confirmar redirects sin tocar los 135 existentes salvo delta aprobado.
5. Ejecutar promoción diferencial por lotes con rollback por objeto.
6. Smoke/SEO/leads físico en PROD.

## PROD writes
Hasta este punto: solo se ha creado el checkpoint #20 de rollback. No se ha modificado contenido, navegación, SEO, plugins ni redirects de PROD.
