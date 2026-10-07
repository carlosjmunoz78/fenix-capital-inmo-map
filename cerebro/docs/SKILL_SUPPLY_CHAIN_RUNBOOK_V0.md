# CEREBRO OS · Skill Supply Chain · Runbook V0

Estado: HECHO LAB + PREPROD + DARK LAUNCH + PROD READ-ONLY CANARY
Fecha: 2026-10-07

## Safe loop

1. CONSERVAR: fijar SHA, contratos, owner, evidencia y baseline existente.
2. ENTENDER: resolver upstream exacto, licencia, permisos, solapamiento y dependencias.
3. ENVOLVER: wrapper CEREBRO disabled/fail-closed; no reemplazar sistema existente.
4. PROBAR: static LAB → OLD vs NEW → behavioral LAB → PREPROD runtime → judge → rollback/rebuild → tribunal → dark launch → PROD read-only canary.
5. MEJORAR: corregir solo el rojo exacto, sin rebajar umbrales ni permisos.
6. MIGRAR: gradual, reversible y únicamente dentro del alcance autorizado.

## HECHO · LAB

Supabase/Postgres y agent-browser alcanzaron `READY_FOR_PREPROD_PROMOTION_REVIEW`. agent-browser conserva intacto su raw `STATIC_LAB_HOLD`; el avance usa wrapper normalizado interno sin alterar thresholds.

## HECHO · PREPROD

Run `37647914902`, head `86369e0cd0d54c9c205bd39f309804a62b2c59d3`: 18 ejecuciones OLD/NEW/rollback, 2 packages, fixtures sintéticos no cliente, observabilidad/audit/FinOps, coste 0 €, rollback físico GREEN, rebuild `DISABLED`, Judge GREEN y Tribunal `GREEN_FOR_HIGH_RISK_PROMOTION_REVIEW`.

## HECHO · Dark launch main

PR #486 fue fusionado a `main` en `a9b51ee98cdfbf674a02e9b68b15bbf0e455d19b` tras autorización humana HIGH_RISK. No se disparó despliegue de la App y el runtime smoke PROD posterior quedó GREEN.

## HECHO · PROD read-only canary

Run `37662400743`, head `c84efac4b014aab873d4f484207cbce564792030`, artifact `11500917864`, digest `sha256:90f4f554e7e18fcb2ad22094956d5f5dfa3e0c8cad088c6efaf4cde9f2f0eecf`.

- 2 GET reales: App pública y health del Gateway PROD.
- Ambos HTTP 200.
- Gateway: `env=PROD`, `service=fenix-app-gateway`.
- Wrappers Supabase/Postgres y agent-browser ejercitados localmente.
- `prod_authorized=false` preservado en wrappers.
- PROD writes, customer data, external skill code, Trading y paid fallback: NO.
- Coste adicional: 0 €.
- Binding temporal restaurado a `DISABLED`.
- Rollback: GREEN.

## Operación normal

Skill Supply Chain V0 puede mantenerse en modo read-only/advisory y seguir incorporando nuevas skills mediante el pipeline completo. No ejecutar código externo de skills por defecto. No permitir que una skill reemplace policy/routing CEREBRO.

## Gate de expansión

Cualquier cambio que añada write PROD, side effects, datos cliente, credenciales nuevas, permisos superiores, ejecución de código externo o acceso Trading requiere un nuevo gate `HUMAN_REQUIRED=HIGH_RISK` o el motivo de excepción aplicable.

## No hacer

No reinterpretar PROD read-only GREEN como autorización de escritura. No copiar credenciales. No borrar/reemplazar App/CRM/Supabase/Notion/WordPress/SEO/Training/Trading. No activar pago como fallback.
