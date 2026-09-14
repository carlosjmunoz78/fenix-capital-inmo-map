# APP Fénix · reconciliación viva de restauración · 2026-09-14 16:00 CEST

Objetivo: reconciliar documentación histórica con el estado vivo de la rama y Supabase, sin promover ni desplegar nada por inferencia.

> Estado de promoción: **NO PROMOVIDO**. La rama y sus builds no equivalen a App PROD. App PREPROD continúa desactivada.

## Estado verificado

### HECHO · retiro selectivo de RPC legacy
Verificación read-only en Supabase PROD (`cluhljgonannaafpmblx`): los ocho RPC legacy objetivo ya no conceden EXECUTE a `authenticated` y sí conservan EXECUTE para `service_role`.

Funciones verificadas:
- `fenix_prod_chat_list_user(integer)`
- `fenix_prod_chat_send_user(text,text)`
- `fenix_prod_contact_create(text,text,text,text,text,text,text,text,boolean)`
- `fenix_prod_exp_create(text,text,text,text,text,numeric,numeric,text,text,jsonb,boolean)`
- `fenix_prod_exp_update(text,integer,text,text,text,text,date)`
- `fenix_prod_notifications_list_user(integer)`
- `fenix_prod_notification_mark_user(uuid,text)`
- `fenix_prod_sign_create(text,timestamptz,text,text,timestamptz,timestamptz,date)`

Consecuencia: `legacy_rpc_retirement` pasa de READY_TO_APPLY_OR_VERIFY a HECHO/VERIFICADO. No volver a ejecutar REVOKE salvo nueva evidencia de regresión.

### HECHO · salud estructural relacionada
- `fenix-app-gateway` sigue ACTIVE v17.
- Security Advisor muestra 16 SECURITY DEFINER ejecutables por `authenticated`, frente a 24 antes del retiro de los ocho legacy.
- `pg_net` permanece intacto; no mover/eliminar/recrear.
- RLS sin policy aparece en 46 tablas, incluyendo las nuevas tablas de notas de acciones; se conserva el patrón fail-closed hasta auditoría específica. No crear policies solo para eliminar warnings.

### HECHO EN RAMA · Agenda/Tareas
La rama ya contiene selección múltiple, seleccionar visibles, estado destino, comentario común, preview, confirmación y control de conflicto de versión para acciones masivas. No repetir esta restauración.

### HECHO EN RAMA · Expedientes acciones masivas
Existe backend aditivo, wrapper server-only, Edge Function `fenix-expediente-actions` v1, prevalidación all-or-nothing, rehearsal con ROLLBACK y UI en rama. La promoción sigue separada del hecho de que la capacidad exista y tenga build verde.

### HECHO EN RAMA · Informes estructurados
`InformesShell.tsx` actual ya renderiza eventos estructurados diarios/semanales con hora Europe/Madrid cuando la fuente la aporta, mantiene PDF como opción cuando existe y no inventa duración. El bloque duplicado de corrección descrito por una matriz anterior ya no aparece en el código actual. Por tanto, ese gap documental estaba obsoleto.

### HECHO EN RAMA · Perfil sobre contratos existentes
- Backend PROD `fenix-profile-api` v1 está ACTIVE y protegido por JWT.
- GET usa `fenix_prod_profile_get_server`.
- PATCH permite únicamente `display_name` y `zone_code` mediante `fenix_prod_profile_update_server`, con auditoría en `activity_log`.
- La UI de Perfil ya consume ese contrato y permite editar únicamente esos campos autorizados. No se crea persistencia paralela.
- El cambio de contraseña propia está cableado mediante la sesión autenticada de Supabase Auth. La contraseña existente nunca se consulta, muestra ni almacena en la interfaz.
- Backend PROD `fenix-user-admin` v2 está ACTIVE y protegido por JWT. La rama lo envuelve con UI solo para Dirección autorizada (`CARLOS-ADMIN` / `BELEN-DIR`) para alta de usuarios y reset de contraseña de usuarios administrables.
- El rol puede seleccionarse al crear una cuenta dentro de los roles autorizados por el backend. No se inventa edición de rol de usuarios existentes porque ese contrato no existe.
- Build gate GREEN en `b59af10084043ba2e0d4fd918f831dea3f7d9627`; TypeScript y Vite build completaron correctamente.
- Teléfono, bio, redes y objetivos siguen sin contrato canónico de escritura en `fenix_prod.actors`; permanecen sin edición. No crear tabla paralela ni storage local para aparentar funcionalidad.

### HECHO EN RAMA · Top 3 bancario dinámico y atención de hoy
- `ExpedienteBankRankingProdGuard.tsx` ya obtiene bancos candidatos reales de la operación, envíos bancarios registrados y ofertas recibidas; recalcula y ordena el Top 3 con esas señales.
- Cuando no existe histórico suficiente, la propia UI lo presenta como candidato activo y no como aprobación bancaria.
- `DirectionAttentionTodayGuard.tsx` consume el snapshot vivo de Dirección y muestra hasta tres prioridades confirmadas.
- `useDirectionLiveData.ts` construye rutas concretas cuando existe identificador: tarea -> `/tareas/{id}`, firma -> `/firmas/{id}`, expediente en riesgo/en curso -> `/expedientes/{code}`. Los fallbacks van a vistas filtradas cuando no existe identificador.
- Por tanto, el gap histórico «Top 3 dinámico + requiere atención hoy» ya no debe tratarse como construcción desde cero. Queda QA de calidad/routing en navegador, no reimplementación.

## Gaps reales después de reconciliar

1. PARCIAL — Perfil: E2E real-session de edición de nombre/zona, cambio de contraseña propia y administración de alta/reset. Ampliar teléfono/bio/redes/objetivos solo tras contrato backend explícito.
2. PARCIAL — Inicio/Bancos: QA representativo del orden Top 3 y click-through de `REQUIERE ATENCIÓN HOY`; no reconstruir la lógica existente sin evidencia de fallo.
3. PARCIAL — Documento→persona: E2E controlado de PDF digital, escaneado e imagen incrustada; confirmar destino correcto y RBAC de descarga del original.
4. PARCIAL — Modelo laboral canónico: no existen aún campos visibles separados para `tipo_contrato`, `modalidad_contrato`, `fecha_inicio/fin`, `jornada`, `categoria_profesional`, `numero_pagas`; no reutilizar `situacion_laboral` para conceptos distintos.
5. PARCIAL — Participantes: E2E controlado de escritura con cleanup/rollback definido.
6. PARCIAL — QA final: browser QA, OLD vs NEW y rollback/promotion evidence antes de merge/promoción.
7. PARCIAL — Ana conversacional 0 €: verificar calidad real sin introducir dependencia obligatoria de IA de pago.

## Regla de continuidad

No usar una matriz histórica como estado operativo si el código o Supabase actuales la contradicen. Revalidar -> documentar diferencia -> conservar capacidad -> trabajar solo el gap real.
