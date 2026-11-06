# CEREBRO OS · CUT34 · EJECUCIÓN ÚNICA SEGURA EN CLOUDFLARE D1

**Estado: LISTO PARA OPERACIÓN EN WORK (NO EJECUTADO REMOTAMENTE).**
**Fecha:** 2026-11-06 · `company_id=fenix` · `engine_id=JARVIS` · `environment=LAB` · `version=CUT34`

## Ámbito inmutable

- Cuenta Cloudflare: `e39a57e1ac42650ca5a6d5307cf0ac8e`.
- SOLO nueva D1: `cerebro-jarvis-cut33-lab-eu-jur`, UUID `968e86d4-617c-4539-adde-541edc9ec215`, jurisdicción EU confirmada físicamente y replicación desactivada.
- SOLO Worker nuevo: `cerebro-jarvis-cut32-lab-eu`. No modificar hasta completar auditoría de migraciones + copia + gates.
- GitHub rama separada `cerebro/jarvis-cut34-d1-isolation-lab-20261106`; PR #25 DRAFT, main y ramas PROD protegidas.
- PROHIBIDO escribir sobre D1 UUID `988b11e1-21aa-4cf9-8b9d-110319df7ccc`, `8f966fb3-32db-43a0-aa55-67f88616a522`, `c446f17c-c26d-4c76-a3ea-f62c843d461b`, `a859fde1-126b-4c40-bc0d-aec2f8839f7b` o `be037644-3da6-4a96-8cb7-9ee3af9ba196`.
- Nunca utilizar una URL pública, Cloudflare Access bypass, `all_workers`, rutas públicas, App/CRM/Supabase/PROD, nueva suscripción ni tokens en logs/chat.

## 1. Preflight no invasivo

1. Confirmar **identidad de cuenta, jurisdicción EU, UUID exacto, 6 D1 existentes, Workers Free**, y ausencia de cobros.
2. Confirmar que la D1 nueva no tiene vinculaciones, tablas de usuario ni datos. El texto "No resources match your filters" NO es suficiente; comprobar mediante SELECT SQL remoto en la base identificada por UUID.
3. Inventariar Worker paralelo, versión y binding actuales. Guardar versión conocida para rollback. Confirmar URLs producción/preview OFF y Access propietario `JARVIS-CUT33-OWNER-ONLY`. Registrar flags OFF.
4. Verificar nueva rama GitHub y ejecutar gate local antes de usar Wrangler:

```bash
node zeus/jarvis/cloudflare-lab/verify-cut34-d1-isolation.mjs --template
node zeus/jarvis/cloudflare-lab/verify-cut34-d1-isolation.mjs --resolved zeus/jarvis/cloudflare-lab/wrangler-b2-parallel.cut34-isolated.staging.lab.jsonc
```

**STOP** si alguna aserción falla. El gate exige exactamente el UUID nuevo y bloquea los cinco UUID anteriores.

## 2. Backup inicial + migración aditiva

Usar sesión Cloudflare del propietario en un runner seguro, sin imprimir ni registrar credenciales, con permisos mínimos y sin GitHub secrets persistentes. El conector Opera de solo lectura NO puede ejecutar esta etapa.

Los comandos deben ejecutarse únicamente con el directorio del repositorio de la rama aislada, después de confirmar que Wrangler está autenticado en la **cuenta correcta** y de que el nombre resuelve exactamente al UUID esperado. No fijar el destino mediante consultas a otra base.

```bash
CFG=zeus/jarvis/cloudflare-lab/wrangler-b2-parallel.cut34-isolated.staging.lab.jsonc
DB=cerebro-jarvis-cut33-lab-eu-jur
SQL=zeus/jarvis/cloudflare-lab/CUT34_ONLY_NEW_EU_D1_0001_0006.sql

# Solo lectura, confirmar cero tablas jarvis_lab_* y ninguna tabla desconocida:
npx --yes wrangler@4.157.0 d1 execute "$DB" --config "$CFG" --remote --command "SELECT type,name FROM sqlite_master WHERE name NOT LIKE 'sqlite_%' ORDER BY type,name"

# Crear archivo local de backup basal, en carpeta no versionada y privada:
mkdir -p .cut34-evidence-private
npx --yes wrangler@4.157.0 d1 export "$DB" --config "$CFG" --remote --output .cut34-evidence-private/before.sql
sha256sum .cut34-evidence-private/before.sql
```

