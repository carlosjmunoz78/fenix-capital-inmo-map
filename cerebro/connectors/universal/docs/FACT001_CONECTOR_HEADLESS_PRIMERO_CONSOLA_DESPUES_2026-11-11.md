# FACT-001 · Decisión transversal: Conectores ejecutables ANTES de la Console
Fecha: 11 de noviembre de 2026
Estado del documento: **DEFINIDO Y REGISTRADO**. No equivale a conector universal implementado.

## Decisión del propietario
Completar **Cloudflare, GitHub, Supabase, Vercel y Notion** como motores operativos por detrás de la interfaz, sin condicionar el cierre técnico de cada conector a que esté terminada CEREBRO Console. Opera permanece en último lugar.

### Tres entradas al mismo motor
1. **CEREBRO headless autónomo:** utiliza identidad de servicio independiente; ejecuta tareas dentro de permisos previamente aprobados, límites y políticas, con cola duradera/idempotente, auditoría, lecturas de confirmación y rollback probado.
2. **ChatGPT con órdenes del propietario:** utiliza conectores ya autorizados y permisos efectivos, no credenciales del usuario en el chat. Las operaciones se acreditan físicamente en el proveedor; ChatGPT no presupone que su OAuth es la identidad de CEREBRO.
3. **CEREBRO Console (posterior):** interfaz de usuario (selector de empresa, contexto, chat, órdenes, motores, historial y auditoría) conectada **exclusivamente a CEREBRO Gateway**, no a un modelo ni al proveedor directamente. La consola consumirá las mismas APIs/contratos; no reconstruir conectores.

### Contrato mínimo de operación
`company_id`, `engine_id`, `environment`, `version`, `provider`, `operation`, `request_id`, `client_id`, `identity_ref`, `authorization_context`, `risk_level`, `idempotency_key`, `max_cost_eur`, `audit_ref`, `result_status`.

Ruta lógica: **origen autorizado → identidad verificada → políticas/tribunal → permisos mínimos → cola duradera → ejecutor proveedor → lectura de efecto real → auditoría → resultado verificable**, con `HUMAN_REQUIRED` para legal, firma, baja confianza, riesgo alto, conflicto, seguridad, límite de dinero o petición explícita.

**No convertir el sistema en un proxy arbitrario**: catálogos allowlist de operaciones, segregación por empresa/entorno, control de coste y rollback. Motor ≠ IA; priorizar TypeScript/SQL/reglas/automatismos de coste cero.

### Gate de VERDE por conector sin consola
- Inventario de recursos y consumidores, contrato OLD y mapa de dependencias.
- Secretos en Vault/servicio seguro, identidad headless real y ChatGPT separadas, permisos mínimos.
- Inventario real, CRUD limitado al LAB propio **cuando proceda**, sin tocar existentes ajenos.
- Backup, reconstrucción y rollback físicos, tests negativos, recuperación de errores e idempotencia.
- Cola de tareas conectada a ejecutor REAL para operaciones autorizadas, observabilidad, auditoría y cuota/coste medidos.
- Contratos/API estables para conectarlo más tarde a la Console y posibilidad de promoción gradual.
- **No** exigir JWT real de la interfaz inacabada para cerrar el *backend*. **Sí** exigirlo cuando se integre la Console, sin sustituirlo por OIDC de CI.
- Estados `HECHO`, `PARCIAL`, `DEFINIDO`, `PLANIFICADO`, `POR AUDITAR`; marcar `VERIFIED_FULL` solo con evidencia de *todos* los `green_requires` del registro.

### Orden de aceptación
1. **P0 Cloudflare**: emisor mínimo v2 y D1 heartbeat LAB ya verificados; *conector universal FULL* sigue PARCIAL por operaciones de proveedor y rollback no demostrados. No bloquearlo solo por la UI.
2. **P1 GitHub**: identidad de servicio para gestión de repos/branches/PR y controles de permisos, CI, rollback en repos aislados.
3. **P2 Supabase**: capacidad de gestión con límites de esquema, backups, aislamiento App/CRM/Auth PROD.
4. **P3 Vercel**: binding correcto de cuenta y proyectos; despliegues y rollback en proyecto aislado, sin tocar dominios existentes.
5. **P4 Notion**: permisos de workspace, sincronización incremental, backup cifrado y restauración reversible.
6. **P5 Gateway y Console**: integrar los conectores probados en Gateway real mediante adaptadores; completar luego sesión/UX de Console y E2E del propietario.
7. **P6 Opera**: siempre al final, sin sustituir identidades de servicio por la sesión del navegador.

### Límites no negociables
`App`, `CRM`, `Supabase PROD`, `DNS`, `WordPress`, `SEO`, `Trading` y flujos existentes se preservan. **No** promover desde LAB a PROD sin evidencia, coste máximo añadido **0 €** salvo justificación y autorización. Implementación paralela, snapshot, comparación OLD/NEW, rollback probado; no tocar main como atajo.

### Próximo trabajo tangible
Por cada proveedor cerrar primero el contrato de ejecución headless y tests físicos independientes, después su integración futura con el Gateway. La aceptación de un conector no depende de que la consola esté terminada. La aprobación para operaciones ordinarias en LAB no elimina controles humanos exigibles por ley, seguridad o riesgo.

**Registro original:** `registry/headless-gates.v1.json`. **Documento maestro:** `docs/FACT001_TRASPASO_MAESTRO_CONECTORES_2026-11-11.md`.
