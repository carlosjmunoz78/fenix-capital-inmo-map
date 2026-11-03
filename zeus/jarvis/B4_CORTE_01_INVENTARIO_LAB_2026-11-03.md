# ZEUS / SUPERAGENTE JARVIS · BLOQUE 4 · CORTE 01

Fecha: 2026-11-03 · Estado: **PARCIAL / LAB VERIFIED**, **NOT_CONFIRMED_OPERATIONAL**.

## Fuentes de verdad verificadas en vivo
- GitHub `carlosjmunoz78/fenix-capital-inmo-map`, PR #13 **OPEN DRAFT**, cabeza previa a B4: `41cc0a83562652b71aba997face26851a1d12d9c`.
- CEREBRO `public.jarvis_project_overlay_v1`, `PRJ-SUPERAGENT-001`, `status=PARCIAL`, `CONSOLE-001`, `company_id=fenix`, `environment=PROD`.
- B3 en PROD `zeus_jarvis.b3_runtime_control`: `enabled=false`, `kill_switch=true` (no activado).
- `fenix_prod.cerebro_conversation_memory` existe, **31 registros** al corte, con `actor_code`, `company_id`, `engine_id`, `environment`, `version`, `source_type`, `confidence`, `subject_key`, `superseded_by`, validación temporal e índices de deduplicación, búsqueda y ámbito.
- `fenix_prod.cerebro_user_preferences` ya ofrece claves, scope, versionado, supersedes y activo; no reemplazarla.
- `fenix_prod.ana_correcciones` existe, **0 registros** al corte, con motivo, regla, estado, decisión, revisor y claves idempotentes. No duplicarla.
- `fenix_prod.ana_knowledge_cards` existe; `fenix_prod.chat_conversations/chat_messages` también. Datos de clientes, expedientes y conversaciones NO se copiaron ni exportaron a este paquete.
- Las tablas anteriores tienen RLS activada y no admiten USAGE del esquema a `anon` ni `authenticated`. Esto **no** significa que cualquier backend privilegiado sea seguro: verificar los gateways y actores antes de conectar.
- Schema privado `zeus_jarvis` de B3 disponible y bloqueado. Los avisos generales del Security Advisor previos no justifican cambios en App/CRM.

## Diseño B4 instalado en código aislado (no en backend PROD)
- `jarvis-b4-memory.mjs`: ledger append-only de eventos con fuente, confianza, id de empresa/proyecto/misión/motor, versión, relaciones, consentimientos, TTL, decisión/corrección/revocación y checkpoint. Identidad verificada mediante adapter del servidor. El owner no obtiene permiso de una cadena enviada por frontend.
- `jarvis-b4-postgres-store.mjs`: adaptador PostgreSQL server-only, parámetros SQL y clave idempotente. No está conectado al gateway.
- `jarvis-b4-*.test.mjs`: pruebas sintéticas LAB; no prueban sesiones reales ni restauración de backups.
- `../gates/20261103_jarvis_b4_private_memory_events_v0.sql`: **candidato**, NO desplegar automáticamente. Esquema aislado con RLS y flag OFF. Solo aplicar después de revisión de DDL, snapshot y comprobación de coste/cuotas.

## Invariantes que sí demuestra LAB
- OWNER_ROOT solo si lo afirma el proveedor de identidad server-side; aislamiento por `owner_id+company_id+environment+project_id`.
- Rechazo de enlaces entre empresas; claves de idempotencia estables y operaciones atomizadas a través de la interfaz de almacenamiento.
- Fuente externa SYSTEM_VERIFIED/DOCUMENT/INFERENCE requiere verificación de procedencia por componente de servidor; baja confianza e inferencias no pasan a contexto canónico automáticamente.
- Contradicciones con dos valores activos se informan como CONFLICT, sin inventar resolución.
- Corrección conserva histórico y revocación retira el hecho de la vista activa; la eliminación física por derechos de privacidad requiere un procedimiento separado, aún no construido.
- `Teach Once` / `Never Ask Me Again` solo para preferencias UX consentidas, nunca autorizaciones, MFA, pagos, legal, privacidad o seguridad.
- Checkpoint pendiente tras interrupción devuelve `RECONCILIATION_REQUIRED`: prohíbe repetir side-effects sin conciliación real. Esto NO equivale a un worker reanudado.
- No se guardan secretos conocidos; una regex no es un DLP suficiente, por lo que datos sensibles y escritura libre PROD permanecen prohibidos.

## Pendientes reales / NO-GO
1. **B2**: vinculación OWNER_ROOT con autenticación independiente y pruebas reales PC-móvil, centralización transaccional de misiones y reinicios.
2. **B3**: Vault/grants/revocación/seguridad autenticados, kill switch debe seguir ON.
3. **B4**: auditar lectores/escritores reales de las tablas heredadas; definir mapa read-only y evitar sincronización bidireccional sin propietario de dato.
4. Instalar DDL privado exclusivamente con backup previo verificado, comparación schemas, security advisor y rollback probado. No hay evidencia de ello en este corte.
5. Ensayar PostgreSQL real entre dos instancias autenticadas, concurrencia multi-proceso, fallo/reinicio, restauración, retención y purga GDPR.
6. Conectar gateway bajo auth/consentimiento y limitaciones, medir cargas y costes, observabilidad y evaluación independiente.

## Rollback
- Código: eliminar/revertir únicamente archivos B4 en rama aislada (no afectar PR #13 original).
- Candidatura SQL: **no aplicada**; no hay cambio de esquema B4 que revertir.
- Registro CEREBRO: referencia de Biblioteca añadida en transacción auditada con nueva revisión. No modificar B2/B3, permisos, secretos ni flags.

## Continuación
`next_block=B4_CUT_02_VERIFIED_PRIVATE_DDL_BACKUP_AND_RUNTIME_ADAPTER` cuando los gates permitan snapshot seguro y tests más fuertes. Preparación B5 **NO** significa B4 cerrado. Coste incremental pagado: **0 €**; DeepSeek sin consumo.