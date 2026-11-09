# CEREBRO OS · UMS-001 · ESTÁNDAR MAESTRO DE CINE VIVO MULTIRRED
**Versión:** 1.0.0 · **Fecha:** 2026-11-09 · **Estado:** DEFINIDO / DOCUMENTADO EN LAB, NO PROMOCIONADO AL RUNTIME PROD

**Ámbito:** Fénix Capital y motores audiovisuales multiempresa. `company_id=fenix`, `engine_id=UMS-001`, `environment=LAB`, `version=creative-film-standard-v1.0.0`. El estándar debe aplicarse al generar NUEVOS encargos, sin deshacer ni alterar los vídeos, casting, clips, scripts, integraciones o publicaciones existentes. Toda promoción requiere QA y política de human-by-exception.

## 0. Mandato creativo no negociable
**No hacemos presentaciones de fotografías, vídeos corporativos convencionales ni diapositivas con zoom. Hacemos microhistorias de cine con acción, mundos vivos, actuaciones, VFX y sonido sincronizado.** Aspiración estética de grandes producciones de fantasía/acción/ciencia ficción (referencias orientativas: Marvel/Lucasfilm), sin copiar personajes, franquicias ni propiedad intelectual ajena. Calidad premium en cualquier género. No todos los vídeos son cyberpunk, apocalípticos ni comerciales.

**Hook efectivo desde el primer fotograma** y al menos un acontecimiento memorable, novedoso, visualmente comprensible y emocional. El espectáculo debe servir a la historia y no ser una acumulación repetitiva de efectos.

## 1. Tres narrativas orquestadas, pero distintas
1. **Guion visual autónomo:** personajes y grupos hacen cosas; trama y acción desarrollan un problema, sorpresa, transformación o desenlace, incluso sin audio. No debe limitarse a ilustrar literalmente la locución.
2. **Guion verbal autónomo:** locución informativa, educativa, comercial, emocional o narrativa según el encargo. La voz no está obligada a describir los planos ni a vender. Debe ser inteligible, adecuada al público de España cuando corresponda, con permisos de voz.
3. **Guion sonoro autónomo:** música original o licenciada, ambientes, respiración, pisadas, telas, puertas, viento, hojas, animales, tráfico, golpes, destrucción, transiciones, efectos sobrenaturales y **silencios dramáticos**. Sonidos precisos, variados y causalmente sincronizados con acciones/cámara; el volumen se mezcla para preservar inteligibilidad de la voz. No reutilizar sin criterio una única plantilla sonora.

Cada orden debe contener `visual_storyboard`, `voice_script`, `sound_design_cue_sheet` y `music_rights_ledger`, con sincronización temporal y pruebas.

## 2. Biblioteca de actores digitales / buyer personas hipotecarios
- La biblioteca contiene **identidades de actores**, no fotos para pegar en pantalla. Retratos de frente/perfil/cuerpo entero, expresiones, vestuario y 360º son referencias para generar **vídeo en movimiento**: caminar, correr, hablar, pensar, mirar móvil, abrir puertas, abrazar, interactuar, saltar, asustarse, etc.
- Los **protagonistas y unidades de reparto** representan buyer personas plausibles de compra de vivienda e hipoteca para Fénix: primer comprador, pareja, familia, funcionario, asalariado, autónomo, empresario, comprador de cambio de vivienda, inversión viable, accesibilidad, etc. Definir necesidades, contexto financiero plausible y motivación sin garantizar aprobación ni convertir ficción en testimonio real.
- Un `cast_unit` puede ser **una persona, pareja, familia, dos parejas, grupo de amigos o varios compradores**. Cada individuo tiene ID fijo, identidad/rasgos, cuerpo, voz, edad narrativa, vestuario, relación con los demás, referencias y acciones; cada grupo tiene `cast_unit_id`, miembros y vínculos estables. Los 31 candidatos antiguos no equivalen necesariamente a 31 unidades protagonistas individuales.
- Los perfiles que no encajen con la audiencia hipotecaria prioritaria se reclasifican como secundarios o `BUYER_PERSONA_REVIEW`, **sin borrar**; la edad por sí sola no decide elegibilidad financiera, no usar exclusiones indiscriminadas.
- **Continuidad absoluta:** identidad facial y física, complexión, altura relativa entre miembros, cabello, ropa o cambios motivados, accesorios, heridas, objetos, manos, interacción, dirección de movimiento, relación espacial, mirada, meteorología y paso temporal. **Mismas personas en todos los planos y episodios de la serie.** Mantener `character_id`, `cast_unit_id`, `series_id`, `appearance_bible_version`, `continuity_map` y referencias verificables. No generar cinco dobles parecidos de la misma persona ni cambiar integrantes entre escenas.
- Rechazo automático en QA si se observa cambio de cara, miembros extra, dedos/manos incoherentes, salto de vestuario sin guion o relaciones alteradas. Revisión visual humana para lo que no sea verificable algorítmicamente.

