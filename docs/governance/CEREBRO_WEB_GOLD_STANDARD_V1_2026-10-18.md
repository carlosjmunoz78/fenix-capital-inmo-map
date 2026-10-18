# CEREBRO WEB GOLD STANDARD V1

**Fecha:** 2026-10-18  
**Ámbito:** multiempresa · PREPROD/STAGING primero  
**Aplicación inmediata:** Fénix Capital · `STAGING V5 remediation`  
**Objetivo:** convertir “buena URL / buena landing / buen artículo” en un contrato auditable, corregible y reutilizable por CEREBRO.  
**Regla base:** CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.  
**PROD:** este documento NO autoriza promoción.

## 1. Fuentes y naturaleza del contrato

Este contrato combina:

1. **Reglas explícitas Fénix/Carlos para la web:**
   - la UI web **no debe diseñarse con estética morada ni rosa**;
   - en móvil, cuando una sección tenga heading e imagen asociada, el orden objetivo es **HEADING → IMAGEN → CONTENIDO**;
   - preservar lo que ya funciona y corregir causa raíz/template antes que 204 páginas manualmente.
2. **Reglas existentes de CEREBRO:** baseline, OLD vs NEW, backup, rollback, PREPROD, no inventar datos, coste adicional 0 € por defecto.
3. **Buenas prácticas oficiales de Google Search Central vigentes en la fecha de este documento:** URLs simples/descriptivas y legibles, títulos descriptivos/concisos, contenido people-first/original/completo y precisión reforzada en YMYL, y structured data de Article/Breadcrumb cuando sea fiel al contenido visible.
4. **Criterios de ingeniería/UX/CRO de CEREBRO:** son contrato interno de calidad, no se presentan como factores de ranking oficiales de Google.

## 2. GATES obligatorios nuevos

Ninguna URL se considera lista para promoción si no pasa los gates que le correspondan:

- `URL_STANDARD_GATE`
- `PAGE_PURPOSE_GATE`
- `LANDING_STANDARD_GATE` cuando sea landing
- `LOCAL_DIFFERENTIATION_GATE` cuando sea landing local
- `ARTICLE_STANDARD_GATE` cuando sea artículo/post
- `YMYL_TRUST_GATE` cuando trate hipotecas, financiación, deuda, fiscalidad o decisiones económicas materiales
- `MOBILE_SECTION_ORDER_GATE`
- `FENIX_VISUAL_POLICY_GATE`
- gates existentes L01–L25.

Los gates no exigen reescribir por reescribir. Si una URL existente ya cumple, se conserva.

---

# 3. URL GOLD STANDARD

## 3.1 Principios

Una URL objetivo debe ser:

- única y canónica;
- estable en el tiempo;
- legible por personas;
- descriptiva de la entidad/intención principal;
- corta **sin sacrificar comprensión**;
- en español cuando la audiencia sea española;
- minúscula;
- palabras separadas por guiones `-`;
- sin parámetros de tracking en la URL canónica;
- sin fechas salvo que la fecha sea parte real del producto/contenido y deba permanecer en el slug;
- sin IDs técnicos cuando no sean necesarios;
- sin palabras de relleno si eliminarlas no vuelve ambiguo el significado;
- coherente con la jerarquía real del sitio, no con una jerarquía artificial solo “para SEO”.

## 3.2 Prohibiciones / alertas

Auditar y marcar:

- slugs duplicados o casi equivalentes con la misma intención;
- URL con keyword stuffing;
- mezcla arbitraria singular/plural;
- slugs heredados que contradicen la intención actual;
- cadenas de redirect;
- URL interna que apunta a redirect cuando puede apuntar al destino final;
- canonical que no coincide con la URL propietaria;
- fragmentos `#` usados para representar contenido que debería tener URL rastreable propia;
- parámetros que generan duplicados indexables;
- cambios de slug sin mapa de redirección 301 y comprobación de inlinks.

## 3.3 Patrones objetivo por arquetipo

Estos patrones son **orientativos**, no una orden de migración masiva. Primero se compara el coste/riesgo de cambiar una URL existente.

