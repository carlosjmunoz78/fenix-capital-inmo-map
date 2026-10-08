# RSI-RECOVERY-010 · PROMOTION READINESS

Estado: PARCIAL · CEREBRO GATES GREEN / LEGACY APP QA DEBT AISLADA
Scope: PR #502 · `cerebro-rsi-recovery-001-20261008`
Coste adicional: 0 EUR
Autoridad PROD: NO

## Objetivo

Resolver la contradicción entre la promoción de una PR exclusivamente CEREBRO/NON-PROD y el workflow legado `PRE-PROD App Build`, actualmente conservado en `main` como `workflow_dispatch` manual y marcado por política como App PRE-PROD cancelada.

La resolución no rebaja gates de CEREBRO, no declara App PRE-PROD GREEN y no autoriza PROD. Separa el riesgo que esta PR sí modifica del debt preexistente de la App que esta PR no modifica.

## Evidencia observada

En el HEAD `64e240c6895c2830fde33b5391e6c1a42bae72a8`, el shadow de promoción ejecutó deliberadamente el cuerpo Browser QA del workflow legado de App. El run `37821160479` terminó con:

- `factory-preprod-shadow`: GREEN.
- `tribunal-shadow`: GREEN.
- `app-preprod-build-shadow`: RED en Browser QA.
- Playwright: 598 tests; 521 passed, 22 skipped, 55 failed.
- Evidencia durable temporal: artifact `rsi-browser-qa-failure-64e240c6895c2830fde33b5391e6c1a42bae72a8`.

El PR diff no contiene `src/**`, `tests/**`, `supabase/**`, `public/**`, `index.html`, `package.json` ni `package-lock.json`. Por tanto la PR RSI no está modificando las superficies funcionales ni los contratos Playwright que fallan.

Además existe al menos una incompatibilidad demostrable ya presente en el base `63e4a02341d8884b4df21c7c2a94562b06844059`: `tests/actionable-notifications-contract.spec.ts` exige el literal `supabase.rpc('fenix_prod_notifications_list_user'`, mientras `src/NotificationsShell.tsx` del mismo base usa el wrapper existente `gatewayRpc('fenix_prod_notifications_list_user', ...)`. Ese fallo no fue introducido por PR #502.

No se afirma que se haya ejecutado el suite completo sobre el base y obtenido exactamente el mismo conjunto de 55 fallos; sí queda probado que la PR no cambia las superficies App/test que originan esos fallos y que al menos un fallo determinista ya existe en el base.

## Decisión de gate aplicable

Para integrar código CEREBRO aditivo y explícitamente NON-PROD en `main`, sin activar App PRE-PROD ni PROD, el shadow de promoción debe exigir sobre el exact HEAD:

1. CEREBRO Factory PREPROD-equivalent GREEN.
2. RSI Recovery gate y contratos CURRENT afectados GREEN.
3. Tribunal independiente GREEN.
4. Diff fail-closed: cero cambios en superficies App, tests App, Supabase, configuración de build/test de App y workflows App/PROD.
5. `npm run build` GREEN sobre exact HEAD para detectar rotura de integración del repositorio.
6. CORS PREPROD smoke existente GREEN.
7. PR mergeable y revisión de estado antes de quitar DRAFT.

El Browser QA legado completo de App NO se transforma artificialmente en GREEN ni se ignora silenciosamente: queda clasificado como debt EXISTENTE fuera del diff de RSI. Su reparación debe hacerse en una línea de trabajo App específica, con inventario, OLD-vs-NEW, PREPROD y rollback, no dentro de la recuperación RSI.

## Límites

- Esto NO reactiva `PRE-PROD App Build`.
- Esto NO declara App PRE-PROD operativa.
- Esto NO autoriza despliegue App.
- Esto NO autoriza RSI/CEREBRO PROD.
- Esto NO modifica `src/**`, `tests/**`, Supabase ni Trading.
- Esto NO permite `continue-on-error` para gates CEREBRO.
- Un cambio futuro de PR #502 sobre superficies App invalida automáticamente esta excepción de alcance y debe volver a exigir el gate App correspondiente.

## Estado

HECHO: causa del atasco identificada y evidencia Browser QA preservada.

EXISTENTE: debt App Browser QA en superficies no modificadas por RSI; al menos un fallo determinista confirmado en el base.

DEFINIDO: gate de integración CEREBRO-only con diff isolation fail-closed + build + CORS + Factory + tribunal.

POR AUDITAR: exact HEAD posterior a esta corrección y todos los jobs del nuevo promotion-readiness shadow.

HOLD: cualquier promoción autónoma a PROD y cualquier reparación masiva de los 55 fallos App dentro de PR #502.

## Rollback

Antes de merge, revertir los commits de RSI-RECOVERY-010 o cerrar PR #502. `main` permanece sin cambios. No borrar la evidencia del run ni reescribir la historia.

## Next

Ejecutar el promotion-readiness shadow corregido sobre el exact HEAD. Si queda GREEN, reconciliar el resto de checks del HEAD y mantener PROD en HOLD.