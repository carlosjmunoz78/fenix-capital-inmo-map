# CEREBRO OS · UMS-001 PRODUCTORA AUDIOVISUAL · TRASPASO MAESTRO

**Fecha de corte:** 2026-11-08 (Europe/Madrid)  
**Identificador de continuidad:** `CEREBRO-UMS001-HANDOFF-REELS-CASTING-20261108-V1`  
**Empresa:** Fénix Capital · Córdoba y Andalucía  
**Motor:** UMS-001 (lógico) · `company_id=fenix`, `engine_id=UMS-001`, `environment=LAB`, `version=handoff-v1`  
**Objetivo:** pasar del casting/almacén visual a pruebas físicas de Reels para Facebook e Instagram **reutilizando las salidas cortas ya hechas**, preservando identidad facial y biblioteca, sin tocar PROD.

## 1. ÓRDENES OBLIGATORIAS PARA EL CHAT QUE RECIBA EL TRASPASO

**RECUPERA LOS ARCHIVOS POR TU CUENTA.** Antes de solicitar nada al usuario:
1. Buscar en la **Biblioteca de ChatGPT / biblioteca del Proyecto** los archivos por `UMS001`, `CEREBRO-UMS001-HANDOFF-REELS-CASTING-20261108-V1`, `01_ESTADO_MAESTRO_UMS001_2026-11-08.md`, `02_PROMPT_CONTINUACION_UMS001.md`, `03_ESTADO_MAQUINA_UMS001.json`. Usar `files.search` / `files.list` / `files.read` según disponibilidad. Comprobar también los archivos disponibles del Proyecto.
2. Abrir el **Google Drive existente** y descargar/ver las imágenes, MP4, manifests, clips y recursos requeridos; no pedir al usuario que los vuelva a subir.
3. Consultar la página de continuidad en **Notion** y el catálogo `🎞️ Assets · Recursos de Producción`, contrastar fichas y estados.
4. Revisar la **rama LAB** del repositorio GitHub (no confundir con main). Usar herramientas conectadas GitHub, Drive, Notion y ordenador/navegador disponible; no asumir que el navegador del PC local es controlable en este modo.
5. Continuar **desde el paso pendiente real**, sin volver a generar materiales que ya están hechos, salvo correcciones controladas con versiones nuevas y preservación del RAW.
6. No detenerse a pedir aprobaciones repetidas para lecturas, archivo o pruebas gratuitas reversibles; no afirmar QA completo sin evidencia. Solo HUMAN_REQUIRED por razones reales según política de CEREBRO.

## 2. ESTADO HECHO Y VERIFICADO

### 2.1 Biblioteca previa y continuidad
- 65 imágenes únicas ChatGPT o referencias creativas, con 13 rutas/copies alternativas (78 rutas históricas) conservadas; 4 ZIP + inventario JSON + CSV, y 65 fichas en Notion.
- **41** imágenes de casting candidato y **24** escenarios/referencias separados en Drive, no etiquetados falsamente como FLUX.
- **16** fotografías originales de grupos/personas FLUX 1.1 Pro, conservadas en Drive; dos grupos (C08 y C14) carecen de uno de los hijos requeridos. No borrar, están pendientes de QA.
- **31** actores individuales con `actor_id` exclusivo repartidos en 16 grupos familiares/narrativos, con un nuevo recast desde texto usando FLUX 1.1 Pro: **31/31 fotos WEBP 896×1152 físicamente generadas, decodificadas y con SHA-256 comprobado** (run GitHub `42519089192` SUCCESS). Se guardaron **31/31 en Drive** + 3 mosaicos, manifest de prompts/seeds, status JSON, ZIP; **31/31 fichas propias en Notion**. Estado **CANDIDATO / QA PENDIENTE**, NO «actor definitivo aprobado»; el nuevo recast no conserva automáticamente las caras de las 16 fotos de grupo anteriores.
- **6** pruebas anteriores de FLUX Kontext para las parejas C03/C04/C05, conservadas y catalogadas en Drive/Notion (run `42500886133` SUCCESS), ~0,24 USD estimados.
- **5** pruebas nuevas de FLUX Kontext a partir de las anclas individuales (2 de Lucía, 1 Hugo, 1 Mateo, 1 Marina) físicamente creadas y archivadas **5/5 en Drive y 5/5 en Notion** (run `42522105360` SUCCESS), comparativa existente. Marina ahora tiene una variante en la que **se ve la silla de ruedas**. Parecido facial razonable de las otras variantes, **QA formal de continuidad aún no superado**.
- **32** imágenes originales FLUX de **8 provincias andaluzas × 4 categorías** (plaza, calle residencial, interior de piso y paisaje), creadas (`42501885843` SUCCESS), 32 SHA-256 válidos, **32/32 en Drive**, 32/32 fichas Notion. Son escenas sintéticas inspiradas en territorio, NO fotografías de viviendas en venta o de localización exacta, QA de realismo/territorio pendiente.

