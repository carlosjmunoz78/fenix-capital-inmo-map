# SEO-D13 · Corrección de arquitectura CLOUD ONLY (6-11-2026)

## Decisión del propietario

**Todo CEREBRO OS funciona en la nube.** No hay equipos del propietario encendidos ejecutando modelos locales. Nunca exigir Ollama, GPUs locales, perfiles Windows, PC de oficina o Browser Bridge como requisito para redactar SEO.

Prioridad: motor existente → cloud AI ya conectada y sin coste verificable → modelos gratuitos de nube mediante IAM → pago únicamente con autorización de coste y cupo. No confundir runner GitHub Actions con proveedor de IA.

## Ejecutado físicamente en PR #22 DRAFT

- **HECHO** adaptador `runtime/seo-d13-cloud-only-writer-v0.mjs` registrado; reutiliza `ROUTE-001`, `IAM-001`, `connector:gemini-free-lab`, `credref:cerebro-gemini-api-key` y QA SEO existente.
- **HECHO** separación entre inferencia en `LAB` (scope exacto del conector existente) y candidato en `PREPROD`. No se amplían permisos históricos de Gemini a PROD.
- **HECHO** la ruta cloud está condicionada a presencia de secreto, evidencia de plan gratuito **con facturación desactivada** y salud de credencial IAM. Si falta cualquiera, **HOLD sin solicitud de red**.
- **HECHO** el prototipo Ollama anterior quedó **hard-disabled** y su workflow de GitHub se marca `skipped` para conservar historial sin uso accidental.
- **HECHO** tests de navegación de ruta y mock de respuesta cloud con contenido de prueba, semántica buyer persona, mínimo 6 FAQ, rechazo de fuentes inventadas, no escritura WP, no gasto. GitHub run [42210987720](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42210987720) **5/5 PASS**. El workflow Ollama del mismo HEAD **skipped**.
- **NO HECHO** ninguna inferencia real con Gemini. El test de generación utiliza una respuesta simulada, no evidencia de un modelo operativo. Ninguna credencial se mostró ni inspeccionó. No hay registro de presupuesto gratuito verificado para esta clave.
- **NO HECHO** una publicación WordPress, una imagen final UMS o una conexión de jobs continua a la API. La cola PREPROD de dos artículos V3 se mantiene.

## Elegibilidad cloud y costes

Conector IAM ya presente `connector:gemini-free-lab`, registrado únicamente para `LAB`, con credencial simbólica `CEREBRO_GEMINI_API_KEY` y estado previo `EXISTING_SYNTHETIC_LAB_ONLY`. La existencia del nombre del secreto **no demuestra** que esté cargado, que la clave sea del nivel gratuito, que la facturación esté desactivada ni que el proveedor esté accesible desde GitHub.

Proveedor alternativo conocido `Cloudflare Workers AI`: la documentación oficial de 2026 indica un nivel gratuito de 10.000 neuronas/día y algunos modelos solo de pago. Usarlo requeriría verificar la cuenta, la modalidad **Workers Free** y un conector IAM, sin activar overage. No registrar un Cloudflare Worker como conectado sin evidencia. DeepSeek cloud existe en repositorio, pero su ruta puede incurrir en consumo y no está autorizada por defecto para SEO.

Cuentas de modelos gratuitos pueden usar contenido para mejoras del proveedor; SEO-D13 usa **solo fuentes públicas, sin PII ni expedientes hipotecarios**. La política impide enviar datos sensibles al proveedor gratuito.

## Siguiente gate real

Verificar la clave `CEREBRO_GEMINI_API_KEY` desde un entorno seguro sin imprimirla, certificar **cuota Free / billing OFF** en el proveedor, registrar IAM lifecycle real, probar una única generación de borrador con fuentes públicas y luego conectar su resultado a JOB-001 y a UMS-001. La publicación continuará HOLD hasta los gates habituales de Core Guard y rollback.

**Estado integral SEO-D13:** `CLOUD_ADAPTER_TESTED_NO_REAL_CLOUD_INFERENCE` y **autonomía continua NO acreditada**.

Regla permanente aplicable a toda empresa: `company_id`, `engine_id`, `environment`, `version`; no depender de PCs locales para ejecución.
