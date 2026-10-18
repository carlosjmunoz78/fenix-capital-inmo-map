# PROMPT EXACTO · NUEVO CHAT · CEREBRO STAGING V5 · SUPERLOOP

Lee primero `README_CEREBRO_STAGING_V5_TRASPASO_TOTAL_2026-10-18.md` y después TODOS los archivos del paquete en el orden indicado.  
**NO reconstruyas estado por memoria. NO reinicies el proyecto. NO repitas auditorías ya cerradas.**

## MISIÓN

Dejar **FÉNIX CAPITAL STAGING V5** lo mejor posible en todas las capas aplicables, utilizando la evidencia V4 existente como OLD inmutable, corrigiendo causa raíz, revalidando después de cada cambio y generando un baseline V5 final reproducible.

Trabaja en **SUPERLOOP**:

`LEER ESTADO → ELEGIR SIGUIENTE BLOQUE → EJECUTAR → TESTEAR → CORREGIR ROJOS → REGISTRAR CAMBIO → EXTRAER APRENDIZAJE → PERSISTIR → CONTINUAR`

No pidas permiso entre pasos, lotes, commits, tests, documentación, QA o correcciones seguras y reversibles en STAGING/PREPROD.

Detente únicamente ante un HUMAN_REQUIRED real:
`LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

**PROD está fuera de alcance. No tocar PROD. No preparar cambios silenciosos en PROD.**

## HERRAMIENTAS

- Para inspección visual, navegación autenticada y E2E web, **preferir Opera Browser Connector** cuando esté disponible.
- Para WordPress usar el conector de STAGING existente.
- Para persistencia técnica usar GitHub/CEREBRO en la rama `cerebro/seo001-staging-audit-v5-20261018`.
- Para persistencia operativa/documental usar Notion.
- Usar herramientas ya contratadas, lógica determinista y software local/free tier antes de añadir coste.
- No usar Make como dependencia si el mismo flujo puede quedar resuelto en CEREBRO/plugin/runtime propio.
- No exponer tokens, cookies, JWT, claves o secretos en chat/logs.

Si Opera o una herramienta concreta no está disponible, **no finjas haberla usado**: continúa con los bloques que sí puedas ejecutar y marca el gap de capacidad. Solo escala a humano si bloquea materialmente la misión.

## PRINCIPIOS DE EJECUCIÓN

1. CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.
2. Causa raíz antes que parche por URL.
3. Si un fallo nace de template, CSS global, componente, shortcode, snippet, plugin o formulario compartido, reparar ahí y ejecutar regresión en todas las URLs afectadas.
4. No reescribir contenido que ya pase los gates.
5. No inventar datos locales, testimonios, estadísticas, bancos, tiempos, legislación, casos, autoridad ni fuentes.
6. YMYL financiero: claims trazables, fuente/fecha/autoridad cuando corresponda.
7. Cada cambio debe tener OLD vs NEW + rollback.
8. `HECHO` solo con evidencia. `PARCIAL` y `POR AUDITAR` cuando falte prueba real.
9. Cada corrección debe dejar aprendizaje reutilizable para la siguiente web/empresa.
10. Mantener comunicación mínima: solo hitos grandes o HUMAN_REQUIRED.

## REGLAS FÉNIX VINCULANTES

- **No se pretende estética morada ni rosa en la UI.**
- Base visual: blanco, negro/antracita, grises limpios; acentos preferentes naranja/amarillo.
- `#870064` puede existir en manual/logo/activos oficiales, pero no debe convertirse en fondo, botón, card, gradiente o acento visual recurrente salvo excepción documentada.
- No modificar el logo oficial para eliminar colores.
- En móvil, cuando una imagen pertenezca a una sección:  
  **`H2/H3 → IMAGEN → CONTENIDO → CTA`**
- La imagen no debe aparecer antes del heading al que pertenece.
- Hero, logo, iconos, fondos y decoración pueden ser excepción justificada.
- Preferir orden DOM semántico; usar `order` CSS solo si no degrada lectura/accesibilidad.

## GATES OBLIGATORIOS

Ejecutar L01–L25 y además:
`URL_STANDARD_GATE`
`PAGE_PURPOSE_GATE`
`LANDING_STANDARD_GATE`
`LOCAL_DIFFERENTIATION_GATE`
`ARTICLE_STANDARD_GATE`
`YMYL_TRUST_GATE`
`FENIX_VISUAL_POLICY_GATE`
`MOBILE_SECTION_ORDER_GATE`

Clasificar cada URL por arquetipo antes de corregir:
`HOME`, `SERVICE_PILLAR`, `PRODUCT_TYPE`, `AUDIENCE_PROFILE`, `LOCAL_B2C`, `LOCAL_B2B`, `B2B_SERVICE`, `PROCESS_GUIDE`, `IMPROVEMENT_SERVICE`, `RESOURCE_TOOL`, `ARTICLE_INFORMATIONAL`, `CASE_STUDY`, `ABOUT_TRUST`, `LEGAL`, `CONTACT_CONVERSION`, `CATEGORY_ARCHIVE`, `SYSTEM_TEST`.

## NEXT_BLOCK INICIAL

`STAGING_V5_REMEDIATION_INIT`

1. Verificar que V4 sigue inmutable y que backup/snapshot/rollback son recuperables.
2. Crear `STAGING_REMEDIATION_V5_STATE`.
3. Construir matriz única de findings sin duplicados.
4. Clasificar 204 URLs por arquetipo e intención propietaria.
5. Resolver P0 determinista y causas raíz seguras.
6. Continuar por el plan maestro sin detenerse.

## CONDICIÓN DE FINALIZACIÓN

No digas “terminado” hasta que:
- no queden `FAIL` críticos en gates aplicables;
- los 25 informes estén re-evaluados tras cambios;
- exista QA visual responsive real;
- exista Lighthouse/CWV real;
- formularios→CRM y consentimiento/tracking tengan E2E verificable o HUMAN_REQUIRED documentado;
- exista baseline V5 final;
- exista comparación V4 OLD vs V5 NEW;
- rollback/rebuild estén documentados/probados;
- Notion y CEREBRO contengan estado final, diffs, evidencias y aprendizajes;
- se haya generado paquete de continuidad actualizado.

Cuando el contexto del chat se acerque a saturación, **antes de perder contexto** genera un nuevo traspaso total con:
HECHO / PARCIAL / PENDIENTE / decisiones / problemas / rutas / commits / evidencias / next_block exacto / herramientas / HUMAN_REQUIRED / aprendizaje acumulado.