### 2.2 Cine/branding ya creado
- Ocho clips **RUNWAY Gen-4.5** de movimiento real: Córdoba, Sevilla, Granada, playa/costa, campo de olivos, calle de pisos Málaga, calle de pisos Sevilla y fénix de luz. **Ocho RAW originales archivados individualmente en Drive** y catalogados; conservar las tomas enteras para reutilización.
- **Máster Andalucía V2**: 44 s vertical 1080×1920 escalado desde material 720×1280, música orquestal original y transición final del fénix al logotipo corregida (sin negro brusco). QR comercial/QA editorial final todavía pendiente.
- **Máster abreviado** ya producido: **~17,9 s**, 1080×1920.
- **OUTRO INSTAGRAM** existente: **~6,9 s**, 1080×1920, logotipo Fénix original, música orquestal. **NO REHACER COMO SI NO EXISTIERA; usarlo primero.**
- **OUTRO FACEBOOK** existente: **~8,4 s**, 1080×1920, distinto ritmo de Instagram, logotipo original. **REUTILIZAR.**
- Hay versiones originales de estas tres abreviadas en 720×1280 y proyecto `render_framecut.py`. Las 1080×1920 son reescaladas, no nativas.
- Las salidas y el máster se han archivado como **LAB/QA pendiente**, no activos publicados automáticamente.
- Logo canónico del manual de marca + música/guiones/proyecto de montaje también están en el almacén audiovisual.

### 2.3 Regla del propietario para casting
- Ninguna persona/rostro se repite entre dos familias diferentes (un integrante de pareja heterosexual NO reaparece en pareja gay, y viceversa; tampoco entre otras historias sin intención narrativa expresa).
- Dentro de UNA historia el personaje es **idéntico** en todos sus planos, con rasgos, edad, peinado base y proporciones constantes; cambio de pose/vestuario/emoción no cambia identidad. Usar `actor_id + source_sha256`, ancla aprobada y verificación visual.
- Diversidad natural de gente española de España, Andalucía, jóvenes/mayores, rubios/morenos/pelirrojos, parejas de distinto y mismo sexo, familias con hijos y monoparentales, compradores solos, etc., sin caricatura ni estereotipos. No inferir orientación sexual ni discapacidad de clientes reales para segmentación publicitaria sensible.
- Los **31** son actores/individuos, no «31 buyer personas». Los **buyer personas** deben catalogarse por *necesidad inmobiliaria*: primera compra, hipoteca 100, autónomos, funcionarios, compra con hijos, herencia/venta de vivienda, inversión, alquiler, reforma, accesibilidad, sénior, cambio de localidad, etc. Se puede reutilizar actores en distintas historias del **mismo personaje**, sin reasignar físicamente su identidad a otras familias.
- Objetivo de fábrica: **10 planos/vistas por cada actor** (310 tomas) y escenas familiares consistentes. **Son objetivo planificado, NO 310 imágenes completadas.** Componer primero pilotos realistas y escalarlos solo si superan QA.

