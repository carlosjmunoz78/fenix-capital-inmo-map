# CEREBRO OS · Skill Supply Chain · Runbook V0

Estado: HECHO LAB + PREPROD + PROD READ-ONLY + GITHUB READ-ONLY ADVISORY + MONITOR/RECHECK
Fecha: 2026-10-07

## Safe loop

1. CONSERVAR: fijar SHA, contratos, owner, evidencia y baseline existente.
2. ENTENDER: resolver upstream exacto, licencia, permisos, solapamiento y dependencias.
3. ENVOLVER: wrapper CEREBRO disabled/fail-closed; no reemplazar sistema existente.
4. PROBAR: static LAB → OLD vs NEW → behavioral LAB → PREPROD runtime → judge → rollback/rebuild → tribunal → dark launch → PROD read-only canary.
5. MEJORAR: corregir solo el rojo exacto, sin rebajar umbrales ni permisos.
6. MIGRAR: gradual, reversible y únicamente dentro del alcance autorizado.
7. MONITORIZAR: revalidar contrato + evidencia viva mínima; si aparece rojo, fail-closed y volver al gate correspondiente.

## HECHO · LAB

Supabase/Postgres y agent-browser alcanzaron `READY_FOR_PREPROD_PROMOTION_REVIEW`. agent-browser conserva intacto su raw `STATIC_LAB_HOLD`; el avance usa wrapper normalizado interno sin alterar thresholds.

GitHub alcanzó `READY_FOR_PREPROD_PROMOTION_REVIEW` en run `37666101006`, head `08d46dd25ee40376bf4f548f4f2f6083c53e93f0`, artifact `11502662046`, usando `google-gemini-api-free` + `gemini-3.5-flash-lite`, 6/6 llamadas, Judge GREEN, rollback GREEN y Tribunal GREEN.

## HECHO · PREPROD

Run genérico `37647914902`, head `86369e0cd0d54c9c205bd39f309804a62b2c59d3`: 18 ejecuciones OLD/NEW/rollback, 2 packages, fixtures sintéticos no cliente, observabilidad/audit/FinOps, coste 0 €, rollback físico GREEN, rebuild `DISABLED`, Judge GREEN y Tribunal `GREEN_FOR_HIGH_RISK_PROMOTION_REVIEW`.

GitHub PREPROD: run `37668271189`, head `feff48e1764474db0aa118af152b23d816edd00d`, artifact `11503718236`, digest `sha256:d6e0fddf4932db4939b78802ee24bd104f1f6775ebe9877657849efdc284130d`; 9 ejecuciones, 5/5 tests, observabilidad/audit/FinOps 9/9/9, rollback físico GREEN, rebuild `DISABLED`, Judge y Tribunal GREEN. Sin datos PROD/cliente, código externo, write PROD, Trading ni paid fallback.

## HECHO · PROD read-only

Canary genérico: run `37662400743`, artifact `11500917864`, 2 GET reales sobre App pública + Gateway health, coste 0 €, binding final `DISABLED`.

GitHub canary: run `37670597824`, artifact `11505096443`, digest `sha256:7837d90b4a12c2b1d61faf9db1ac2c3300fc166a554d8b2e3057098c08acf387`; 2 GET a metadata repo + ref `main`; 4/4 tests; no writes/merge/push/mutaciones/workflow dispatch; coste 0 €; binding `DISABLED`.

## HECHO · Promoción GitHub read-only/advisory

PR #488 → `main` `257ba1b9f6d757866a67240c64c7300b6c5de223`.

Post-merge obligatorio:

- Supply Chain Gate `37671631421`: SUCCESS.
- PROD Runtime Smoke `37671631622`: SUCCESS.
- PROD Live Deploy `37671631338`: SKIPPED, App no redesplegada.
- Discovery Scout `37671631072`: SUCCESS; artifact `11505407332`, digest `sha256:a0c83328273ce7d7598c34b88487e8dadc781bb3908b28821ab8564d32f3e8cd`.

## HECHO · Monitor/recheck GitHub read-only

Workflow paralelo `CEREBRO Skill GitHub Read-only Monitor`.

Triggers previstos al quedar en `main`: schedule diario `47 4 * * *`, `workflow_dispatch` y cambios acotados de workflow/runtime/Registry/Contract. Permisos GitHub: `contents: read` únicamente.

Cada iteración debe:

1. revalidar Registry + Contract fail-closed;
2. comprobar tests del runtime read-only;
3. ejecutar exactamente 2 GET contra las superficies permitidas;
4. exigir GitHub write/merge/push/mutación/dispatch = false;
5. exigir customer data/external skill code/Trading/paid fallback = false;
6. exigir coste adicional = 0 €;
7. restaurar binding a `DISABLED` incluso ante error;
8. subir artifact inmutable; si cualquier aserción falla, finalizar HOLD/FAIL-CLOSED sin ampliar permisos.

Primer monitor GREEN: run `37679202506`, head `0a128fac3df39120d1d7f9fcda30857c18694969`, artifact `11508121977`, digest `sha256:0f7fa772e09434acabcf9180ac5eab7a9b640f68bfc2c27f07c0da4cb5b04672`. 4/4 tests, 2 GET, `main` observado `257ba1b9f6d757866a67240c64c7300b6c5de223`, coste 0 €, rollback GREEN, binding final `DISABLED`.

## Operación normal

Skill Supply Chain V0 puede mantenerse en modo read-only/advisory y seguir descubriendo/evaluando nuevas skills mediante el pipeline completo. El monitor no es autorización de ejecución externa ni de escritura.

El siguiente candidato debe elegirse exclusivamente desde evidencia del Discovery Scout y recorrer de nuevo los gates desde DISCOVER; ningún GREEN previo se hereda entre candidatos.

## Gate de expansión

La autorización permanente del usuario cubre mejoras seguras y reversibles que preserven lo existente y superen gates técnicos. Cualquier cambio que añada write PROD/GitHub, merge automático, push, mutación de issues/PR, datos cliente, nuevas credenciales, permisos superiores, ejecución de código externo o Trading requiere `HUMAN_REQUIRED=HIGH_RISK` o el motivo de excepción aplicable.

## No hacer

No reinterpretar monitor/read-only GREEN como autorización de escritura. No copiar credenciales. No borrar/reemplazar App/CRM/Supabase/Notion/WordPress/SEO/Training/Trading. No activar pago como fallback. No ejecutar código externo de una skill por inferencia. No saltarse reviews, branch protection, policy o checks.