La D1 debe estar vacía; si no lo está, detenerse, preservar el backup y NO aplicar migraciones. Nunca sobrescribir una exportación previa.

**Sólo entonces, con destino y backup confirmados:**

```bash
npx --yes wrangler@4.157.0 d1 execute "$DB" --config "$CFG" --remote --file "$SQL"
```

El fichero `CUT34_ONLY_NEW_EU_D1_0001_0006.sql` concatena sin reescribir las migraciones existentes 0001–0006, todas de CREATE IF NOT EXISTS, sin INSERT, DELETE, ALTER ni DROP; esperado exactamente **8 tablas LAB, 6 índices LAB, 6 triggers LAB**.

```bash
npx --yes wrangler@4.157.0 d1 execute "$DB" --config "$CFG" --remote --command "SELECT type,COUNT(*) AS n FROM sqlite_master WHERE name LIKE 'jarvis_lab_%' AND type IN ('table','index','trigger') GROUP BY type ORDER BY type"
npx --yes wrangler@4.157.0 d1 export "$DB" --config "$CFG" --remote --output .cut34-evidence-private/after.sql
sha256sum .cut34-evidence-private/after.sql
```

Releer que todas las tablas de sesiones, misiones, grants y auditoría tienen **cero filas**. Validar export/post-migración y restauración en SQLite efímera separada, sin usar/restaurar sobre bases Cloudflare protegidas. Un SQL exportado no equivale a rollback de sesiones reales.

## 3. Worker NUEVO / binding D1, solo si paso 2 VERDE

1. Registrar versión activa y configuración actual (viejo binding a fuente EU) para comparación OLD vs NEW y rollback del **Worker paralelo exclusivamente**.
2. Tras validar export y SQL, implementar solo con `wrangler-b2-parallel.cut34-isolated.staging.lab.jsonc` que establece `JARVIS_LAB_DB` al UUID nuevo. No desplegar `wrangler-b2-parallel.staging.lab.jsonc` original ni afectar al Worker antiguo.
3. Verificar **la nueva vinculación física** en Cloudflare Settings por UUID, flags OFF, Access owner-only conservado y URLs públicas/preview OFF. Comparar la versión y contrato anterior con la nueva; ejecutar reversión a versión anterior SOLO del Worker paralelo, probarla y restaurar la versión aislada; no cambiar CUT30.
4. Probar rutas bloqueadas y ninguna escritura, sin permitir todavía B2/B3, enrollment o Gateway. Capturar métricas y coste real.

La ejecución de `wrangler deploy` está deliberadamente separada del SQL: requiere credenciales con alcance exacto, snapshot del Worker y rollback verificable; **no ejecutar automáticamente desde este runbook**.

## 4. Promoción

Mantener PROD NO-GO. No activar identidades ni dos dispositivos hasta verificar secrets de nuevo Worker, B2 con HMAC, revocación independiente y tribunal B10. Cualquier resultado rojo implica OFF y detenerse.

## Evidencia requerida para cerrar CUT34

- Captura/lectura API de jurisdicción EU y UUID nuevo.
- Query previa de base vacía y export basal con SHA256.
- Migraciones 0001–0006 solo sobre nueva UUID; query final 8/6/6, cero filas de usuario, export posterior y restauración local/aislada.
- UUID del binding remoto sustituido sólo en Worker paralelo y rollback funcional del Worker nuevo.
- Acceso propietario sin bypass, URL OFF, CUT30 intacto, PR25 DRAFT, no nuevas suscripciones.
- Estado final por elemento: HECHO / PARCIAL / BLOQUEADO, nunca inferir PROD operativo.
