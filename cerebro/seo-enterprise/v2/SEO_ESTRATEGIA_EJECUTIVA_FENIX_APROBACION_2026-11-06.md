# FÉNIX CAPITAL · Estrategia SEO Enterprise V2 — decisión del propietario

**Estado:** PROPUESTA PARA APROBACIÓN, no aprobada. **Fecha:** 6-11-2026. **Empresa:** fenix. **Motor:** SEO-001. **Versión:** 2026-11-06. **PR:** #22 DRAFT (no fusionar).
**Fuente canónica:** `seo-marketing-plan-for-owner-approval-v1.json` (plan ID `FENIX_SEO_MARKETING_DIRECTION_PROPOSAL_20261105`). Esta presentación no crea ni reemplaza otra estrategia.

## Decisión que necesita el propietario

Aprobar la **dirección estratégica** para que CEREBRO prepare trabajo y borradores de WordPress, **NO autoriza publicar, gastar, alterar URLs existentes ni levantar el bloqueo de Core Guard**. La aprobación editorial/publicación es posterior e individual, ligada a la huella exacta de cada borrador.

## Resultado empresarial buscado

Convertir el inventario ya existente —200 URL estratégicas (166 páginas + 34 posts, snapshot del 5/11), 8 embudos, 24 pares B2B/B2C y sus recursos— en una máquina de captación medible que priorice **leads cualificados y operaciones**, no volumen de texto. Aprovechar cada contenido y media ya disponible antes de crear duplicados.

**Mercados:** (1) Córdoba capital y provincia; (2) Jaén capital/provincia, solo tras certificar piloto; (3) Sevilla capital/provincia después; expansión por localidad uno a uno. No activar ciudades en masa hasta pasar City Complete y gates específicos.

## Segmentación y captación

1. **B2C comprador de vivienda:** asesoría hipotecaria local, estudio previo, checklist de visita, calculadoras, CTA de llamada/WhatsApp, preguntas frecuentes y formularios propios.
2. **B2C propietario/vendedor:** valoración, preparación de venta, captación de propietarios, requisitos informativos y CTA adecuados (sin mezclar con financiación).
3. **B2B inmobiliarias:** captación de agencias asociadas, financiación a compradores, formularios/atribución/contacto profesional distintos de B2C.
4. **Casos hipotecarios especiales:** autónomos, funcionarios, alta financiación u otros perfiles, con evidencia, condiciones claras y revisión de afirmaciones financieras antes de aprobar.

**Privacidad:** consentimiento para atender una solicitud distinto del consentimiento comercial. Descarga transaccional del checklist sin suscripción automática. Dos newsletters semanales independientes, una para particulares y otra para inmobiliarias, solo tras opt-in verificable y prueba E2E. No Hostinger Reach, WPVibe ni Make.

## Producción editorial y técnica — circuito obligatorio

`RESEARCH_USANDO_CORPUS` → `PLAN_PROPUESTO` → **APROBACIÓN ESTRATEGIA PROPIETARIO** → `BRIEF_PRIORIZADO` → `BORRADOR` → `QA_SEO_YMYL_MARCA_ENLACES` → `TRIBUNAL_INDEPENDIENTE` → **APROBACIÓN BORRADOR CON DIGEST** → `SNAPSHOT+ROLLBACK` → `PUBLICACIÓN_CONTROLADA` → `MONITORIZACIÓN+ATRIBUCIÓN` → `APRENDIZAJE`.

- Separación de autor, revisor y tribunal; identidad autenticada y ámbitos de permiso por empresa.
- Un borrador existente no se vuelve a crear. Se revisa por ID, se conserva su versión y se registra OLD vs NEW.
- Sin evidencia de permiso de escritura, rollback y revisión humana por versión, no hay publicación.
- Tras **tres publicaciones reales individualmente aprobadas** del mismo tipo, solo se **evalúa** autonomía por alcance; nunca se concede por simple recuento.
- GSC/GA4 medidos por fuentes verificadas, no rankings inventados. No mover `/`, `/inicio/`, canónicos ni redirecciones sin datos.

## Primer lote de trabajo — reutilizar, no duplicar