## 3. Mundos con vida real y reactividad
- El decorado **nunca está congelado**. Incorporar vida natural o urbana **cuando corresponda**: pájaros, insectos, árboles, hojas, vegetación, viento, nubes, sol/sombras móviles, agua, reflejos, peatones, coches, ropa y pelo reaccionando, humo, polvo, lluvia, huellas, objetos y luces.
- No colocar todos los elementos en todos los planos; realismo contextual. Un exterior lluvioso no requiere mariposas. Un interior muestra microactividad coherente: cortinas, reflejos, luz, polvo atmosférico, gestos de fondo.
- Si hay un fenómeno extraordinario, debe generar consecuencias físicas: sacudir árboles y cabello, proyectar reflejos/sombras, desplazar polvo, modificar sonido, reacción facial y corporal. `world_state` continuo entre planos.
- **Vídeo genuino**, cámara y ambiente temporal reales; no fotos con zoom, falsas animaciones de diapositiva ni personajes ante fondos planos.

## 4. Dirección y VFX de ambición cinematográfica
- Dirección de actores; plano/contraplano; close-up emocional; movimientos coherentes de cámara (travelling, dolly, órbita, dron, cámara baja, perspectiva y profundidad); iluminación y color que cuentan una emoción.
- VFX complejos y **materiales**: colapso, renacimiento, portales, alteración de escala/gravedad, reconstrucción de ciudades, nubes, partículas, fenómenos, magia, criaturas originales; sin perder legibilidad, verosimilitud ni identidad.
- **Contrast reveal:** una calle española hiperrealista normal, viva y creíble puede cambiar súbitamente por una situación imposible. No usar estética cyberpunk por defecto. El imprevisto/impacto debe partir de la narrativa.
- Evitar latiguillos cansinos: fénix literal en cada escena, explosiones constantes, misma cámara, mismos assets sin contexto, glow genérico, efectos superficiales o sonido de stock repetido.

## 5. Géneros y aprendizaje de estilos
Explorar al inicio varias familias con pequeñas muestras comparables:
- Hiperrealismo natural con giro sorprendente.
- Realismo mágico/fantasía con integración física.
- Acción-comedia espectacular.
- Emocional premium/drama con desenlace.
- Épico fantástico/ciencia ficción/apocalíptico cuando el guion lo exija.
- Otros estilos nuevos cuando aporten diferenciación.

Por `company_id+platform+buyer_persona+topic+series_id+style_id` registrar `hook_3s_retention`, `average_watch_time`, `completion_rate`, `shares`, `saves`, `likes`, `comments`, `profile_visits`, `link_clicks`, `qualified_leads`, `CPL_qualified`, muestras, periodo, coste total y origen/atribución de leads. No comparar piezas sin controlar formato, distribución pagada/orgánica, CTA, duración, audiencia, presupuesto y tema. No declarar ganador sin muestra ni datos verificables.
- Tras evidencia suficiente, priorizar **2–3 familias ganadoras**. Orientación inicial orientativa: 80% explotación / 20% exploración, adaptable según datos y fatiga. No gastar en pruebas largas o generar cientos de variantes antes de validar 1–2 pilotos.
- Evitar saturación: rotar personajes, conflictos, escenarios, variaciones de género, efectos, música y ritmo; controlar repetición/alcance y frecuencia.

## 6. Arquitectura de una pieza
`BRIEF Y BUYER_PERSONA` → `CAST_UNIT (individuo/pareja/familia/grupo)` → `GUION VISUAL + VERBAL + SONORO INDEPENDIENTES` → `BIBLIA DE CONTINUIDAD` → `STORYBOARD CON HOOK EN FRAME 0` → `PRUEBA BARATA DE MOVIMIENTO/FX` → `SECUENCIAS DE VÍDEO ANIMADAS` → `VFX Y MUNDOS REACTIVOS` → `FOLEY/SFX/MÚSICA Y SILENCIOS` → `VOZ` → `MONTAJE Y MEZCLA` → `CARETA FINAL REUTILIZABLE POR RED` → `TRIBUNAL QA` → `MEDICIÓN Y APRENDIZAJE`.

La **careta es SALIDA**, nunca la introducción principal ni la historia. Mantener versión por `company_id/platform/aspect_ratio/outro_version`, con `hero_logo`, `brand_palette`, `phoenix_signature`, `sound_logo`, `cta_slot`, `safe_area`, `source_assets`, `license_status`, `quality_status`. Un cierre corporativo recurrente no debe ocupar los primeros segundos de acción ni repetir una larga presentación de monumentos.

