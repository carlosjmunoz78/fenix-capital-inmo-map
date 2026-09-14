# APP Fénix · reconciliación viva de restauración · 2026-09-14 16:00 CEST

Objetivo: reconciliar documentación histórica con el estado vivo de la rama y Supabase, sin promover ni desplegar nada por inferencia.

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

### PARCIAL · Perfil
- Backend PROD `fenix-profile-api` v1 está ACTIVE y protegido por JWT.
- GET usa `fenix_prod_profile_get_server`.
- PATCH actual permite únicamente `display_name` y `zone_code` mediante `fenix_prod_profile_update_server`, con auditoría en `activity_log`.
- Existen wrappers server-only de redes sociales, pero ampliar la Edge Function fue bloqueado por el control de seguridad de la herramienta actual; no se da por aplicado.
- La rama ya incorpora runtime autenticado para consumir `fenix-profile-api`; build gate verde en el commit correspondiente.
- `ProfileShell.tsx` sigue en modo visual de solo lectura: no afirmar edición restaurada mientras no exista commit + build + QA.

## Gaps reales después de reconciliar

1. PARCIAL — Perfil: conectar UI al contrato canónico existente de forma verificable; ampliar redes/objetivos solo tras contrato backend explícito.
2. PLANIFICADO — Inicio/Bancos: Top 3 dinámico basado en operaciones/resultados reales y navegación exacta de "requiere atención hoy" donde falte.
3. PARCIAL — Documento→persona: E2E controlado de PDF digital, escaneado e imagen incrustada; confirmar destino correcto y RBAC de descarga del original.
4. PARCIAL — Modelo laboral canónico: no existen aún campos visibles separados para `tipo_contrato`, `modalidad_contrato`, `fecha_inicio/fin`, `jornada`, `categoria_profesional`, `numero_pagas`; no reutilizar `situacion_laboral` para conceptos distintos.
5. PARCIAL — QA final: browser QA, OLD vs NEW y rollback/promotion evidence antes de merge/promoción.
6. PARCIAL — Ana conversacional 0 €: verificar calidad real sin introducir dependencia obligatoria de IA de pago.

## Regla de continuidad

No usar una matriz histórica como estado operativo si el código o Supabase actuales la contradicen. Revalidar -> documentar diferencia -> conservar capacidad -> trabajar solo el gap real.
