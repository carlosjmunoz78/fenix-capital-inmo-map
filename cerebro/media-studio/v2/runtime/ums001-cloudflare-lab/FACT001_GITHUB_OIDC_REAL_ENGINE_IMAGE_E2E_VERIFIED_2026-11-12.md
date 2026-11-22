# CEREBRO OS · FACT-001 / UMS-001 · Autoconexión universal real · LAB · 12-11-2026

## EVIDENCIA DE EJECUCIÓN REAL
- Repo FACT: `carlosjmunoz78/capital-mapa-pro`, rama `cerebro-engine-factory-v0`, workflow `cerebro-fact-ums001-oidc-lab.yml`.
- Motor generado con el CLI REAL de FACT-001: `FACT-OIDC-CANARY-20261112`; sus manifiestos se subieron al repo y dispararon GitHub Actions automáticamente.
- Identidad OIDC sin secretos permanentes GitHub: GitHub issuer, JWT RS256/JWKS, audience `cerebro-fact001-ums001-lab`, repo ID `1139292249`, ruta del workflow, branch y SHA verificados. Replay protegido con Durable Objects SQLite.
- GitHub run exitosa **enroll**: https://github.com/carlosjmunoz78/capital-mapa-pro/actions/runs/43255172953; el intento final (tras rectificación de compatibilidad HTTP) mostró `FACT-OIDC-CANARY-20261112 state=ACTIVE signed_probe=REGISTERED_QA_PENDING`.
- Cloudflare Vault: `ACTIVE`, private key cifrada, version `0.1.0`, ID de clave `UMS001-LAB-FACT-OIDC-CANARY-20261112-F822A766913C31`.
- GitHub run exitosa **solicitud explícita de imagen**: https://github.com/carlosjmunoz78/capital-mapa-pro/actions/runs/43256289803. Con autenticación OIDC real, solicitó `UMS001-LAB-GITHUB-OIDC-IMAGE-20261112-01` y recibió `ACCEPTED`.
- Productora universal privada: `PRIVATE_READY`, JPEG 1024×1024, **692999 bytes**, SHA256 `9b84d21fe306c2dcecf414badb3799715a29c4492562188a12bc5d9e7e7cb589`.
- FACT-001 retorno compartido: `PRIVATE_ASSET_RECEIVED` y SHA256 idéntico. `technical_qa=PASS`, publicación falsa, `visual_qa=PENDING`, `brand_qa=PENDING`.

## DESPLIEGUE REAL
- Bridge público estrictamente autenticado: `cerebro-fact001-github-oidc-enroll-lab-eu`, solo POST `/v1/factory/engine-created` y POST `/v1/factory/image-request`; si falta token válido OIDC, 403. `OIDC_BRIDGE_ENABLED=true`.
- Protege Cloudflare Service Binding al provisionador mediante `FACT_BRIDGE_TOKEN` y `GITHUB_OIDC_BRIDGE_SECRET` en Worker Secrets. Ningún valor en GitHub.
- El provisionador `cerebro-fact001-ums001-issuer-provisioner-lab-eu` tiene dos métodos privados adicionales: `enrollTrustedGithubEvent` y `requestImageFromTrustedGithub` (acceso solo por token compartido, empresa/entorno/capacidad limitados). No rutas públicas.
- Gateway firmado existente `cerebro-ums001-universal-gateway-lab-eu` verifica Ed25519 y sólo después emite despacho HMAC privado. No ruta pública.
- Ejecutor `cerebro-ums001-registered-image-executor-lab-eu` consume cola UE compartida y entrega al receptor FACT UE compartido; no conexión particular por motor.
- El workflow de FACT que se dispara por cambios en `cerebro-os/engines/**/manifest.json` ahora solo inscribe motores. La llamada de imagen de prueba fue de una ejecución, retirada de la ruta automática normal para no generar materiales ni gastos no solicitados.

## Seguridad
- Cloudflare `workers.dev` aplica Browser Integrity Check. Python urllib default UA fue bloqueado (HTTP 403 text/plain); corregido el User-Agent en GitHub runner, sin desactivar reglas.
- Error de runtime `redirect:'error'` no soportado; rectificado a `redirect:'manual'` con fail-closed en 3xx.
- Un evento FACT sin firma fue rechazado (sin alta). Un dispatch sin HMAC fue rechazado (sin llamada IA).
- Los Workers y Gateway originales, Instagram AUTOQUAL, WordPress, DNS, App, CRM, Trading, PROD y `main` permanecen intactos.

## Pendiente / Limitaciones
- **Demostrado** para motores recién creados bajo FACT GitHub branch y tenant `fenix/LAB`; no se ha activado para todas las ramas, ni todas las empresas, ni motores existentes en otros runtimes.
- Los motores deben emitir sus solicitudes a la interfaz común; la integración de todos los emisores históricos aún no está verificada.
- No hay QA visual/brand ni garantía de coste facturado (billing no legible). Se conservan políticas de cero publicación y límite de modelo.
- No se debe promover a PROD ni fusionar `main` sin política, métricas, test OLD vs NEW, rollback y revisión.

## Rollback
1. Desactivar `OIDC_BRIDGE_ENABLED` en `cerebro-fact001-github-oidc-enroll-lab-eu`; deshabilitar su workers.dev si hay incidencia.
2. Desactivar `FACT_PROVISION_ENABLED` en provisionador únicamente si el problema requiere cortar altas y devoluciones.
3. Desactivar `REGISTERED_IMAGE_ENABLED` en Gateway y `ENABLED` en ejecutor para detener generación.
4. Conservar auditorías, claves cifradas, snapshots y colas para diagnóstico; no borrar ni alterar la parte original.