| Arquetipo | Patrón preferido | Ejemplo conceptual |
|---|---|---|
| Pilar de servicio | `/hipotecas/` | tema raíz |
| Tipo/producto | `/hipotecas/hipoteca-100/` | producto/intención transaccional |
| Perfil | `/hipotecas/hipoteca-100/funcionarios/` | producto + perfil |
| Proceso/guía | `/hipotecas/documentacion/` o jerarquía canónica equivalente | resolver una tarea |
| Mejora/refinanciación | `/mejorar-hipoteca/.../` o silo canónico ya aprobado | intención específica |
| B2B inmobiliarias | `/inmobiliarias/.../` | intención profesional |
| Landing local | patrón único aprobado para el cluster; no mezclar dos convenciones para el mismo tipo | ciudad como entidad, no texto de relleno |
| Recurso/herramienta | `/recursos/<herramienta>/` cuando el árbol real lo justifique | calculadora/checklist/guía |
| Artículo | slug descriptivo del tema bajo la estructura editorial canónica | no fecha artificial ni keyword repetida |

## 3.4 Scoring URL

Cada URL recibe 0–2 puntos en: unicidad de intención, legibilidad, estabilidad, jerarquía, canonical, ausencia de duplicación/parámetros, coherencia de lenguaje y compatibilidad con enlazado.  
**PASS:** sin fallo crítico y >= 85% del score.  
**FAIL crítico:** conflicto canonical/intención, duplicado material, redirect chain o cambio de slug sin rollback/redirección.

---

# 4. PAGE PURPOSE GOLD STANDARD

Antes de evaluar diseño o copy, cada página debe responder en una línea:

> “Esta URL existe para ayudar a [audiencia] a [resolver intención] y convertir/avanzar mediante [acción principal].”

Debe existir **una URL propietaria por intención principal**. Dos páginas pueden tocar el mismo tema, pero no deben competir por la misma necesidad sin una diferenciación clara de audiencia, etapa, ubicación o producto.

Campos obligatorios por URL:

- `page_type`
- `primary_audience`
- `primary_intent`
- `primary_topic/entity`
- `primary_conversion`
- `supporting_topics`
- `owner_cluster`
- `parent_url`
- `canonical_url_target`
- `evidence_level`
- `ymyl=true/false`

---

# 5. LANDING GOLD STANDARD

## 5.1 Estructura de aceptación

Una landing excelente no se valida por número fijo de palabras. Debe cumplir su propósito con contenido suficiente y útil.

Orden conceptual recomendado — puede variar si OLD vs NEW demuestra una mejor solución:

1. **Hero:** H1 inequívoco + propuesta de valor + prueba/confianza + CTA principal.
2. **Problema/intención:** demostrar que se entiende la situación concreta del usuario.
3. **Qué obtiene / cómo ayudamos:** beneficio y alcance real del servicio.
4. **Criterios / encaje / requisitos:** reducir leads incorrectos y aumentar confianza.
5. **Proceso:** pasos, tiempos solo si están vigentes y autorizados.
6. **Prueba:** evidencia real, caso verificable o ejemplo claramente etiquetado.
7. **Bloques de decisión:** dudas, comparaciones, costes/riesgos cuando corresponda.
8. **FAQ real:** preguntas que resuelven objeciones, no relleno SEO.
9. **CTA final:** misma conversión primaria y alternativa secundaria razonable.
10. **Enlaces de continuación:** pilar, recursos y páginas vecinas estrictamente útiles.

## 5.2 Criterios obligatorios

- H1 único y alineado con title/intención.
- Above-the-fold entendible sin leer toda la página.
- CTA principal visible y consistente.
- Claim financiero trazable y vigente.
- Nada de datos locales, porcentajes, bancos, tiempos o casos inventados.
- Sin bloques clonados que solo cambien ciudad/perfil.
- Imágenes con función semántica o emocional clara, no decorado genérico repetitivo.
- Schema solo si representa contenido visible real.
- Enlazado interno contextual; evitar listas masivas de municipios/URLs sin necesidad del usuario.
- Diseño que priorice lectura, confianza y conversión sobre ornamentación.

