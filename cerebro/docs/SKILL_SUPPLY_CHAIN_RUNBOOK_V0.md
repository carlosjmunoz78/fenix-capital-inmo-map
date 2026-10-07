# CEREBRO OS · Skill Supply Chain · Runbook V0

Estado: HECHO para LAB / PLANIFICADO para PREPROD real
Fecha: 2026-10-07

## Safe loop

1. CONSERVAR: fijar SHA, contratos, owner, evidencia y baseline existente.
2. ENTENDER: resolver upstream exacto, licencia, permisos, solapamiento y dependencias.
3. ENVOLVER: wrapper CEREBRO disabled/fail-closed; no reemplazar sistema existente.
4. PROBAR: static LAB → OLD vs NEW sintético → behavioral LAB → judge → rollback/rebuild → tribunal.
5. MEJORAR: corregir solo el rojo exacto, sin rebajar umbrales ni permisos.
6. MIGRAR: únicamente después de PREPROD real GREEN y revisión humana cuando `HIGH_RISK`.

## Estado congelado

Supabase/Postgres y agent-browser han alcanzado `READY_FOR_PREPROD_PROMOTION_REVIEW` en LAB sintético. Ambos conservan `merge_authorized=false`, `prod_authorized=false` y `autonomous_promotion_authorized=false`.

Para agent-browser el raw `STATIC_LAB_HOLD` permanece intacto; el avance se produce mediante wrapper normalizado interno, sin alterar thresholds.

## Runbook PREPROD siguiente

- Crear scope PREPROD aislado y reversible.
- Revalidar exact HEAD, contrato y licencias/procedencia.
- Ejecutar OLD vs NEW contra la integración PREPROD controlada, nunca contra PROD.
- Activar observabilidad de latencia, errores, policy violations, side effects y coste.
- Ejecutar rollback físico del binding/integración y verificar rebuild disabled por defecto.
- Reejecutar Judge y Tribunal sobre evidencia PREPROD, no reutilizar LAB como sustituto.
- Si GREEN: dejar `READY_FOR_PROMOTION_REVIEW`; por `HIGH_RISK` detenerse para revisión humana antes de cualquier promoción.
- Si RED/HOLD: corregir en rama y repetir; no relajar policy, permisos, seguridad ni coste.

## Fail-closed

Cualquier coste >0 o billing inesperado → `MONEY_LIMIT` y STOP. Cualquier acceso a datos cliente/PROD, write PROD, ejecución de código externo no autorizada o acceso Trading → STOP y tratar como incidente/policy conflict según proceda.

## No hacer

No merge directo. No activar wrappers en PROD. No copiar credenciales. No usar evidencia histórica como si fuese evidencia del nuevo HEAD. No borrar/reemplazar App/CRM/Supabase/Notion/WordPress/SEO/Training/Trading.
