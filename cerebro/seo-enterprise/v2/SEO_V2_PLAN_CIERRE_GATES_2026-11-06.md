# SEO Enterprise V2 — Plan de cierre por gates (2026-11-06)

Estado: DEFINIDO, NO CERTIFICACIÓN. Fuente única: inventario congelado 2026-11-05 y evidencias existentes en esta PR. No auditar web, no usar STAGING ni cambiar PROD.

## Orden de ejecución sin duplicación
1. **IAM-001 (P0):** inventariar el router y roles existentes; exigir identidad autenticada por actor o delegación acreditada con scopes mínimos, separación autor/QA/juez, revocación, auditoría y pruebas negativas. Las 141 firmas efímeras actuales no son 141 principals IAM. Sin gate no promocionar.
2. **D32 (P0):** ejecutar respuestas nuevas de agentes reales sobre casos de especialidad del corpus aceptado; conservar entradas, salidas, modelo/runtime, coste y huellas. Las 423 respuestas deterministas son baseline, no exámenes.
3. **D31 + tribunal (P0):** evaluar calidad profesional independientemente, sin autoevaluación; rúbricas SEO, YMYL hipotecario, evidencia, citas, no invención, calidad editorial; registrar errores y reexamen. Ningún mérito o permiso automático.
4. **Gateway/JOB-001 (P1):** probar enlace durable e idempotente en entorno aislado, recibos, observabilidad, presupuesto 0, kill switch, backup de journal, recuperación y rollback; no fabricar 32 servidores.
5. **Certificación gradual (P1):** por cada departamento: binding real, identidad, tarea auténtica, QA independiente, tribunal, formación, observabilidad y rollback probados. Marcar LISTO únicamente con recibos verificables. Hasta entonces 0/32 PROD certificados.

## Protocolo de ejecución
- Comparar HEAD de PR #22 y evidencia antes de cada bloque; saltar lo ya acreditado.
- Cada cambio debe ser aditivo en rama DRAFT, con snapshot SHA anterior, test afectado, prueba negativa y rollback documentado.
- No fusionar, publicar, desplegar, conceder permisos, crear suscripciones ni consumir IA de pago.
- Si falta un acceso humano, registrar HUMAN_REQUIRED exacto y continuar otras tareas independientes.
- Informar únicamente de P0, regresión, decisión humana genuina o cierre material. No afirmar 32/32 por tests sintéticos.

## Criterio de salida
Un departamento certificado requiere identidad, ejercicio profesional no determinista, D31 independiente, tribunal, enlace Gateway persistente, monitorización y rollback demostrados. El cumplimiento de un contrato o test de hash no acredita autonomía.

## Estado inicial preservado
8 familias, 32 departamentos, 141 especializaciones, 200 URL (166 páginas + 34 artículos), 629 imágenes, 423 prácticas L0 deterministas. Pipeline L0 GREEN, 0 identidades IAM individuales acreditadas y 0/32 departamentos autónomos PROD certificados, salvo evidencia posterior comprobada.

## Actualización ejecutiva 17/11/2026 · Fénix CEREBRO Leads + 32 departamentos · SIN REHACER

### Decisión arquitectónica
- **Conservar** `fenix-cerebro-leads` y los adaptadores oficiales existentes, incluido formulario propio B2B: son la capa de captación WordPress; no introducir Fluent Forms, un segundo plugin de captación, Make, WPVibe ni otro CRM.
- **Envolver** el formulario existente por contrato de `form_id / landing_id / buyer_persona / purpose / consent_evidence / source / idempotency_key` y usar la canalización actual hacia CEREBRO/CRM. Brevo Free continúa como transporte de newsletter, no fuente maestra de consentimiento.
- **No mezclar B2C y B2B**: atribución, formularios, listas, doble opt-in, SLAs, recursos y KPI diferentes; preservar URLs públicas válidas. No forzar registro para leer calculadoras ni descargar información legal obligatoria.
- **Política**: preestudio/contacto y newsletter deben tener finalidades y bases jurídicas separadas; comprobar información de privacidad, no atribuir consentimiento promocional por defecto, conservar bajas y oposiciones.

### Diferencial del plugin en producción (lectura autenticada, sin cambios)
- Activo: `fenix-cerebro-leads` 1.3.6-preprod, `fenix-core-guard` 1.0.5 y adaptador B2B SEO001 0.2.0. Existe riesgo de normalización de privacidad y de doble ruta de captación; el detalle técnico del hallazgo y las rutas de prueba quedan **en documentación privada**, no en este repo público.
- El release guard existente `runtime/seo-lead-privacy-release-guard-v1.mjs` ya define 11 pruebas P0 y solo puede devolver `READY_FOR_PRIVATE_REVIEW`, nunca conceder producción. **Reutilizarlo**: no construir un guard alternativo.
- QA documental añadida: tres evidencias críticas inicialmente NO acreditadas `wordpress_privacy_value_e2e`, `elementor_real_privacy_value_e2e`, `idempotency_and_rate_limit_old_new`. Ningún test sintético las cambia automáticamente a `true`.

### Orden de desbloqueo por dependencias (bloques independientes)