## 5.3 Landing local

Además debe pasar `LOCAL_DIFFERENTIATION_GATE`:

- entidad local inequívoca;
- contexto verificable de la localidad cuando aporte valor;
- diferenciación real de copy/FAQ/ejemplos/relaciones locales;
- no crear “hechos locales” para bajar similitud;
- no repetir automáticamente el mismo bloque de localidades vecinas;
- medir similitud contra páginas hermanas y revisar manualmente los outliers;
- si no existe suficiente diferenciación útil, CEREBRO puede recomendar consolidar/no crear en vez de fabricar thin content.

## 5.4 Landing por perfil/producto/B2B

Debe cambiar el **problema y la decisión**, no solo las palabras. El gate debe demostrar qué preguntas, objeciones, documentación, riesgo, CTA y evidencia son propias de ese perfil/producto/audiencia profesional.

---

# 6. ARTICLE GOLD STANDARD

## 6.1 Propósito

Un artículo debe responder una pregunta o conjunto coherente de preguntas mejor que una simple landing comercial. Su éxito primario es **resolver la intención informativa**, y después conducir de forma natural al siguiente paso.

## 6.2 Estructura recomendada

1. `<title>` descriptivo y conciso.
2. H1 claro, coherente con el title pero no necesariamente idéntico.
3. Entradilla que responda rápidamente qué va a resolver el lector.
4. Respuesta corta/definición temprana cuando la intención lo permita.
5. Desarrollo H2/H3 por subpreguntas reales.
6. Ejemplos, cálculos, escenarios o tablas cuando mejoren comprensión.
7. Riesgos/excepciones y “cuándo no aplica”.
8. Fuentes/fecha de revisión en temas YMYL cuando proceda.
9. Autor/revisor con identidad y competencia adecuada cuando sea material.
10. CTA contextual hacia herramienta, revisión o servicio; no interrumpir cada párrafo.
11. Enlaces internos al pilar y piezas de profundización.
12. FAQ solo si añade valor no cubierto arriba.

## 6.3 Calidad

El `ARTICLE_STANDARD_GATE` audita:

- originalidad/valor añadido;
- completitud respecto a intención;
- exactitud y vigencia;
- experiencia/expertise demostrable cuando proceda;
- separación entre hecho, ejemplo, opinión y estimación;
- claridad y escaneabilidad;
- ausencia de keyword stuffing;
- ausencia de relleno para alcanzar una longitud arbitraria;
- coherencia de title/H1/subheadings;
- recursos visuales/tablas útiles;
- fecha `dateModified` solo cuando existe modificación real;
- autoría y revisión;
- `Article`/`BlogPosting` schema fiel al contenido visible, con headline, image, fechas y author cuando aplique;
- enlaces y CTA coherentes con el journey.

## 6.4 Artículo YMYL financiero

Debe elevar el estándar:

- fuente primaria u oficial preferente para hechos materiales;
- fecha de vigencia;
- revisión experta cuando la afirmación pueda cambiar una decisión económica;
- no prometer aprobación, porcentaje, coste o resultado sin fundamento;
- explicar supuestos y límites;
- marcar claramente casos ilustrativos frente a casos reales.

---

# 7. FENIX VISUAL POLICY GATE

## 7.1 Color

Para la **interfaz web de Fénix**, la dirección visual objetivo es:

- base: blanco, negro/antracita y grises limpios;
- acentos principales: naranja/amarillo corporativos cuando aporten jerarquía y contraste;
- **no usar morado ni rosa como estética dominante, fondos de sección, botones principales, gradientes, cards o acentos recurrentes**;
- `#870064` sigue formando parte del manual/activos de marca existentes, pero **no debe convertirse en lenguaje visual protagonista de la UI** salvo activo oficial inseparable o excepción documentada;
- no alterar el logo para “eliminar” un color si forma parte de su versión oficial.

Esta es una **regla operativa web Fénix** y debe convivir con el manual de marca sin reescribirlo silenciosamente.