## 3. DONDE ESTÁ CADA RECURSO (ENLACES VERIFICADOS)

**CEREBRO Google Drive almacén audiovisual raíz**  
https://drive.google.com/drive/folders/1Wv8bBkwj-_mXXFd5UA8KBTZ58PtADykH

- Respaldo histórico integral (4 ZIP, 65 únicas, alias, CSV, SHA-256): https://drive.google.com/drive/folders/1K20-szrAmuW090OlAam1QY2SnQtVkV_a
- 41 candidatos ChatGPT NO FLUX: https://drive.google.com/drive/folders/1ghbNTa9o1w8zYRQdP8dctkCyWQHmRW_D
- 24 escenarios y referencias ChatGPT: https://drive.google.com/drive/folders/1e1AXJLtRzNWp-rS7dIdy1pl0q8uouOd8
- **31 retratos individuales FLUX + manifest + hashes + ZIP + 3 mosaicos**: https://drive.google.com/drive/folders/1LPrgpu_6joV7-KMi3HSnmUWQbjsq6W6V
- **5 derivados FLUX Kontext + comparativa + ZIP**: https://drive.google.com/drive/folders/1YjGGwcYTdPEFpDfqG6LwPiDba66ubkFu
- 16 grupos originales FLUX y demás: https://drive.google.com/drive/folders/1EX11J1nSCgL1MzS7ZuY_yq_VpRJZzaaG
- 6 derivados de parejas FLUX Kontext: https://drive.google.com/drive/folders/1hK9G4qN15-UQB8onCgXVJg9WpctIaK2r
- 32 escenarios Andalucía + mosaicos/ZIP: https://drive.google.com/drive/folders/1Ro7-srJL9mqVHxTge3FJ_VSEz3MQLPbF
- 8 planos RAW RUNWAY: https://drive.google.com/drive/folders/1g3iB0lUzqbemDTTKnA9jsIfbk1n8BJCs
- **MASTER 44s V2**: https://drive.google.com/file/d/1DSYypJDBuZO0oF2C-5wH38X-AGD8UZjm/view
- **Abreviada 17,9 s**: https://drive.google.com/file/d/1sN5RMiWIl0lInCeyRU8fxZuQHmMyiAB0/view
- **OUTRO INSTAGRAM 6,9 s (usar en Reels IG)**: https://drive.google.com/file/d/1AOkTY2WX9QiciXg0r0kh2FOL799LrdPf/view
- **OUTRO FACEBOOK 8,4 s (usar en Reels FB)**: https://drive.google.com/file/d/1LPfVkQopyst3zIwkKQLJy4Xjq-TRwfSY/view
- Másters LAB/QA junto con scripts/manifiestos: https://drive.google.com/drive/folders/1eYhTCWiPt4p5v7xVSxRU5T6oBvc48BBP
- Logo canónico: https://drive.google.com/file/d/1rO09g5EuuC81eKyOLLVuO1Ogvi62FSos/view
- Banda sonora/sonido: https://drive.google.com/drive/folders/1w0gmk4Exjwbh4EoEvNyWDUYDfEZkK5Jj
- Código de montaje: https://drive.google.com/drive/folders/1gTRokVnzyC9J_NpFZk9YL4JQDOqZnNwy
- Carpeta «casting aprobados» (se creó VACÍA, solo llenarla tras QA): https://drive.google.com/drive/folders/1T1gVjFDgiTdPqP2M3GAK8SGH30HnidV1
- Carpeta de derivados por actor, preparada: https://drive.google.com/drive/folders/1xjBQqxQ9DucD2EbgyAl_Z5MOjOLnfcL8
- Catálogo Notion activos: https://app.notion.com/p/7b135ed0bf0542eba0f680a9be5bb6fd
- Manual Vivo de CEREBRO: https://app.notion.com/p/b52f0a2ce74d4d9daa41f46e4b332865

