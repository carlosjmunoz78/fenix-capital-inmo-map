# CEREBRO OS · JARVIS V2 · CUT27
## Cloudflare D1 EU · operador seguro y desbloqueo físico · 2026-11-06

**Estados:** HECHO código LAB · PARCIAL conexión cloud · PENDIENTE D1 EU remota · PROD **NO-GO**.

### 1. Inventario confirmado sin mutar
- Cuenta Cloudflare **Workers Free**; el último inventario del dashboard (solo lectura) muestra **una** D1: \`cerebro-jarvis-lab-cut21\` UUID \`a859fde1-126b-4c40-bc0d-aec2f8839f7b\` con jurisdicción **NINGUNO**. Preservar, no cargar datos reales.
- Nueva D1 \`cerebro-jarvis-lab-eu\`: **NO creada**.
- Dos Workers anteriores Fénix intactos, App/CRM/PROD/main/Supabase/Trading/ANA/DNS intactos.
- Opera autenticado en Cloudflare; pestaña de creación D1 abierta. Conector Opera en este modo de Chat **sólo permite leer/navegar**, no escribir ni enviar formularios. No se han usado cookies o sesiones como tokens API.

### 2. Código implementado y probado
- \`core/jarvis-cloudflare-eu-d1-provisioner.mjs\`: consulta inventario vía GET oficial, rechaza cualquier recurso de nombre equivocado o jurisdicción distinta, exige capacidad del Free tier (<10 D1), hace como máximo **un** POST de creación con \`{name:'cerebro-jarvis-lab-eu',jurisdiction:'eu',read_replication:{mode:'disabled'}}\` y a continuación un GET de verificación. **Nunca reintenta** un POST cuyo resultado sea ambiguo.
- Es **lectura por defecto** (\`mode=inspect\`) y requiere \`approved:true\` y \`confirmation:'CREATE_JARVIS_EU_LAB'\` para permitir el único POST. Nunca desplegar Worker, conectar DNS, migrar tablas, activar JARVIS ni permitir PROD.
- \`cloudflare-lab/provision-eu-d1-cli.mjs\`: ejecución preparada para máquina cloud/Work o runner seguro; lee \`CLOUDFLARE_API_TOKEN_JARVIS\` solo de entorno protegido y exige \`JARVIS_EU_CREATE_APPROVED=YES\` para \`--create\`. La salida muestra sólo estado y UUID, no token, respuesta completa o errores.
- 18 pruebas nuevas en Node para el operador y su CLI. Cero llamadas de API a Cloudflare real durante esas pruebas.

### 3. Evidencia CI
Código CUT27 \`0c078a51e6e84eb08f9899b6b41234d37c80ad50\`, **691/691 tests, 0 fallos**. Core \`42132847739\`, Wrangler D1 sólo LOCAL \`42132847612\`, B4 \`42132847610\`, B7 \`42132847642\`, Governed \`42132847633\`: cinco workflows SUCCESS. Promoción NO ejecutada.

### 4. Única operación física que falta ahora
En Cloudflare Dashboard → Workers & Pages → D1 → Create:
1. Nombre **exacto**: \`cerebro-jarvis-lab-eu\`.
2. Data location → **Specify jurisdiction / Especificar jurisdicción**, seleccionar **European Union (EU)**. **NO** elegir sólo una región tipo "Europa oriental".
3. Crear en el plan Free sin añadir suscripciones ni rutas. NO borrar la primera D1.

La alternativa para una sesión cloud con capacidad de ejecución es configurar temporalmente un token con permiso **D1 Write** limitado a la cuenta aprobada en un Vault/secret de Work (NO en chat, logs, argumentos de línea de comando, ni archivos). En un terminal cloud autorizado, con \`CLOUDFLARE_API_TOKEN_JARVIS\` ya inyectado de forma segura, el operador puede ejecutar:
- Inspección segura (sin crear): \`node zeus/jarvis/cloudflare-lab/provision-eu-d1-cli.mjs\`.
- Creación expresamente autorizada: \`JARVIS_EU_CREATE_APPROVED=YES node zeus/jarvis/cloudflare-lab/provision-eu-d1-cli.mjs --create\`.

**No se ha ejecutado la creación remota**. El código no se ha fusionado ni desplegado. Cloudflare documenta que la jurisdicción sólo puede fijarse durante la creación. Fuente oficial: https://developers.cloudflare.com/d1/configuration/data-location/.

### 5. Después de obtener el UUID
- Comprobar por GET en Cloudflare que el UUID no coincide con el de CUT21, \`name\` es el nuevo y \`jurisdiction=eu\`.
- Crear inventario de capacidad Free, snapshot inicial y aplicar migraciones **0001..0005 sólo en la nueva D1 EU y con datos sintéticos**, seguida de exportación SQL y restauración verificada en otra D1 EU aislada. No usar supabase alternativo ni trading.
- Preparar Vault y B2 OWNER_ROOT real, B3 MISSION_INSPECT y auditoría con kill switch OFF. Validar revocación y una misión persistida entre DOS dispositivos físicos.
- Ejecutar OLD vs NEW, pruebas negativas de seguridad, cuota/coste medidos, rollback y tribunal B10 independiente antes de cualquier promoción.

### 6. Rollback, continuidad y límites de afirmación
- CUT27 es código LAB en PR #25 DRAFT. Para retirarlo revertir sólo los commits CUT27; no hay recursos Cloudflare creados o cambiados por este corte.
- Que el código esté certificado no significa que el servicio esté operativo cloud. D1 es SQLite y no proporciona RLS PostgreSQL; el perímetro B2/B3 y rol mínimo siguen obligatorios.
- No se ha contratado ninguna suscripción. La cuota de GitHub Actions utilizada no se ha cuantificado.

### 7. Referencias
- Cloudflare D1 Create API (D1 Write): https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/create/
- Cloudflare D1 List API: https://developers.cloudflare.com/api/resources/d1/subresources/database/methods/list/
- Cloudflare D1 location/jurisdiction: https://developers.cloudflare.com/d1/configuration/data-location/
- GitHub PR #25: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/25
