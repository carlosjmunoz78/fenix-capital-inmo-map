# CEREBRO · APP/CRM RPC MIGRATION V0 · 2026-09-13

Estado: **PARALELO / NO PROD / NO CUTOVER**.

Objetivo: retirar gradualmente llamadas directas del frontend a RPC `fenix_prod_*` sin romper App/CRM, conservando comportamiento y dejando rollback probado antes de cualquier cambio de privilegios.

Secuencia obligatoria: `CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR`.

## Grupos de trabajo

### OBJ-1 · Inventario exhaustivo de callers
- Detectar llamadas directas `supabase.rpc(...)` en `src/`.
- Clasificar lectura vs mutación.
- No revocar EXECUTE mientras exista al menos un caller directo confirmado.
- Estado inicial: **EN PROGRESO**.

### OBJ-2 · Contratos server-side equivalentes
Para cada caller directo, identificar o crear en rama paralela una ruta Gateway/Edge con identidad resuelta en servidor y contrato equivalente. No desplegar a PROD sin comparación OLD vs NEW y gate correspondiente.

Orden: contactos → expedientes → chat → notificaciones.

### OBJ-3 · Migración frontend paralela
Introducir adaptador/feature gate con OLD como fallback hasta demostrar equivalencia. No eliminar la ruta OLD en el mismo cambio que introduce NEW.

### OBJ-4 · Pruebas OLD vs NEW
Comparar status, shape, permisos, idempotencia, efectos y errores. Mutaciones requieren fixtures controlados y rollback.

### OBJ-5 · Retirada de privilegios
Solo después de evidencia global de ausencia de callers y rollback probado. Los cambios GRANT/REVOKE/RLS son HIGH_RISK y permanecen bloqueados hasta gate explícito.

## Límites
- `main` no se modifica en esta fase.
- App PREPROD continúa cancelada; esta rama es implementación paralela, no reactivación de PREPROD.
- No se despliega Edge Function ni migración DB desde esta rama automáticamente.
- No se sustituyen rutas existentes ni se eliminan RPCs existentes.
- No se exponen secretos.