## 4. GITHUB, RAMAS Y EVIDENCIAS

Repo: `carlosjmunoz78/fenix-capital-inmo-map`. **NO tocar main, App/CRM/PROD, DNS ni Supabase.**

- Rama actual aislada de casting: `cerebro/ums001-casting-31-premium-flux-lab-20261108`.
- Runbook existente: `cerebro/media-studio/v2/runbooks/UMS001_31_SOLO_ACTORS_RECAST_ARCHIVE_QA_20261108.md` en esa rama.
- Manifest de 31 anclas: `cerebro/media-studio/v2/characters/FLUX_31_SOLO_CANONICAL_ANCHOR_CANDIDATES_20261108.json`.
- Plan de 5 pruebas de continuidad: `cerebro/media-studio/v2/characters/FLUX31_KONTEXT_CONTINUITY_AND_MARINA_FIX_PILOT_20261108.json`.
- Política exclusividad rostros: `cerebro/media-studio/v2/characters/CASTING_NO_DUPLICATE_FACES_RULES_V1_20261108.json`.
- Registro de 31 actor IDs: `cerebro/media-studio/v2/characters/actor-registry-unique-31-lab-v0.json`.
- Plan 310 ángulos (NO ejecutado): `cerebro/media-studio/v2/characters/UMS001_31_UNIQUE_ACTORS_10_VIEWS_EACH_SHOTPLAN_v0.json` (rama precursora `cerebro/ums001-kontext-continuity-premium-lab-v0-20261108`).
- GitHub Actions FLUX31: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42519089192 (**SUCCESS**).
- GitHub Actions FLUX Kontext 5: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42522105360 (**SUCCESS**).
- GitHub Actions 32 escenarios: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42501885843 (**SUCCESS**).
- GitHub Actions 6 Kontext parejas: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42500886133 (**SUCCESS**).
- 8 originales RUNWAY de 3 trabajos: 42483862459, 42486887848, 42487268363.
- Rama base de escenarios: `cerebro/ums001-flux-andalucia-32-scenarios-lab-20261108`.

## 5. COSTE Y PROTECCIONES

- FLUX31 31 × 0,04 USD ≈ **1,24 USD**.
- Kontext5 5 × 0,04 USD ≈ **0,20 USD**.
- FLUX escenarios 32 × 0,04 USD ≈ **1,28 USD**.
- Kontext6 6 × 0,04 USD ≈ **0,24 USD**.
- Estos son **costes estimados de generaciones**, no saldo disponible ni facturas. Para avanzar, conciliar importe real y comprobar límite actual; no hacer reintentos pagados automáticos.
- Token API únicamente como `REPLICATE_API_TOKEN` en GitHub Actions secrets (nunca copiarlo al chat).
- No introducir nuevas suscripciones/servicios, no duplicar compra de recursos existentes, no mover ni sobrescribir originales.
- No publicar automáticamente: QA legal/comercial/identidad de personaje/consentimiento cuando aplique, imagen de marca y claims inmobiliarios. Usar contenido sintético etiquetado internamente. Evitar publicidad con segmentación basada en atributos personales sensibles.

## 6. TRABAJO PENDIENTE, EN ORDEN ESTRICTO