## 7.2 Móvil: orden heading → imagen → contenido

`MOBILE_SECTION_ORDER_GATE`:

Cuando una sección tenga un heading y una imagen que ilustra ese bloque, el orden móvil objetivo es:

`H2/H3 → IMAGEN ASOCIADA → TEXTO/CONTENIDO → CTA (si aplica)`

Requisitos:

- la imagen no debe aparecer antes del heading al que pertenece;
- una composición desktop de dos columnas debe reordenarse explícitamente en móvil si el DOM/CSS produce otro orden;
- `order` CSS solo se usará si no rompe orden de lectura/accesibilidad; preferir DOM semántico correcto o templates/componentes bien estructurados;
- alt y contexto deben mantener relación con el heading;
- respetar aspect-ratio, anchura y espaciado consistentes;
- excepciones: hero, logos, iconos/avatares, imágenes de fondo o elementos que no sean la imagen principal de una sección. La excepción debe ser intencional, no accidental.

---

# 8. ARQUETIPOS QUE WAUD-001 DEBE CLASIFICAR

Antes de auditar, cada URL se clasifica como una de estas categorías o una extensión registrada:

- HOME
- SERVICE_PILLAR
- PRODUCT_TYPE
- AUDIENCE_PROFILE
- LOCAL_B2C
- LOCAL_B2B
- B2B_SERVICE
- PROCESS_GUIDE
- IMPROVEMENT_SERVICE
- RESOURCE_TOOL
- ARTICLE_INFORMATIONAL
- CASE_STUDY
- ABOUT_TRUST
- LEGAL
- CONTACT_CONVERSION
- CATEGORY_ARCHIVE
- SYSTEM_TEST

Cada arquetipo tendrá thresholds propios, pero comparte los gates de seguridad, marca, responsive, accesibilidad y evidencia.

---

# 9. MATRIZ DE AUDITORÍA V5

Por URL deben guardarse como mínimo:

```yaml
url:
page_type:
status:
primary_intent:
primary_conversion:
url_standard_gate:
page_purpose_gate:
landing_standard_gate: NA|PASS|FAIL|PARTIAL
local_differentiation_gate: NA|PASS|FAIL|PARTIAL
article_standard_gate: NA|PASS|FAIL|PARTIAL
ymyl_trust_gate: NA|PASS|FAIL|HUMAN_REQUIRED
fenix_visual_policy_gate:
mobile_section_order_gate:
l01_l25_status:
findings:
severity:
confidence:
action:
owner:
old_vs_new_evidence:
rollback:
```

## 9.1 Severidad

- **P0:** rompe promoción, legal/seguridad, intención/canonical crítica, form/lead loss, datos inventados o fallo visual/funcional severo.
- **P1:** degradación SEO/UX/CRO/accesibilidad material.
- **P2:** calidad/mantenibilidad/consistencia mejorable sin riesgo inmediato.
- **P3:** cosmético o optimización opcional.

---

# 10. Aceptación “mejor versión”

Una URL no es “la mejor” porque maximice keywords, número de bloques o longitud. Es la mejor versión cuando:

1. tiene una intención y audiencia inequívocas;
2. responde de forma completa y fiable;
3. no duplica innecesariamente otra URL;
4. hace fácil la siguiente acción;
5. es rápida, accesible y robusta;
6. usa una jerarquía visual coherente con Fénix;
7. en móvil mantiene orden lógico —incluido H → imagen → contenido cuando aplica—;
8. supera OLD vs NEW sin regresiones;
9. puede mantenerse mediante template/componente/regla y no depende de retoques manuales infinitos;
10. deja evidencia reproducible para CEREBRO, Notion y rollback.

## 11. Regla de ejecución V5

En la reparación V5, CEREBRO debe buscar primero **causa raíz**. Si 70 páginas comparten el mismo defecto de template, se corrige template/componente y después se ejecuta regresión sobre las 70. Solo se edita URL por URL cuando la causa sea realmente individual.

Este contrato debe formar parte del tribunal PREPROD y del baseline V5 final.