1. **P0 recuperación privada primero para escrituras WordPress:** validar TAR.GZ Hostinger 18.362.138.624 bytes y SQL.GZ ya existentes en Drive mediante acceso privado streaming, sin re-subidas ni publicar copias. Clon temporal aislado y sin tráfico externo, restore funcional, checksum, snapshot de tablas, prueba de rollback y comparación de páginas/medios/configuración. Si el conector RAW sigue limitado a 256 MiB, usar mecanismo privado existente con transferencia por chunks/rango **solo si el proveedor lo admite realmente**, sin inventar capacidad ni coste.
2. **P0 captación:** probar matriz de inputs consentimiento/no consentimiento con datos sintéticos solo en clon, cliente sin checkbox, Elementor server-side y browser submit, formulario genérico versus whitelist, rate limiting, honeypot, claves idempotentes compartidas entre canales, reintentos, baja, casos B2C/B2B, identidad de formulario, atribución, fallo de backend. Cada test produce evidencia y fallback; monitorizar conteo real de recibos aceptados sin PII.
3. **P0 corrección de código canónica:** aplicar el parche privado mínimo sobre plugin ACTUAL, nunca sustitución masiva; compatibilidad de shortcode y plantillas, tests PHP/JS, regresión de campos, comparativa OLD vs NEW, canary con rollback probado, Core Guard y autoridad verificable. **No parchear producción mientras el gate #1 siga abierto**.
4. **P0 CRM y SLA:** demostrar `form_submit → accepted_event → contact_dedup → assignment → next_action`; jamás asumir que HTTP 200 implica CRM escrito. Conciliar sin duplicar tareas, no registrar PII ni falsas conversiones. Separar KPIs leads B2C y partners B2B, oportunidades, expedientes, firmas e ingresos.
5. **Newsletters A/B independientes:** inventariar Brevo real, listas B2C/B2B y remitentes, SPF/DKIM/DMARC, consentimiento/DOI, plantillas, suppression/baja, prueba autorizada a buzón TEST, costes y cuotas; activar A o B por separado sólo cuando su gate esté todo GREEN. No enviar mensajes reales con consentimientos dudosos.
6. **Lectura y fuentes:** aprovechar el registro profesional SEO001 0.1.0 y el lector RSS en GitHub LAB; el run `44050174375` dejó un **BASELINE_ONLY** y 3/3 pruebas. Siguiente: segunda captura con baseline inmutable y D31 específico, D32 experimento real con examen no visto y tribunal. Integrar si hay scopes verificados, observabilidad, job idempotente y kill switch; sin crear otra automatización a las 08:00.
7. **Mejora WordPress SEO por lotes:** únicamente tras #1/#2/#3, priorizar consentimiento, UX, velocidad, indexación, CRO y formularios existentes; después ampliar Córdoba → pueblos → Jaén → Sevilla con demanda y capacidad demostradas; sin borrar, redirigir ni canibalizar URLs válidas.
8. **Certificación 32 departamentos en runtime compartido:** empezar con D07/D09/D24/D29/D31/D32 y ampliar por familias, sin 32 servidores. Cada alcance es una capacidad revocable, no una etiqueta general de autonomía.

### Oleadas de certificación por departamentos (sin calendario ficticio)
- Ola piloto transversal: **D07 D09 D24 D29 D31 D32** (lectura/competencia/técnico/CRO/medición/auditoría/aprendizaje; escritura sigue HOLD).
- Ola 1 estrategia: **D01 D02 D03 D04**.
- Ola 2 descubrimiento y semántica: **D05 D06 D08** (D07 ya en piloto).
- Ola 3 infraestructura web: **D10 D11 D12** (D09 ya en piloto).
- Ola 4 editorial: **D13 D14 D15 D16**.
- Ola 5 SEO local: **D17 D18 D19 D20**.
- Ola 6 experiencia y tecnología: **D21 D22 D23** (D24 ya en piloto).
- Ola 7 IA y multimedia: **D25 D26 D27 D28**. D27 ecommerce queda certificable en alcance de conocimiento/dormant: no fabricar una tienda de Fénix para dar un falso verde.
- Ola 8 medición comercial: **D30** (D29/D31/D32 en piloto).

### Certificado profesional POR DEPARTAMENTO, no por número de agentes
Contrato + competencia real + identidad IAM/delegación revocable + permisos mínimos + job duradero + evidencia de trabajo auténtico + prueba inédita + D31 independiente (cuando D31 sea autor, QA independiente distinta) + tribunal + D32 feedback + OLD vs NEW + coste medido + alerta/supervisor + backup/rollback probado + política de datos + prueba física del alcance autorizado. Cualquier pieza ausente = `PARCIAL/HOLD`. Certificar `READ_ONLY`, `DRAFT`, `CAMPAIGN_TEST` y `PROD_WRITE` **por separado**. No atribuir autonomía a las 141 plantillas, 191 roles o 573 ejercicios sintéticos.

### Estado de esta actualización
- `HECHO`: decisión de conservar plugin existente; auditoría diferencial read-only del adaptador; gates y secuencia ampliados; controles de LAB agregados a la prueba de release.
- `EXISTENTE`: 32 knowledge packs, guard de privacidad, JOB-001/FACT-001 y pipelines LAB, automatización SEO diaria 08:00.
- `PARCIAL`: captura real frontend/CRM, D31/D32, fuentes y competencia.
- `BLOQUEADO`: escritura/corrección WordPress PROD por restore íntegro y pruebas físicas; newsletter A/B por cuenta Brevo/DOI y consentimiento no certificado; 32/32 autónomos.
- `POR AUDITAR`: integridad TAR completa, consumo/retención de Actions, CRM real, scopes actuales, empresas y proveedores. Coste nuevo contratado 0 €, no afirmar consumo incremental exacto sin facturación.

**Rollback:** revertir solo commits aditivos de esta PR DRAFT, sin tocar main ni WordPress; cuando se promocione un módulo, exigir snapshot/artefacto exacto, desactivación segura y recuperación probada. `next_block`: ejecutar análisis privado del plugin REAL y E2E aislado en cuanto el clon restaurado esté acreditado, mientras siguen las pruebas read-only D07/D09/D31/D32.
