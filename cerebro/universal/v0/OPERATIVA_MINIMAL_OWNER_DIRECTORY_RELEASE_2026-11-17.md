# OPERATIVA · Directorio aislado, release mínimo

ESTADO: CANDIDATA DRAFT, PROD_PROMOTION=HOLD.
Baseline PROD: a51dd14eac11f02424dce5db426346b041c1824f; deployment dpl_6n6KMNTWNEqpUUDBwn3V4UccXjPJ.
Origen del catálogo: PR #66 SHA 60d84f90117725ce1cab46261151d95ea577caf7; cuatro archivos JSON fijados mediante SHA.
Solo directorio GET, filtros, fichas y motores documentados. La API valida actor CARLOS-ADMIN y company_id=fenix.
No modifica App.tsx, supabase.ts, ConsoleHost, App/CRM, permisos, Supabase, DNS, motores reales, Trading ni Cloudflare.
2506 registros indexados son perfiles lógicos, NO agentes en ejecución verificados.

GATES: build y tests, E2E propietario en stage aislado, OLD vs NEW, rollback probado en dominio seguro, coste y observabilidad.
Rollback PLANEADO no ejecutado: deployment original conservado y sin aliases movidos.
PROD_PROMOTION=HOLD.
