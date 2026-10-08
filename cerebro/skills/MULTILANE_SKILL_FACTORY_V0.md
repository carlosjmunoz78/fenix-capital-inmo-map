# CEREBRO Skill Multilane Factory V0

## Estado

**ACTIVO EN LAB una vez promovido a `main`.** Este bloque envuelve la fábrica existente; no sustituye Skill AutoLoop, sus gates ni su estado canónico.

## Objetivo

Evitar que una skill pesada bloquee la evolución de las demás. CEREBRO estudia varias candidatas en paralelo, mantiene una vía rápida para trabajos pequeños y aparta `HUMAN_REQUIRED` sin detener trabajo seguro no relacionado.

## Las 6 líneas

1. **CEREBRO e Ingeniería** — código, arquitectura, debugging, observabilidad, calidad y comunicación humano↔CEREBRO.
2. **Control de PC, móvil y tablet** — Browser/Computer Use, Windows, Android, iOS/tablet y automatización de interfaces.
3. **SEO, Research y Crecimiento** — SEO, keywords, competencia, research, contenido, social y growth.
4. **Imagen, vídeo, voz y creación digital** — generación/edición visual, vídeo, audio, voz, render y formatos.
5. **Web, CRM, App y creación de empresa** — web, WordPress, CRM, App, Supabase/datos y bootstrap empresarial.
6. **Vía rápida (`FAST_LANE`)** — transversal. Puede estudiar hasta 3 candidatas `EXPRESS` por ciclo si son de coste 0, bajo riesgo de permisos, portables y sin efectos externos.

## Clases de trabajo

- `EXPRESS`: pequeña, portable y de bajo riesgo. Puede entrar en `FAST_LANE`.
- `STANDARD`: integración o evaluación moderada.
- `DEEP`: dispositivos, empresa/CRM/App o capacidades con mayor carga/dependencias. Puede tardar sin bloquear las demás.

## Flujo

`DISCOVERY existente → clasificación por línea → estudio LAB paralelo → wrapper deshabilitado → OLD vs NEW sintético → rollback/rebuild → evidencia → circuito canónico existente`

La capa multilínea **no promociona por sí sola a producción**. El AutoLoop canónico conserva PREPROD, tribunal, observabilidad, rollback, políticas y autorizaciones.

## HUMAN_REQUIRED

Una candidata que necesita humano sale del camino ejecutable y queda visible con uno de los 8 motivos canónicos. Las otras líneas siguen trabajando. Ningún `HUMAN_REQUIRED` global congela la fábrica.

## Invariantes V0

- `prod_authorized=false`
- `prod_write=false`
- `customer_data=false`
- `external_skill_code_execution=false`
- `trading=false`
- `paid_fallback=false`
- `additional_cost_eur=0`
- estado multilínea separado del estado canónico de AutoLoop
- sin despliegue de App

## Scheduler

GitHub Actions actúa como adaptador de runtime de coste adicional 0 €. El trabajo pertenece a CEREBRO, no a una alarma de ChatGPT. El ciclo está escalonado cada hora; dentro de cada ciclo las líneas seleccionadas se ejecutan como matrix jobs independientes.

## Anti-bloqueo

- Una `DEEP` no impide ejecutar `EXPRESS` o `STANDARD`.
- La `FAST_LANE` puede cerrar varias candidatas mientras otra línea tarda más.
- `fail-fast=false` evita que el fallo de una candidata cancele las demás.
- El estado de estudios ya terminados evita repetir indefinidamente la misma candidata.
- La cola canónica y sus gates se mantienen intactos.

## Rollback

Eliminar/deshabilitar el workflow multilínea devuelve el sistema al AutoLoop anterior sin tocar su estado. El estado propio vive en `cerebro/skill-multilane-study-state-v0` y puede reconstruirse a partir de las evidencias de Actions; no es fuente de autorización de producción.
