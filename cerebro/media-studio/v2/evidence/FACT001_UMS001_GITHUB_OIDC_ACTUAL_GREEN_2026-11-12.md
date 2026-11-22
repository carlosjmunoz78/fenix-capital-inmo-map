# CEREBRO OS · UMS-001 / FACT-001 · Alta automática OIDC real VERDE · 2026-11-12

## Gate confirmado
El motor `FACT-OIDC-LAB-E2E-001` ha sido creado usando el scaffold de FACT-001, incorporado a la rama LAB y registrado **sin intervención administrativa de Cloudflare** por el workflow `cerebro-fact-ums001-oidc-lab.yml` con identidad temporal GitHub OIDC.

Evidencia: https://github.com/carlosjmunoz78/capital-mapa-pro/actions/runs/43255769366 — job 131313426383 SUCCESS; log: `FACT-001 -> UMS-001 LAB: FACT-OIDC-LAB-E2E-001 state=ACTIVE signed_probe=REGISTERED_QA_PENDING`.

Cloudflare Vault: `ACTIVE`, clave Ed25519 privada cifrada, key ID `UMS001-LAB-FACT-OIDC-LAB-E2E-001-52AF9504E11A1F`, activado `2026-11-12T16:10:41.850Z`. Repo ID validado por bridge = `1139292249`.

La conexión es compartida: FACT-001 → OIDC (repo/ref/workflow/commit SHA/JWKS, anti-replay Durable Object) → provisioner → Gateway UMS-001. No necesita nuevas credenciales GitHub Secrets ni Workers por cada motor. La corrección del error real de Cloudflare `INVALID_REDIRECT_VALUE` se ha validado con la ejecución correcta.

## Distinciones obligatorias
- VERIFICADO: registro automático de la identidad del nuevo motor y canary Ed25519 firmado aceptado por UMS.
- VERIFICADO EN ENSAYO SEPARADO: otro motor registrado `FACT-MEDIA-CANARY-001` generó JPEG real 1024x1024 y recibió `PRIVATE_ASSET_RECEIVED` con SHA256 coincidente.
- NO ACREDITADO todavía: petición de imagen iniciada autónomamente por el runtime del nuevo `FACT-OIDC-LAB-E2E-001`, ni distribución universal a todos los motores existentes ni multiempresa PROD. La plantilla/SDK del emisor y el retorno al proceso real requieren contrato e IAM, aunque la infraestructura compartida ya está operativa en LAB.
- Sin publicaciones, sin gastos facturados certificados y sin cambios App/CRM/WordPress/DNS/PROD.

## Rollback
Apagar exclusivamente `OIDC_BRIDGE_ENABLED` en el bridge `cerebro-fact001-github-oidc-enroll-lab-eu`; no borrar claves registradas ni colas de otros motores, no tocar `REGISTRATION_WINDOW_ENABLED=false`. La rama factory y PR #46 conservan código y evidencias.
