# SEO Enterprise V2 · Ejecución de trabajo especializado y prácticas L0 · 2026-11-05

**Estado: HECHO en flujo de lectura de corpus; NO AUTONOMÍA EN PROD.**

## Evidencia
La ejecución [42112241987](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42112241987) ha pasado **trabajador + QA + tribunal**. La validación de arquitectura [42112242037](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42112242037) ha pasado **142/142** pruebas SEO más **22/22 + 5/5 + 5/5** complementarias.

El sistema ha ejecutado:
- **141 fichas de trabajo por especialidad**, cada una con competencia, URL real existente, copia de campos almacenados, hipótesis de acción y requisito de evidencia externa cuando aplique.
- **Una cola de 200 URL existentes** priorizada por indicadores técnicos preliminares del contenido **guardado**, sin afirmar problemas del sitio renderizado, clasificación en Google ni valor económico.
- **423 respuestas prácticas ejecutadas por reglas deterministas** (3 por especialización), verificadas por QA y tribunal. No equivalen a 423 exámenes humanos/IA aprobados ni a modelos entrenados.
- **141 pruebas Ed25519 de scope** sin acceso a producción. Los 3 jobs GitHub cuentan con OIDC firmado y verificación en API GitHub; no representan 141 identidades IAM individuales.

Todos los artefactos detallados figuran en el workflow de GitHub Actions de la PR #22 durante los 14 días de retención definidos. El manifiesto `seo-operational-readonly-evidence-v1.json` persiste el estado y las rutas de reconstrucción.

## Decisiones del propietario conservadas

No repetir auditorías. Inventario actual aceptado. STAGING aparcado. Sin cambios a WordPress, App, CRM ni Supabase. Sin nuevas suscripciones. Sin reescritura o borrado de las URL ya válidas. Sin autopublicación. Continuidad de los 32 departamentos y de los 141 roles lógicos, sin crear servidores por especialidad.

## Qué constituye un entregable preparado

Un work product devuelve un artefacto con: role_id, department_id, competencia real, URL existente, SHA256 del copy, metadatos CMS del snapshot, propuesta concreta por disciplina, dato faltante para avanzar, regla de conservación y estado de aprobación. La revisión D31 comprueba **correspondencia exacta al inventario**, no hace afirmaciones de ranking ni certifica la calidad comercial definitiva.

La prioridad relativa de la cola es **técnica preliminar**; no reemplaza una priorización estratégica por rendimiento y negocio.

## Protocolo para completar la autonomía

1. IAM-001: principals reales por tipo de actor o delegación criptográficamente aislada aceptada por política y auditoría; permisos mínimos y rotación.
2. D32: respuestas de agentes reales a los casos; D31: puntuación profesional independiente; tribunal: decisión certificada. Ni respuestas deterministas ni QA de hashes bastan.
3. Gateway de CEREBRO en host persistente aprobado, colas durables, coste y observabilidad sin saturar el core de Supabase.
4. Reutilizar fuentes externas autenticadas solamente donde sean indispensables para la competencia (GSC, GA4, mercados, legal). No repetir auditoría general.
5. Mantener protección PROD; no publicar ni modificar URL, formularios o bloques sin backup, OLD vs NEW, rollback y las autorizaciones correspondientes.

**Gates actuales:** L0 read-only GREEN; IAM individual pendiente; formación profesional pendiente; runtime 24/7 pendiente; PROD autonomía 0/32.
