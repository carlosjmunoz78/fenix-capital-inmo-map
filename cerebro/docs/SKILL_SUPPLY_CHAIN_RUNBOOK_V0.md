# CEREBRO OS · Skill Supply Chain · Runbook V0

Estado: HECHO LAB + PREPROD + DARK LAUNCH + PROD READ-ONLY CANARY + GITHUB PROD READ-ONLY CANARY
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

GitHub alcanzó `READY_FOR_PREPROD_PROMOTION_REVIEW` en run `37666101006`, head `08d46dd25ee40376bf4f548f4f2f6083c53e93f0`, artifact `11502662046`, usando `google-gemini-api-free` + `gemini-3.5-flash-lite`, 6/6 llamadas, Judge GREEN, rollback GREEN y Tribunal GREEN.

## HECHO · PREPROD

Run `37647914902`, head `86369e0cd0d54c9c205bd39f309804a62b2c59d3`: 18 ejecuciones OLD/NEW/rollback, 2 packages, fixtures sintéticos no cliente, observabilidad/audit/FinOps, coste 0 €, rollback físico GREEN, rebuild `DISABLED`, Judge GREEN y Tribunal `GREEN_FOR_HIGH_RISK_PROMOTION_REVIEW`.

### GitHub candidate · PREPROD aislado

Run `37668271189`, head `feff48e1764474db0aa118af152b23d816edd00d`, artifact `11503718236`, digest `sha256:d6e0fddf4932db4939b78802ee24bd104f1f6775ebe9877657849efdc284130d`.

- 3 fixtures sintéticos no cliente.
- 9 ejecuciones: BASELINE → GITHUB_WRAPPER → ROLLBACK_BASELINE.
- `SharedRuntime` PREPROD real y binding físico temporal.
- Observabilidad 9 / audit 9 / FinOps 9; audit chain válida.
- Tests focalizados 5/5 GREEN.
- Judge `GREEN_FOR_PREPROD_TRIBUNAL`.
- Tribunal `GREEN_FOR_HIGH_RISK_PROD_READONLY_CANARY_REVIEW`.
- Rollback físico GREEN y rebuild final `DISABLED`.
- Coste adicional 0 €.
- Datos PROD/cliente, ejecución de código externo, write PROD, Trading y paid fallback: NO.
- `prod_authorized=false`, `merge_authorized=false`, `autonomous_promotion_authorized=false`.

El primer intento `37667783071` paró fail-closed antes del runtime por una aserción de schema (`merge_authorized` vs `prod_write_authorized`). Se corrigió solo esa comprobación, sin alterar permisos, thresholds ni evidencia LAB.

## HECHO · Dark launch main

PR #486 fue fusionado a `main` en `a9b51ee98cdfbf674a02e9b68b15bbf0e455d19b` tras autorización humana HIGH_RISK. No se disparó despliegue de la App y el runtime smoke PROD posterior quedó GREEN.

## HECHO · PROD read-only canary existente

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

## HECHO · GitHub PROD read-only canary

Autorizado por la instrucción humana permanente de mejora segura y reversible, sin romper lo existente. Run `37670597824`, head `7ee76db7a44b7e3c1153fd3b35365fc2e2ca5554`, artifact `11505096443`, digest `sha256:7837d90b4a12c2b1d61faf9db1ac2c3300fc166a554d8b2e3057098c08acf387`.

- 2 GET reales contra GitHub: metadata del repositorio y ref `main`.
- Repositorio observado: `carlosjmunoz78/fenix-capital-inmo-map`.
- SHA `main` observado: `3304c93b3aceed338fc2bb7d377c4d562d2d18b2`.
- Wrapper `skillwrap:cerebro-github-v0.1.0` ejercitado localmente.
- Tests canary: 4/4 GREEN.
- `prod_authorized=false` preservado en el wrapper.
- GitHub writes, merge, push, mutación de issues/PR y workflow dispatch: NO.
- Datos cliente, credenciales expuestas, código externo de skills, Trading y paid fallback: NO.
- Coste adicional: 0 €.
- Binding temporal restaurado a `DISABLED`.
- Rollback: GREEN.

## Operación normal

Skill Supply Chain V0 puede mantenerse en modo read-only/advisory y seguir incorporando nuevas skills mediante el pipeline completo. GitHub queda elegible para operación read-only/advisory detrás del wrapper CEREBRO. No ejecutar código externo de skills por defecto. No permitir que una skill reemplace policy/routing CEREBRO.

## Gate de expansión

La autorización permanente del usuario cubre mejoras seguras y reversibles que preserven lo existente y superen los gates técnicos. No convierte writes, permisos superiores o side effects en operaciones ordinarias.

Cualquier cambio que añada write PROD/GitHub, merge automático, push, mutación de issues/PR, datos cliente, nuevas credenciales, permisos superiores, ejecución de código externo o acceso Trading requiere `HUMAN_REQUIRED=HIGH_RISK` o el motivo de excepción aplicable; la implementación debe seguir siendo fail-closed y reversible.

## No hacer

No reinterpretar PROD read-only GREEN como autorización de escritura. No copiar credenciales. No borrar/reemplazar App/CRM/Supabase/Notion/WordPress/SEO/Training/Trading. No activar pago como fallback. No ejecutar código externo de la skill GitHub ni usarla para saltarse reviews, branch protection, policy o checks.
