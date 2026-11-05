# CUT23 · EU-D1 remote admission and owner session gates

**STATE:** HECHO LAB; EU D1 REMOTE PENDIENTE; PROD NO-GO

## Inventario que NO se puede destruir
- Account Cloudflare con Workers Free. Existe D1 `cerebro-jarvis-lab-cut21`, UUID `a859fde1-126b-4c40-bc0d-aec2f8839f7b`, región Eastern Europe, **jurisdicción ninguno**. Nunca migrarla como si fuera UE; nunca insertar información de clientes o sesiones reales.
- Dos Workers de Fénix existentes protegidos. App, CRM, Supabase, Trading, ANA, main, DNS intactos.
- Base EU `cerebro-jarvis-lab-eu`: NO creada; UUID todavía desconocido.

## Control técnico creado en CUT23
1. `zeus/jarvis/core/jarvis-cloudflare-eu-d1-admission.mjs` comprueba que los metadatos de Cloudflare reflejen nombre EXACTO, UUID nuevo, jurisdicción `eu` y que no se reutilice UUID sintético. Devuelve `deployAllowed:false` y `prod:NO_GO` incluso si son correctos. Función GET-only con `redirect:error`, errores sanitizados y token externo proporcionado desde entorno seguro (no utilizado ni instalado).
2. Tests CUT23 validan rechazos de región `eeur` sin `jurisdiction=eu`, respuestas API inválidas, UUID confundido, Worker previo, secretos en errores, redirect HTTP, PROD y token ausente.
3. `zeus/jarvis/cloudflare-lab/wrangler-eu.template.jsonc`: Worker **OFF**, **workers_dev=false**, **routes=[]**, D1 con UUID ficticio todo ceros. No está listo para desplegar. No copiar un UUID de CUT21.
4. `verify-cut23-eu-config.mjs` y workflow Wrangler local existente comprueban configuración OFF y un `deploy --dry-run` sin acceso a Cloudflare remoto. No sustituye la prueba de la jurisdicción remota.

## Actuación remota que requiere una capacidad de escritura que NO está disponible en este chat
En Cloudflare Dashboard → Workers & Pages → D1 → Create, escribir `cerebro-jarvis-lab-eu`, escoger **Specify jurisdiction** → **European Union (EU)**, y crear en Free sin añadir suscripción. También es válido con un token de **LAB con mínimo alcance** almacenado en un entorno seguro: `wrangler d1 create cerebro-jarvis-lab-eu --jurisdiction=eu`; el comando real NO se ha ejecutado.

Cloudflare documenta que la jurisdicción SOLO se configura en creación y que `eeur` como pista de región no equivale a `eu` como jurisdicción. Fuente: https://developers.cloudflare.com/d1/configuration/data-location/.

## Gates posteriores obligatorios
- Inventariar UUID nuevo y confirmar `jurisdiction=eu` mediante lectura autenticada de la API Cloudflare, incluyendo respuesta de errores y política de réplicas.
- Confirmar quota gratuita, límites, uso, auditoría, backup inicial y restore a OTRO destino EU aislado antes de cualquier dato real.
- Aplicar migraciones 0001/0002 ÚNICAMENTE sobre la nueva D1 EU y con un dump/rebuild verificado; empezar con datos sintéticos, no OWNER_ROOT real.
- Registrar Vault servidor, identidad OWNER_ROOT y permisos B3 minimizados; conectar Gateway read-only bajo kill-switch OFF, sin rutas públicas hasta pasar tests y tribunal.
- Pruebas físicas de dos dispositivos, caducidad/revocación y persistencia de misión con OLD vs NEW, observabilidad y rollback probado; B10 independiente. PROD continúa NO-GO.
- Aun con CI en verde no ejecutar promoción. D1 usa SQLite, NO RLS PostgreSQL.

## CI verificada SHA `74492a88e3a05596d4a8097b9d1d180d9df391ef`
- Universal Core `42124469023`: **642/642 PASS / 0 FAIL**
- Wrangler local `42124469078`: configuración EU OFF, bundle dry-run, D1 local read/revoke/restore PASS
- B4 `42124468994`, B7 `42124468936`, Governed `42124468952` SUCCESS; promoción no ejecutada.
- Se ha utilizado Cloudflare únicamente en lectura de consola; **ninguna creación, mutación remota, DNS, producción, secreto o suscripción ejecutada en CUT23**.

## Rollback y continuidad
Solo revertir commits CUT23 en PR #25 DRAFT; no hay artefactos Cloudflare que borrar. Mantener todos los controles previos CUT15–22 y el documento canónico de Biblioteca actualizado.
