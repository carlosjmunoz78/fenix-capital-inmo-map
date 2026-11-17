# SEO Enterprise · Family Factory · STAGING-first (V1)

## Estado y protección
**Candidato documental y de pruebas, NO PROD; sin permisos de escritura en WordPress.** Conserva `SEO-001`, `KW-001`, `WAUD-001`, `LOCALP-001`, `SEOBOOT-001`, `SCAN-001`, las plantillas actuales, Core Guard, Elementor, el CRM y la web oficial. No crea servidores ni motores alternativos.

## Inventario vivo verificado (lecturas 2026-11-05)
- STAGING autenticado `https://staging.fenixcapital.es` → WordPress 7.1.4.
- Homepage: ID `56359`, «Fénix Capital · Home Andalucía V2» (publicada solo en staging).
- Opción de disuadir indexación: true.
- Página de privacidad: ID `47569`, publicada en staging.
- Conteos de las respuestas read-only: **125 páginas publicadas, 11 borradores, 30 posts publicados**. No inferir cobertura integral de todos los estados, empresas o plugins.
- `fenix-core-guard__verify-page-full` para la portada: HTTP 200, un H1, title/meta/schema válidos, noindex esperado, 0 fallos bloqueantes; un aviso de ALT, que puede ser píxel decorativo y requiere clasificación; 177 enlaces renderizados. La inspección es **solo de la portada**, no una auditoría de todo el sitio.
- WordPress `mosmcp__page-template-get` registra la plantilla Elementor ancho completo en la portada; `elementor.has_data=false` en esa lectura **no demuestra que sea seguro editarla como contenido clásico**.
- La separación real de DB, filesystem, credenciales, cache y DNS con PROD está **por verificar**. Nunca usar un conector de PROD como sustituto de staging.

## PRINCIPIO OPERATIVO V1.1 · LOS AGENTES HACEN EL TRABAJO

**El SEO lo ejecutan los agentes y subagentes de CEREBRO, no el plugin WordPress.** El director SEO asigna misiones, los especialistas investigan/analizan/redactan/comparan y el equipo de QA supervisa; CEREBRO orquesta los trabajos y decide internamente qué acción corresponde según políticas y evidencias.

El plugin propio **es un complemento**, un adaptador mínimo de WordPress: lee datos, expone capacidades, recibe operaciones autorizadas, aplica controles locales y devuelve resultados verificables. Puede ser sustituido por otras integraciones compatibles (REST oficial, Abilities, navegador o runner aislado) sin perder el trabajo ni los conocimientos de los agentes.

El plugin no es propietario de estrategia, prioridades, contenido editorial, aprendizaje, evaluación de agentes, premios ni tribunal. No puede ejecutar trabajos por su cuenta sin una misión autorizada ni promocionar contenido STAGING → PROD por decisión propia.

**Ruta de trabajo:** orden del propietario o evento permitido → CEREBRO Gateway → dirección SEO → subagentes especialistas → evidencias → supervisor/tribunal automatizado → instrucción concreta al adaptador autorizado → verificación → métricas → aprendizaje.

**Estado honesto:** el contrato obliga a este flujo, pero todavía no demuestra trabajadores y subagentes físicamente conectados al runtime. Se exige binding, colas, trazabilidad y pruebas de trabajo efectivo antes de declarar el equipo operativo. Las autorizaciones y gates ya existentes permanecen intactos.

## Arquitectura
**14 departamentos funcionales** comunes, **3 familias sectoriales**: Financiera/Inmobiliaria (hipotecas + B2B/B2C), Ecommerce, Tecnología/SaaS. No crear una familia por ciudad, keyword o canal. Los especialistas son roles lógicos y usan los runtimes compartidos existentes.

La especialidad Financiera/Inmobiliaria es la primera en validar; las otras dos son **definiciones reutilizables**, no activaciones. Cada departamento dispone de especialistas adaptados a la familia cuando el benchmark demuestre que aportan valor.

## Norma universal
La excelencia, mejora continua, formación, recompensas operativas y sustitución evaluada se aplica también al director, supervisores, tribunal, jueces y guardianes; **nunca se otorgan permisos ni gasto por autopromoción**. Autoridad humana final: propietario; las revisiones ordinarias son internas automáticas, conservando las ocho excepciones humanas canónicas. Vinculación ejecutable a la política global **pendiente** de la promoción controlada de esa política.

## Flujo obligatorio
`INVENTARIAR → SNAPSHOT → PROPONER → BORRADOR PARALELO EN STAGING → RENDER → E2E → 25 CAPAS SEO/WEB → SUPERVISIÓN/TRIBUNAL → OLD VS NEW → ROLLBACK DEMOSTRADO → GATE → CANARY PROD → MEDICIÓN → APRENDIZAJE`.

La web oficial **no recibe cambios** a partir de este documento, ni se activa una promoción automática. Primero verificar aislamiento físico de STAGING; luego probar copia/restauración de un borrador independiente y pruebas de URL, assets, plugin, Elementor, forms, CRM y consentimiento. La copia hacia PROD se autoriza solo tras un recibo de certificación por cambio; los fallos son bloqueantes, sin simulaciones de éxito.

## Políticas SEO obligatorias
- No generar nuevas landings de municipio sin relevancia real y prueba de diferenciación. Reutilizar/consolidar URL propietaria cuando corresponda; nunca borrar una URL válida automáticamente.
- Los contenidos financieros son YMYL: claims, promesas, datos y casos materiales necesitan fuente, vigencia y revisión aplicable.
- Visibilidad en IA: fundamentar en contenido original, útil y técnicamente rastreable, no vender `llms.txt` o estructuras artificiales como garantía.
- No marcar ciudad `COMPLETE` hasta todo `CITY_COMPLETE_V2`: landing, supporting, enlazado, lead magnet, consentimiento separado, entrega, CRM, newsletters, QA, indexación y medición.
- Prohibidos gastos o nuevas suscripciones sin decisión explícita; los agentes mandan y reutilizan WordPress nativo, plugin propio, Abilities, REST o navegador exclusivamente como adaptadores auxiliares. No usar WPVibe; Make no es dependencia nueva.

## Alcance técnico real de esta entrega
`enterprise-family-staging.contract.json` + tests: **estructura, criterio de aceptación y control anti-falsos-verdes**. No se ha fabricado todavía la ejecución de agentes SEO, el supervisor operativo especializado ni el release executor de PROD. El despliegue real deberá ser otro cambio con pruebas físicas y rollback. No prometer máxima posición en Google ni garantía de resultados.

## Siguiente implementación segura
1. Inventario/hash diferencial WordPress STAGING vs PROD, plugins, options, theme, Elementor, formularios, base de datos y backup; **solo lectura**.
2. Materialización FACT-001 de perfiles SEO sin crear motores duplicados.
3. Activar y ensayar la familia Financiera/Inmobiliaria en LAB sobre un borrador aislado de STAGING.
4. Verificación de todos los gates y canary/rollback antes de proponer promoción gradual a PROD.
5. Tras datos reales y resultado económico, extender familias ecommerce y SaaS.
