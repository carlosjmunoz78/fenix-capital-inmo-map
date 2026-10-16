# Technology/Capability Scout Native V1 — PREPROD Runbook

## Estado y alcance

Capability `TECH-CAP-SCOUT-NATIVE`, owner `RSH-001`, entorno autorizado V1 `PREPROD`. No crea un motor nuevo: envuelve y gobierna el camino de investigación ya existente. `PROD`, Trading y Android quedan fuera de alcance. Coste adicional objetivo: `0 €`.

## Existente preservado

Se reutilizan sin sustituir:

- `cerebro/runtime/web-acquisition-intelligence-profile-v1.mjs`: planificación de adquisición pública y scoring tecnológico determinista.
- `cerebro/runtime/public-source-adapter-v0.mjs`: adquisición pública GET-only, HTTPS, SSRF hardening, límites de red y fingerprint semántico.
- `cerebro/runtime/continuous-improvement-contract.mjs`: contexto canónico e idempotencia estable.
- `cerebro/runtime/evaluation-tribunal.mjs`: OLD vs NEW y Tribunal independiente.
- `EVT-001`: contrato de eventos para integración posterior; el Scout no eleva permisos del bus.
- `ROUTE-001`: evidencia de recursos 0 €, sin convertir evidencia histórica en disponibilidad actual.

Regla aplicada: CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.

## Contrato multiempresa

Todo acceso exige `company_id`, `engine_id`, `environment`, `version`. En V1, `engine_id` debe ser `RSH-001` y `environment` debe ser exactamente `PREPROD`. Toda operación exige autorización previa del Gateway (`gateway_authorized=true`). Material de otra empresa se rechaza en evidencia, candidatos y dossiers.

## Operaciones

- `PLAN_ACQUISITION`: reutiliza el router existente de adquisición pública y su cadena 0 €.
- `ACQUIRE_PUBLIC_EVIDENCE`: reutiliza el adaptador público real existente; GET-only, HTTPS, sin credenciales ni cookies y sin escritura en proveedor.
- `INGEST_EVIDENCE`: normaliza metadatos públicos, preserva procedencia y genera `evidence_id` determinista.
- `SCORE_CANDIDATE`: reutiliza el scoring existente; cualquier coste positivo pasa por `MONEY_LIMIT`.
- `BUILD_DOSSIER`: compone un dossier determinista de referencias y puntuaciones sin escribir conocimiento canónico.
- `REPLAY_VERIFY`: recalcula la identidad del dossier y detecta deriva.

## Seguridad y política de fuentes

Solo evidencia pública. Se rechazan credenciales embebidas en URL, parámetros de consulta con apariencia de secreto y material secreto reconocible. No se permite bypass de CAPTCHA, autenticación, MFA ni mecanismos anti-abuso. No hay ejecución automática de código externo. La política de robots, términos y legal del perfil RSH existente sigue siendo vinculante.

La evidencia fuente permanece separada de cualquier interpretación. El Scout no escribe por sí mismo en el conocimiento canónico y la IA no es requisito del baseline; se priorizan reglas deterministas, fuentes oficiales, software local/OSS y recursos existentes.

## Coste

No se introduce suscripción, broker ni proveedor de pago. El scoring y el routing son 0 € first. Un candidato o una ruta con coste positivo no se autoriza silenciosamente: devuelve `HUMAN_REQUIRED/MONEY_LIMIT` conforme al vocabulario canónico.

## Eventos

El wrapper produce descriptores compatibles con EVT-001:

- `research.scout.acquisition.planned`
- `research.scout.public_evidence.acquired`
- `research.scout.evidence.accepted`
- `research.scout.candidate.scored`
- `research.scout.dossier.ready`

La publicación efectiva queda bajo la autoridad separada de EVT-001; el Scout no expande esa autoridad.

## Observabilidad e idempotencia

Cada autorización emite un recibo determinista. Evidencias y dossiers tienen identificadores derivados del contexto y contenido normalizado. `REPLAY_VERIFY` permite reconstruir y comparar el dossier. Se registran siempre coste 0 €, autoridad PROD falsa y procedencia de fuentes.

## Backup, rollback y rebuild

- Backup: exportar/versionar metadatos de evidencia y dossiers; no depender de Supabase para cuerpos de investigación pesados.
- Rollback: retirar `technology-capability-scout-native-v1.mjs` y su registro; el perfil RSH, el adaptador público y los motores existentes quedan intactos.
- Rebuild: reinstalar el wrapper desde Git, reingerir metadatos públicos versionados, recalcular IDs/dossiers y ejecutar tests/Tribunal.

## Evaluación y Tribunal

La suite V1 incluye benchmark OLD vs NEW de cobertura de gates, holdout no visible al candidato, casos adversariales de PROD, secretos y multiempresa, y juez independiente `QA-001`. Un PASS no concede autoridad PROD: únicamente habilita cierre `NATIVE_FULL_PREPROD` cuando CI y los gates de integración también estén GREEN.

## Dependencias y límites

Dependencias first-party: RSH-001, WEB-001, ROUTE-001, SCAN-001, INN-001, SEC-001, QA-001, OBSERV-001, FINOPS-001 y EVT-001. No se modifica App Fénix, CRM, Supabase, WordPress, Notion, SEO, Training, automatizaciones, Trading ni Android.

## Promoción

Para marcar `NATIVE_FULL_PREPROD` deben existir los 14 gates del registro, CI targeted GREEN, E2E GREEN, OLD vs NEW/Tribunal PASS, evidencia PREPROD versionada, rollback/rebuild documentados y los checks globales de PR GREEN. La promoción a PROD no forma parte de V1.

## Changelog

- `1.0.0`: wrapper nativo gobernado sobre la infraestructura RSH/public-source existente; añade gateway, multiempresa, dossier determinista, replay, contratos, eventos, evaluación y cierre PREPROD sin coste adicional.