| Orden | Activo existente | Entregable del motor | Gate |
|---|---|---|---|
| 1 | WordPress **52656** (borrador checklist visita Córdoba) | QA, CTA, entrega PDF V2 privada y revisión individual | PDF privado+evento servidor+ledger+Brevo E2E y aprobación |
| 2 | Montilla **49114 B2C** y **49128 B2B** (publicados) | Mapa OLD/NEW del formulario y segmentación por persona, sin reescribir las páginas | Captación/privacidad/CRM E2E, rollback |
| 3 | Corpus SEO 200 URL | Backlog de oportunidades por intención, tramo del funnel, evidencia del activo y riesgo de canibalización | Selección de brechas sin repetir auditoría global |
| 4 | 8 embudos / 24 pares | Dos briefs nuevos por perfil prioritario, usando primero activos existentes | Estratégico aprobado, ownership y pruebas |
| 5 | Newsletters existentes/planificadas | Dos líneas de envío separadas, con política de doble opt-in y cadencia semanal | Consentimiento y buzones de control verificados |
| 6 | Jaén/Linares piloto | City Complete con mismo nivel editorial, captación, marca, Core Web Vitals, enlaces, legal, fuentes y medición | QA individual antes de expansión |

Este lote no autoriza ahora edición de posts publicados ni alta de suscriptores.

## Ritmo operativo (cuando esté autorizado)

- Lunes: estrategia/briefs y prioridades basadas en resultados reales.
- Martes–jueves: elaboración, QA, tribunal y remisión de borradores a revisión.
- Viernes: comparar resultados OLD vs NEW, revisar conversiones y aprender.
- Publicar únicamente contenidos aprobados con versión/digest exactos; al principio revisión humana de cada uno. Si falta aprobación, conservar como borrador.

## Cuadro de mando por empresa

**North Star:** leads cualificados orgánicos con fuente/consentimiento verificables, atribución y resultado comercial conectado cuando sea legítimo.
**Métricas:** clics e impresiones GSC, CTR y páginas que reciben tráfico, formularios con origen B2C/B2B, tasa de conversión de landing, solicitudes de recurso y entrega confirmada, nuevos contactos válidos, citas/ventas cuando se integren CRM y consentimientos, coste por resultado.
**Guardarraíles:** páginas válidas preservadas, duplicados detectados, QA financiero/legales, seguridad, tasa de error, tiempo hasta rollback, gasto adicional no autorizado = 0.
**IMPORTANTE:** no existen en el corte valores GSC/ventas verificables que permitan fijar mejoras porcentuales reales.

## Capacidad multiempresa

El mismo runtime de trabajo reutiliza `company_id`, `engine_id`, `environment`, `version`, `plan_version`, `content_id`, `source_digest` y permisos: Company Registry + Brand/Knowledge + Search Data + Editorial Factory + QA/Tribunal + Publication Adapter + Metrics. Nueva empresa = onboarding, políticas, activos y permisos independientes. Ninguna publicación o aprendizaje puede cruzar empresas.

## Alternativa operativa sin Work

Ruta seleccionada: **GitHub Actions + código existente FACT-001/JOB-001/SEO-001 + WordPress Cowboy/Core Guard + Supabase ligero para decisiones/ledger**, bajo cuota existente. Work/Make/WPVibe/IA de pago no son requisitos. Cloudflare Workers Free queda como opción ligera tras verificar cuotas e integración, no como condición de arranque. Los workflows GitHub de PR validan el software pero no se confunden con un orquestador vivo conectado.

## Condiciones de aprobación

La decisión del propietario sobre este documento autoriza **solo** `STRATEGY_APPROVED` y generación de briefs/borradores sujetos a permisos. **Nunca** equivale a `DRAFT_PUBLICATION_APPROVED`, desbloqueo Core Guard, despliegue o gasto. Se registra la revisión con identidad, fecha, digest de contenido y referencia de empresa. Para publicación se exige otra aprobación exacta o una delegación validada por política posterior.

**Rollback:** mientras todo permanezca en PR DRAFT, conservar la propuesta anterior y revertir solo la adición. Para WordPress, snapshot previo, comparación de contenido y restauración física probada antes de publicar.
