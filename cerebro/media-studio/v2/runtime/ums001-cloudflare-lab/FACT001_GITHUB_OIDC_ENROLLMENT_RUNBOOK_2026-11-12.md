# FACT-001 GitHub OIDC -> UMS-001 · Entrada sin secretos persistentes en GitHub

**LAB · 2026-11-12.** Extensión aislada y no destructiva de la fábrica de motores existente.

Flujo: un push al ref `cerebro-engine-factory-v0` que añade/cambia `cerebro-os/engines/{ENGINE_ID}/manifest.json` dispara el workflow `cerebro-fact-ums001-oidc-lab.yml` (GitHub id-token:write, sin secretos permanentes), el runner solicita JWT OIDC con audience `cerebro-fact001-ums001-lab`, y envía `engine_id` más `sha` al nuevo Worker `cerebro-fact001-github-oidc-enroll-lab-eu`.

El Worker valida obligatoriamente RS256 con las JWKS oficiales de GitHub y las claims: `iss`, `aud`, `repository`, `repository_id=1139292249`, `ref`, `workflow_ref`, `event_name=push`, `sha`, `exp`, `iat`, `nbf`, `jti`. Relee el manifiesto desde `raw.githubusercontent.com` referenciado por **el mismo commit firmado**, comprueba contrato UMS y bloquea repetición `jti:engine_id` mediante Durable Object SQLite.

Solo después llama al provisionador compartido `cerebro-fact001-ums001-issuer-provisioner-lab-eu` por Service Binding y un secreto de puente guardado exclusivamente en Cloudflare Worker Secrets. Ese provisionador firma el evento con el secreto FACT existente y registra la clave pública en el Gateway universal; nunca expone la clave de la fábrica ni la de los motores a GitHub.

La exposición HTTP, si se habilita, debe ser solo del nuevo Worker OIDC con endpoint `POST /v1/factory/engine-created` y verificación obligatoria del JWT; los Workers de Gateway, factory y productor siguen privados. 403 ante ausencia/falsedad de token.

**Estado al crear este snapshot:** código desplegado con `OIDC_BRIDGE_ENABLED=false`, sin route pública activa y sin test con token OIDC real. No afirmar autonomía real hasta la ejecución GitHub→Cloudflare y el recibo `ACTIVE` en Vault.

**Rollback:** desactivar subdominio del Worker OIDC primero; luego `OIDC_BRIDGE_ENABLED=false`. En el provisionador, la función nueva es aditiva y protegida por secreto. No borrar ni rotar recursos existentes. No habilitar ninguna ruta en PROD.
