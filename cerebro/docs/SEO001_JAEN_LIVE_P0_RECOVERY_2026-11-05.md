# SEO-001 · Reparación integral del piloto Jaén · P0

**Fecha 2026-11-05. Estado P0 confirmado: NO CERTIFICADO, NO RESUELTO.**

Se auditaron en vivo, con el conector de WordPress ya contratado, la landing `/asesor-hipotecario-jaen/`, los dos artículos de apoyo y el PDF. El fallo explica por qué el despliegue masivo de ciudades sigue bloqueado.

## Diagnóstico físico

- Landing WordPress **52200**: **publicada y HTTP 200**; canonical correcto. `fenix-core-guard/live-verify-page` devuelve **`ok:false`**, faltan `data-fenix-guard-schema="seo001"` y `"@type":"FAQPage"`. Ya existe schema Service y hay **cinco FAQs visibles** en la propia landing; no inventar preguntas ni respuestas para el esquema.
- Artículos de apoyo WordPress **52247** y **52248**: ambos están en estado `draft`. Las URLs limpias `/documentacion-estudiar-hipoteca-jaen/` y `/cuando-preparar-hipoteca-compra-jaen/` devuelven HTTP **404**. Ambos mantienen metadatos Yoast y enlazan a la landing.
- PDF de checklist Jaén: **HTTP 200**, conservar.
- En `fenix-core-guard/city-growth-rollout-status`: `pilot_certified:false`, `validation_certified:false`, `mass_rollout_allowed:false`. El certificado anterior se invalidó el 6-10-2026.
- Fuente PHP en servidor `fenix-core-guard-city-growth.php`: diagnostica certificado y marcadores; `fenix-core-guard-city-autocert.php` realiza revalidación automática del piloto mediante cron, **sin conceder MASS**, que necesita validación posterior separada de Linares. La certificación no debe forzarse cambiando flags directamente.

## Protección y trabajo preparado

Creados por `fenix-core-guard/capture-post-snapshot` **tres snapshots lógicos verificados**: landing **175**, apoyo **176**, apoyo **177**. Se conservan los textos, formularios y metadatos originales. Estas copias no prueban todavía una restauración física: rollback pendiente.

Módulo puro de reparación `runtime/seo-jaen-certificate-repair-planner-v0.mjs`: dada la versión exacta del HTML de la landing, localiza las preguntas y respuestas reales de `details/summary`, redacta candidato JSON-LD `FAQPage` y añade el marcador requerido para QA. **No escribe WordPress**, no cambia estado de publicaciones ni promueve certificación. Tiene tests negativos para evitar modificaciones con hashes cambiados, marcado ya existente o FAQs inconsistentes.

## Ruta segura de recuperación

1. QA independiente sobre borradores #52247 y #52248 y aprobación del propietario de su publicación. Hasta entonces mantienen estado `draft`.
2. Ensayo de reparación técnica de la landing basado en contenido actual y SHA-256, verificación de JSON-LD y HTML frontend, comparación exacta OLD vs NEW, backup y restauración probada.
3. Promoción controlada bajo permisos WordPress acotados; **no** desbloquear Core Guard globalmente. Volver a verificar HTTP 200, canonicals, los dos artículos, PDF, FAQs y `live-verify-page`.
4. Esperar a que el autocertificador oficial marque la certificación **tras verificación física**, sin establecer flag manual. Validar Linares por separado, y solo entonces considerar nuevas ciudades por grupos.
5. Tras lograrlo, probar formularios, CTAs y descargables con captación verificable, monitorización y rollback; no considerar CITY COMPLETE por tener una landing.

**Prohibido:** borrar URLs válidas, convertir borradores a `publish` sin aprobación, instalar servicios de pago o afirmar certificación antes de evidencia real.

Este cierre es técnico, no editorial ni legal. CEREBRO sigue trabajando todo el SEO, no solamente borradores.


## 05-11-2026 · QA editorial preliminar y mejora real de los dos borradores de apoyo

Se han **mejorado directamente** y leído de nuevo en el WordPress oficial, manteniendo `draft`, slugs y Yoast:

| Artículo | Texto original | Texto actual | Palabras aprox. | H2 | Cambio reversible |
| --- | ---: | ---: | ---: | ---: | --- |
| #52247 · documentación hipotecaria | 1.723 caracteres | 4.480 caracteres | 555 | 7 | #1992 |
| #52248 · cuándo preparar hipoteca | 1.516 caracteres | 4.589 caracteres | 575 | 8 | #1993 |

- **Contenido añadido sin borrar lo anterior:** casos de compradores, privacidad en el envío de documentación, presupuesto completo, arras, plazos y preguntas prácticas. No se introducen garantías de concesión hipotecaria ni cifras financieras sin contrastar.
- **Enlaces internos:** todos los destinos distintos comprobados con HTTP HEAD **200**: `/asesor-hipotecario-jaen/`, `/precio-maximo/`, `/gastos-compra/` y `/antes-de-reservar/`.
- **SEO:** se conservaron títulos, descripciones, keywords y canonicals Yoast de cada borrador. Ningún slug cambió.
- **Seguridad:** los snapshots anteriores #176 y #177 siguen identificados. Las actualizaciones #1992 y #1993 pueden consultarse en el diario; `wp_undo_change(dry_run:true)` devolvió simulaciones válidas. NO se ejecutó deshacer físicamente.
- **No publicados:** URL limpias de ambos posts siguen HTTP **404** y no aparecen en el sitemap de entradas publicado. El estado `draft` fue reconfirmado.
- **PENDIENTE:** revisión visual móvil/autenticada, imagen destacada o alternativa justificada, comprobación editorial/legal independiente, huella SHA-256 de la versión final y aprobación autenticada de cada uno por el propietario. El gate de publicación no está abierto. No se debe declarar CITY COMPLETE ni certificar el piloto por este cambio.

**Enlaces de revisión en WordPress:**
- [Borrador #52247](https://fenixcapital.es/wp-admin/post.php?post=52247&action=edit)
- [Borrador #52248](https://fenixcapital.es/wp-admin/post.php?post=52248&action=edit)

Cuando se autorice publicar versiones exactas, revisar el esquema de la landing #52200 a través del plan de parche controlado, verificar los cuatro recursos y certificar Jaén con el sistema oficial. La validación posterior de Linares es independiente.
