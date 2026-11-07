# CEREBRO SEO Enterprise V2 · Estrategia superior sin tocar contenido existente

**Fecha:** 5 de noviembre de 2026. **Ámbito:** Córdoba → Jaén → Sevilla.  
**Fuente única operativa:** snapshot existente de 166 páginas + 34 posts y 629 imágenes de biblioteca, aceptado por el propietario. **No se ha repetido auditoría.**  
**PR:** #22 DRAFT, sin merge.

## Resultado físico
[GitHub Actions 42119865699](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42119865699): construcción, QA independiente y tribunal **3/3 SUCCESS**. **7/7** pruebas específicas. Salidas:
- `seo-owner-200-url-strategy-v1` (artefacto 13457872275), con `url-ownership-200.json`, `creative-brief-existing-producer.json` y `strategy-summary.json`.
- `seo-owner-independent-qa-v1` (13457614191).
- `seo-owner-tribunal-v1` (13457988433).
Los artefactos caducan según retención Actions de 14 días, pero scripts y corpus permiten su reconstrucción idéntica.

### Cobertura del inventario
- **200 URL** preservadas, clasificadas por intención, persona, etapa de embudo, CTA, contrato de formulario, descargable y newsletter.
- **8 recorridos de conversión propuestos**, incluyendo dos newsletters separadas: `PARTICULARES` y `INMOBILIARIAS`.
- **24 parejas de páginas locales diferenciadas B2B/B2C** (misma localidad, públicos distintos). No se consideran canibalización por compartir ciudad; sus formularios deben permanecer separados.
- **1 duplicidad exacta de keyword:** `hipotecas en Córdoba` en la Home (`/`) y `/inicio/`. Se reserva provisionalmente la Home como intención principal; `/inicio/` se mantiene intacta. **No hay confirmación GSC de canibalización**, ni recomendación automática de 301, 410, noindex o canonicals.
- **7 URL sin focus keyphrase guardada:** requieren asignación editorial, no creación automática de otras páginas.
- La taxonomía distingue 67 landing de asesor local para particulares, 24 de financiación para inmobiliarias, 11 de hipoteca 100, y el resto de asesoría, contenidos, áreas B2B e institucionales.

## Embudos · Estado DEFINITION-ONLY
1. **Particulares BOFU, asesor local:** landing existente → checklist documentación hipoteca → formulario específico hipotecario → preestudio → cita → CRM con consentimiento → newsletter particulares.
2. **Particulares hipoteca 100:** segmento real (parejas, funcionarios, poco ahorro, etc.) → guía hipoteca 100 → formulario viabilidad específico → estudio → seguimiento; no prometer 100% sin condiciones comprobadas.
3. **Particulares informacionales:** artículo → descargable de gastos, reservas y documentación → consentimiento → caso hipotecario cuando lo soliciten.
4. **Inmobiliarias B2B:** landing de captación partners → checklist comprador preparado / protocolo Pre-OK y arras → formulario partner y derivación → coordinación profesional → newsletter inmobiliarias.
5. **Herencias/patrimonio:** contenido existente → checklist herencia y vivienda → consulta específica; revisión legal aplicable.
6. **Resto servicios:** contrato de CTA y formulario según intención, no Brevo genérico universal.

Los 8 contratos concretos están en `strategy-summary.json` / `url-ownership-200.json`. **No afirmar formularios, descargables, eventos GA4, CRM o newsletters operativos:** no existe evidencia física de conexión en este bloque. La estrategia define qué falta, no suplanta su construcción.

## Orden REAL cursada a la productora audiovisual de CEREBRO
Se utilizó la cola existente `public.cerebro_creative_job_v1` mediante la función oficial `cerebro_creative_enqueue_v1`: **job** `c4012f43-c12f-400b-9610-2e5f2e286000`, estado inicial **QUEUED**. Un único piloto de imagen `SEO_IMAGE`, 1200×630, para la URL ya existente `/hipoteca-autonomos-cordoba-requisitos-documentacion/` (ID WordPress 960). **No se añadió otra página.**

El briefing registrado con el job solicita: identidad Fénix con **#222222, #870064, #FFB71B y #FF5F00**, blanco, tipografía **Montserrat**, titulares verificables, safe area, contraste, estética editorial/fotográfica original con derechos, ALT descriptivo, archivo WebP posterior, no datos personales, sin logotipos bancarios, sin promesas de financiación garantizada, QA D16 financiero / D26 imagen / D31 SEO y tribunal.

**Calidad pendiente:** el renderer programático existente tiene estilizado Arial en algunos caminos. Por tanto, la pieza **NO SE DECLARA conforme a Montserrat, ni apta para subir**, hasta inspeccionar el artefacto real o corregir el renderer. La cola privada no es publicación. Un solo job, `max_attempts=1`, coste nuevo previsto 0 €.

## Reglas de ejecución antes de escribir en WordPress
Conservar → entender → envolver → probar → mejorar → migrar.
1. D05/D08 valida la asignación de intención sin destruir páginas.
2. D24 y D15 conectan formularios/descargables especializados; D30 define eventos; no mezclar B2B/B2C.
3. D26 recibe assets exclusivamente de la productora, con licencia/derechos, formato, peso, ALT y QA. No reusar una imagen sin comprobar pertinencia.
4. D13/D16 comprueban copy y promesas hipotecarias. D31 y tribunal verifican OLD vs NEW.
5. Backup/snapshot específico, contrato actual y rollback probado antes del primer `wp_create_post` real.
6. El motor origen mantiene la publicación en `DENY`; no crear ni redirigir URLs, no tocar App/CRM/WordPress publicados sin superar gates.

## Estado preciso
**HECHO:** mapa 200/200, propuestas de embudo 8/8, un solapamiento exacto identificado, separación B2B/B2C, pedido audiovisual en cola, QA y tribunal.  
**PARCIAL:** fuentes de rendimiento, formularios y descargables conectados, imagen entregada y aprobada.  
**PENDIENTE:** resolución demostrada de canibalización GSC, publicaciones/cambios físicos WordPress, certificación 32/32 autonomía PROD.  
**Coste nuevo:** 0 € previsto. **Cambios publicados:** 0.
