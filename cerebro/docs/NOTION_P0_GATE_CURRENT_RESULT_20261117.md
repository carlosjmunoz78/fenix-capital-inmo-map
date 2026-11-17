# CEREBRO OS · Notion P0 · Gate real 17/11/2026 · Chat normal

## Evidencia actual
- Fuente de continuidad: `cerebro/docs/CEREBRO_NOTION_PENDIENTES_Y_PLAN_DE_CIERRE_20261117.md`, leído del PR #70 DRAFT.
- Supabase proyecto `fenix-capital-prod` ref `cluhljgonannaafpmblx`: Edge `cerebro-console-gateway-v0` ACTIVE v38 SHA `15899b7f2a752ef1d577c0d13e02fbe553c99efd179edddb981a360a89556256`. Ninguna modificación de esa función en este bloque.
- Vault: secreto `cerebro_nia_cf_queues_write_lab_20261117` existe y está cifrado; Cloudflare token asociado (ID `633de454c0c59bdf6829d2d884abcb7d`) ACTIVE, expira el **01/12/2026 00:00 UTC**.
- Cloudflare Queues Write sigue siendo a nivel de cuenta; no afirmar límite a una sola cola por el permiso. Enrutamiento del consumidor fija la cola `c6325451fce54fd6bf4b25095627ba66`.
- Emisor `cerebro_cf_account_token_issuer_v2` ACTIVE y referenciado en Vault existente. No se ha impreso ni leído ningún valor secreto fuera de los almacenes autorizados.

## Rotación P0 · estado exacto
**PARCIAL / BLOQUEADO PARA DESPLIEGUE, credencial anterior PRESERVADA.**
- Preparado código de renovación *de un solo uso*, sin broker nuevo, en `cerebro/ops/nia-queues-credential-rotation-one-shot-20261117.ts`. Commit `e7fd9b502829ef5a8750213a7293f7355b9e4c43`, sintaxis JS PASS.
- Diseño: autenticación HMAC con secreto Vault existente; token nuevo con único permiso Queues Write, nuevo alias cifrado en Vault, token anterior intacto y rollback. Código NO DESPLEGADO.
- El conector rechazó la operación de despliegue por un control de seguridad. Se ha respetado ese bloqueo; no se ha intentado eludirlo.
- **Ningún token nuevo fue creado.** **No se sustituyó ni revocó el anterior.** La Console y la entrega NIA siguen con la credencial original.
- **Siguiente gate único**: ejecución autorizada y permitida del bootstrap de rotación interna servidor→Vault, comprobación del token nuevo contra Queue real sin duplicados, cambio atómico del alias consumidor, PASS FACT/NIA, rollback verificado, revocación del antiguo y cierre del endpoint temporal. Sin pasar valores por chat, GitHub ni herramientas entre servicios.
- No considerar completado mientras falte la revocación, prueba E2E, evidencia de expiración y cierre de bootstrap.

## Capacidades Notion · matriz incremental sin inventario nuevo
- Archivo: `cerebro/registry/notion-capability-route-matrix-lab.v0.json`, commit `0e60b6f17d506ee47f300f2a0ea7c1c731c0992d`.
- **11 capacidades** etiquetadas como ejecutadas, existentes, disponibles sólo en MCP/UI, parciales o bloqueadas.
- Se han verificado **11/11 checks deterministas de contrato**, incluido que todos los `engine_id` existen en `engine-registry.v1.json`, sin modificar el Registry canónico y sin activar escritura ni autonomía.
- Nuevo READ directo de Notion MCP sobre documentos conocidos `NIA contrato de capacidades` y `MOD-9 Automatizaciones e infraestructura` = **HECHO en conector**, pero **no** equivale a READ vía Router CEREBRO ni prueba el índice cifrado. El E2E del índice en CEREBRO sigue pendiente.
- Notion Skills habilitadas: NIA, Mejorar la redacción, Corregir, Explicar, Reformatear; listado verificado por conector. No asumir invocación IA nativa por presencia de una Skill.
- Notion Custom Agents: búsqueda en scope `workspace` y `favorites` devuelve `results:[]`. El conector puede `spawn_session` de agentes **publicados**, no ofrece una vía comprobada para crearlos/publicarlos. **IA nativa NO INVOCADA.**
- Fuentes oficiales: https://www.notion.com/help/custom-agents y https://www.notion.com/help/buy-and-track-notion-credits-for-custom-agents. Los Custom Agents consumen créditos Notion; no habilitar ni consumir créditos automáticamente hasta certificar saldo/límite/gasto cero.

## P1 conservado
- Backup sigue **75/v3**, exactamente **72 páginas y 3 fuentes** cifradas en Google Drive con D1 CAS. No reiniciar ni afirmar backup integral.
- Correlación duradera actor+company+request+status final y ruta JARVIS predeterminada = PARCIAL; el E2E actual corresponde a Console V0.
- No tocar App/CRM, DNS, WordPress, Trading, otros motores ni main. No GitHub Actions, Worker/Notion AI nuevo, publicaciones ni compras.
- PR #70 permanece DRAFT. Coste de suscripciones adicionales **0 €**; consumo marginal en plataformas ya pagadas **NO MEDIDO**.

## Estado y next_block
`P0_TOKEN_ROTATION_DEPLOY_BLOCKED` → completar de forma segura en el mecanismo existente cuando el conector autorice la operación, sin evadir los controles. Mientras tanto `NOTION_CAPABILITY_ROUTE_MATRIX` está **DOCUMENTADO/TEST ESTÁTICO**, no desplegado en Router.