1. **Recuperación y reconciliación** de 31 anclas, 5 Kontext, 16 grupos y otras imágenes: descargar los originales desde Drive/Library, validar que enlaces/índices están íntegros. No pedir materiales que ya existen.
2. **QA de reparto**: revisar rasgos por actor, diferencia entre todas las familias y parejas; coherencia de edad (especialmente C14 adolescentes) y diversidad española/andaluza. 31 IDs ≠ 31 rostros aprobados.
3. **Resolver familias C08/C14**: construir nuevos grupos con los cuatro individuos respectivos sin que cambien las caras. Mantener retratos de grupo anteriores como material histórico LAB no aprobado.
4. **Finalizar corrección Marina**: la variante Kontext ya tiene silla de ruedas visible; confirmar coherencia de rostro, proporciones y dispositivo, y asignarla como DERIVADA, no reemplazar fuente.
5. **Aprobar una ancla por actor** en registro/Notion únicamente cuando QA de identidad global sea verificable. Rechazados/quebrados quedan preservados y fichados, no borrados.
6. **Escalado de vistas 10 por actor**: generar primero pilotos de 3–4 ángulos con referencias; repetir QA; continuar por lotes con tracking de gasto (310 objetivo), nombrado estándar, SHA-256, almacenamiento RAW + derivados, registro en Notion. No lanzar 310 a ciegas ni declarar continuidad perfecta hasta ver vídeos reales.
7. **Primeros Reels físicos Instagram y Facebook**, con narrativa inmobiliaria, protagonista(s) consistente(s), planos de Andalucía desde biblioteca, música/voz/efectos originales, y **usar los OUTROS CORTOS EXISTENTES**: IG 6,9 s y Facebook 8,4 s. Hacer al menos una historia piloto de primera compra y otra de necesidad hipotecaria (o la combinación más rentable según los motores de redes). Exportar MP4 1080×1920 con audio, subtítulos, CTA y cierre nativo de cada red. Comprobar si la duración del outro perjudica la retención; si hace falta, crear una versión DERIVADA más corta, sin destruir originales, y medir variantes A/B.
8. **QA cine/reels**: continuidad del mismo rostro en distintos fotogramas, movimiento real de cámara (NO presentación de diapositivas), anatomía, escenas/provincia verosímil, sonido profesional, ritmo, logo oficial, claims legales y tiempos, duración/red. Ver vídeo completo y corregir hasta aprobado. La estética objetivo es gran cine original premium, NO uso de material/propiedad intelectual de franquicias Marvel/Lucasfilm.
9. **Almacenar TODO**: cada imagen/sonido/plano/guion/reel/editable en Drive + ficha Notion (vincular actor_id, buyer_persona_id, shot_id, run ID, SHA256, rights_status, qa_status, derivative_of, cost_estimate/actual, red) y actualizar CEREBRO Engine Registry/Manual Vivo/runbook/changelog. Reutilización garantizada.
10. **Enviar resultados concretos** con enlaces reproduciendo los primeros dos Reels y reporte de QA. Publicación en perfiles reales **OFF hasta autorización/criterios de publicación**, sin tocar plataformas sociales ni CRM en esta fase.

## 7. CRITERIOS DE ACEPTACIÓN Y EVITAR RECOMENZAR

- Cada historia conserva identidad visual de protagonistas; ningún personaje se recicla accidentalmente en otra familia o historia.
- Mantener cuatro identidades en familias C08 y C14; no inventar imagen grupal como si estuviera aprobada.
- Mantener logo auténtico; cierre **corto IG/FB ya existe** y no hay que recomenzar su producción.
- Mínimo un MP4 Instagram y otro Facebook físicamente verificados, a calidad cinematográfica original, sin explotación de terceros y con CTA medible. Guardar y vincular todos los activos.
- Estados: **HECHO / EXISTENTE / PARCIAL / DEFINIDO / PLANIFICADO / POR AUDITAR / BLOQUEADO**, con evidencias físicas antes de declarar producción.
- Aplicar `CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR`. Never `BORRAR → REHACER`.

## 8. PROMPT

El fichero hermano `02_PROMPT_CONTINUACION_UMS001.md` es el mensaje listo para pegar en un nuevo chat del **mismo Proyecto/grupo CEREBRO OS**. Exige recuperar de Biblioteca/Drive/Notion/GitHub lo necesario de manera autónoma, verificar estados y ejecutar los Reels reales con las salidas ya terminadas. El estado estructurado `03_ESTADO_MAQUINA_UMS001.json` sirve a motores/automatizaciones.
