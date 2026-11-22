# CEREBRO OS · UMS-001 UNIVERSAL GITOPS IMAGE E2E · LAB · 2026-11-12

## Verificación física completa
- Nuevo cliente compartido: carlosjmunoz78/capital-mapa-pro, rama cerebro-engine-factory-v0, archivo cerebro-os/factory/universal_media_gitops_lab.py.
- Un único workflow compartido: .github/workflows/cerebro-ums001-universal-image-gitops-lab.yml. Se activa mediante un nuevo JSON en cerebro-os/media-requests/ENGINE_ID/REQUEST_ID.json. No se crean Workers ni colas por motor.
- Solicitud real desde FACT-OIDC-LAB-E2E-001 (registro ACTIVE) por GitHub OIDC efímero. SHA del commit de solicitud: 46e6ffd3e8b963f15a93a82a8572dd6ab39a0403.
- Workflow run: https://github.com/carlosjmunoz78/capital-mapa-pro/actions/runs/43259579088, job 131326931224: **SUCCESS**; tests offline, petición, consulta y descarga privada: SUCCESS.
- Asset de GitHub, solo colaboradores autorizados: https://github.com/carlosjmunoz78/capital-mapa-pro/actions/runs/43259579088/artifacts/13962018942, ZIP 655712 bytes, dos archivos: JPEG y recibo JSON, expires 2026-11-13 16:32 UTC.
- Solicitud UMS001-LAB-GITOPS-20261112-001. Imagen JPEG 1024×1024, 659089 bytes, sha256 cd82394fb5a35969484a39804ffb87b06c8c966bfbca0dfefda5687f27a9a2fc.
- KV de factory: PRIVATE_READY, QA técnico PASS, formato verificado, publicación FALSE.
- KV de recepción FACT: PRIVATE_ASSET_RECEIVED, mismo SHA256 y bytes.
- Worker de GitHub OIDC: cerebro-fact001-github-oidc-enroll-lab-eu; rutas /v1/factory/image-request, /v1/factory/image-status y /v1/factory/image-download con firma GitHub OIDC RS256, control repo id, rama, workflow exacto, SHA y Durable Object anti-replay.
- Los workflows autorizados son SOLO cerebro-fact-ums001-oidc-lab.yml (alta) y cerebro-ums001-universal-image-gitops-lab.yml (peticiones). El segundo no puede registrar motores. Los valores de secretos no se registraron.
- Modelo existente FLUX en Cloudflare Workers AI, una llamada a generador por petición; factura global no certificada.

## Estado real
HECHO: nueva entrada universal GitOps Fénix LAB y petición real genérica desde motor registrado, devolución del JPEG a flujo de GitHub Actions sin pasos humanos una vez creado el archivo de orden.
PARCIAL: los motores fuera del runtime/branch FACT-001 aún necesitan acceso al CEREBRO Gateway desde su sistema. El mecanismo universal evita conexiones **por motor** en el ecosistema FACT GitOps, pero no despliega automáticamente un cliente en todos los servicios existentes de CEREBRO ni da acceso público.
NO AUTORIZADO: publicar en Facebook/Instagram/WordPress o usar en PROD sin QA visual/marca/derechos, costes y promoción. Otras empresas bloqueadas.
El original permanece en KV privado de Cloudflare; el artifact de GitHub dura 1 día.

## Rollback
- Revertir exclusivamente el commit que añadió .github/workflows/cerebro-ums001-universal-image-gitops-lab.yml si se requiere pausar nuevas peticiones.
- Retirar del OIDC Worker la referencia al workflow de imágenes y las rutas nuevas; backup del Worker previo: fact001-oidc-bridge-before-universal-media-20261112.worker.mjs.
- Preservar el workflow OIDC de enrolamiento y las claves Ed25519 de otros motores.
- No modificar App, CRM, Supabase PROD, Trading, Instagram/Facebook AUTOQUAL, DNS, WordPress o main.

## Gates
- E2E técnico: PASS.
- Enrolamiento FACT-001 real: PASS previamente verificado.
- Autorización del runtime externo y multiempresa: PENDING.
- QA visual, marca y licencia: PENDING.
- Contabilidad Cloudflare: NO VERIFICADA.
- Rollback lógico documentado; ensayo completo de rollback: PENDIENTE.