## 7. Cierre por red / continuidad de serie
- Instagram/Facebook (y futuras redes) pueden compartir identidad **pero tener ritmo, edición, monumentos, FX y CTA propios**, adaptados al comportamiento real por plataforma, NO únicamente el mismo fotograma con otra etiqueta.
- Crear **secuencia de marca breve**, de aparición memorable, sonido distintivo y lectura rápida en móvil. Logo intacto según manual. Poner el CTA sólo si procede al tipo de vídeo; una pieza informativa puede usar «Consulta la guía» o «Síguenos» en lugar de forzar «Solicita tu preestudio» en todas.
- Diferenciar recursos **identitarios reutilizables** (fénix, logo, paleta, salida) de historia cinematográfica única, que no debe repetirse por inercia. Mantener versiones oficiales sólo tras aprobación real.
- Cumplir especificaciones y safe areas efectivamente probadas en cada plataforma/dispositivo; no inferir que un overlay simulado prueba la previsualización de Meta.

## 8. QA de estreno: cinco tribunales
1. **CINE VIVO:** ¿sucede una historia visible comprensible sin locución? ¿hook inmediato? ¿acción continua real? ¿asombro/punto culminante? ¿ambiente vivo? ¿causalidad FX/sonido?
2. **CASTING Y CONTINUIDAD:** ¿buyer persona realista y unidad completa? ¿mismas identidades en planos/episodios? ¿interacción y relaciones? ¿sin fallos visuales notorios?
3. **AUDIO/VOZ:** ¿sound design de la acción? ¿efectos variados y sincronizados? ¿silencios usados con intención? ¿voz inteligible? ¿música con licencia, atribución y ausencia de saturación?
4. **MARCA/CANAL:** ¿outro breve y reconocible específico por red? ¿logo correcto, paleta permitida, mínimos de legibilidad, CTA adaptable y safe areas reales? ¿voz y mensaje no engañosos? ¿sin superposiciones o rótulos minúsculos?
5. **EFICACIA, DERECHOS, COSTE:** ¿consentimiento/derechos de inputs, personajes y música, claims hipotecarios, transparencia IA, medición de leads y gasto? ¿A/B y stop-loss? ¿rollback y backup?

**La aspiración a calidad premium no se acredita con 1080×1920, FPS o LUFS únicamente.** Se exige inspección visual/audio del resultado. Usar `HUMAN_REQUIRED` sólo cuando realmente aplique `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT` o `CUSTOMER_HUMAN_REQUEST`. Un candidato que no cumple no se publicará.

## 9. Dos ejemplos del propietario: REFERENCIA DE FUERZA, NO PLANTILLAS
- **Pareja / caos urbanístico / lava / fénix / casa reconstruyéndose**: pareja ve anuncios, calle colapsa, aparece fénix, contacta y culmina en llaves de casa. VO cuenta otro recorrido sobre vivienda/financiación. El SFX acompaña ruina y renacimiento.
- **Despertador / carrera rugby al banco / NO / silencio / Fénix**: montaje de acción acelerada, gente que reacciona, rechazo bancario, corte radical de sonido, giro de esperanza. La locución no describe literalmente las acciones.
- El principio a preservar es **fuerza de la imagen + narrativa paralela de voz + diseño sonoro + giro inesperado**, no copiar siempre lava, banco, derrumbes, portales ni el fénix literal.

## 10. No romper lo existente y coste 0 €
`CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR`. Prohibido reescribir o sobrescribir V0–V5.4, RAW, actores, otro motor, App/CRM, Supabase PROD, WordPress/SEO/DNS/Buffer/main/PROD. Priorizar lógica determinista, open-source, licencias verificadas, bibliotecas actuales, GitHub Free con coste medido, renders LAB, y pruebas cortas. No contratar/consumir generación paga sin autorización económica y control. Mantener backup/rollback, versión, runbook, changelog, manifest, QA y contador de coste.

## 11. Referencias internas
- Antigua base: [UMS-001 Traspaso Maestro 31 personajes / Reels 2026-11-08](https://app.notion.com/p/41281b1a756d81888ec6fcecf84b89c5).
- Salida V1 IG: [asset Notion](https://app.notion.com/p/41281b1a756d81fdb5f9fff37cc52acd).
- Salida V1 FB: [asset Notion](https://app.notion.com/p/41281b1a756d81018ca0fcb9ec8e7181).
- Revisión cinematográfica específica V1 vs V5.4: `cerebro/media-studio/v2/runbooks/UMS001_AUDITORIA_CARETAS_INSTAGRAM_FACEBOOK_V1_V54_20261109.md`.
- Manual de marca Fénix Capital, edición 2025, suministrado por el propietario: colorimetría y mínimos de logo obligatorios.

**IMPORTANTE:** tener este contrato documentado en LAB no demuestra todavía que todo el runtime/productor automático lo invoque. Debe conectarse a la FACTORY y a los gates de QA mediante implementación paralela, pruebas y promoción controlada.
