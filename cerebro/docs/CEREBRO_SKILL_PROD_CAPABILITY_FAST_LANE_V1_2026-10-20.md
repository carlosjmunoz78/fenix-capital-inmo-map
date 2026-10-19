# CEREBRO · SKILL PROD CAPABILITY FAST LANE V1

**Fecha:** 2026-10-20  
**Estado de este documento:** IMPLEMENTADO EN RAMA · PENDIENTE CI + MERGE + VERIFICACIÓN EN MAIN  
**Ámbito:** FACT-001 / Skill Factory / LRN-001 / QA / Evaluation / Tribunal

## 1. Problema corregido

La velocidad real de adopción de skills estaba limitada por varias decisiones históricas conservadoras que, juntas, producían una cola demasiado lenta:

1. El AutoLoop podía procesar una sola candidata segura por ejecución y su cadencia ordinaria era horaria.
2. El chain driver dejaba el siguiente retry seguro para la cadencia normal en vez de agotar trabajo independiente ya preparado.
3. La política `FULL_SAFE_PREPROD` era deliberadamente terminal: una skill podía superar provenance, OLD vs NEW, Tribunal, rollback, rebuild, observabilidad, FinOps, LRN e incluso un canary PROD read-only y seguir sin convertirse en capacidad disponible para motores de producción.
4. La Universal Skill Activation Factory de alta velocidad estaba fuera de `main` en un PR grande, aunque sus gates principales ya eran verdes.
5. Un gate residual comparaba estados históricos exactos y convertía progreso físico seguro más reciente en falso rojo.

Esto provocaba espera artificial incluso cuando el siguiente trabajo era determinista, seguro, reversible y de coste 0 €.

## 2. Corrección estructural ya aplicada antes de esta rama

El PR `#784 · CEREBRO Universal Skill Activation Factory V1` se reconcilió contra evidencia viva, se corrigió el gate residual para validar invariantes de seguridad de forma monotónica y se fusionó en `main` tras pasar los gates exact-head relevantes.

Merge SHA de baseline de esta rama:

`b34678a82be969508c7902d1265f1d690d9b91bc`

La Factory rápida queda así dentro del tronco canónico, manteniendo:

- `prod_authorized=false`;
- `prod_write_authorized=false`;
- `prod_mutation_authorized=false`;
- `trading_access=false`;
- coste adicional `0 €`;
- residuales físicos independientes, sin bloquear frentes seguros no relacionados.

## 3. Cambio de modelo: disponibilidad != autoridad de mutación

Hasta ahora se mezclaban dos conceptos distintos:

- **la skill está suficientemente probada para que un motor PROD pueda consultarla/usar su wrapper interno en modo read-only/advisory**;
- **la skill tiene autoridad propia para escribir o mutar PROD**.

V1 los separa.

Nuevo estado seguro:

`PROD_CAPABILITY_AVAILABLE_READONLY`

Significa exclusivamente:

> Un motor CEREBRO ya gobernado puede resolver el wrapper interno de esa skill para `ADVISE`, `ANALYZE`, `REVIEW`, `PLAN` o `READONLY_OBSERVE`, siempre dentro de sus bindings declarados.

NO significa:

- que la skill pueda escribir PROD;
- que pueda mutar datos;
- que pueda ampliar permisos;
- que pueda ejecutar código upstream externo;
- que pueda acceder a customer data no autorizado;
- que pueda acceder a Trading;
- que pueda gastar dinero;
- que pueda saltarse la política del motor origen.

Toda acción sigue dependiendo del contrato y Policy Engine del motor que la invoca.

## 4. Gate obligatorio

Una candidata solo entra en `PROD_CAPABILITY_AVAILABLE_READONLY` cuando TODAS estas condiciones son verdaderas:

- `FULL_SAFE_PREPROD`;
- canary PROD read-only real GREEN;
- provenance/licencia GREEN;
- wrapper/reuse path interno seguro;
- bindings de motores resueltos;
- OLD vs NEW PASS en cada binding activado;
- Tribunal PASS;
- no regression;
- rollback probado;
- rebuild probado;
- observabilidad conectada;
- audit chain conectada;
- FinOps conectado;
- feedback LRN-001 conectado;
- idempotencia probada;
- coste adicional 0 €;
- `human_required=null`;
- sin PROD write/mutation/customer data/external skill code/Trading/paid fallback/permission expansion.

## 5. Velocidad objetivo

La fast lane es **event-driven**, no un cron horario.

Objetivos V1:

- espera horaria artificial: **0**;
- espera humana cuando no existe excepción canónica: **0**;
- una candidata bloqueada NO bloquea candidatas independientes;
- paralelismo PREPROD inicial: **5 frentes**, ya dentro de la capacidad que la Factory V1 ha demostrado;
- desde que toda la evidencia requerida está persistida en `main` hasta disponibilidad PROD read-only: **objetivo <= 300 s**;
- coste adicional de esta fast lane: **0 €**.

El objetivo de 300 s es un SLA interno de procesamiento una vez disponibles todos los gates; no sustituye ni elimina tests ni evidencia física requerida.

## 6. Estado inicial esperado

La cola canónica actual contiene dos skills con evidencia explícita de canary PROD read-only GREEN además de su cierre FULL_SAFE_PREPROD:

- `skill-creator`;
- `github`.

Por tanto, después de CI + merge + verificación del resolver en `main`, deberían quedar disponibles como `PROD_CAPABILITY_AVAILABLE_READONLY` sin concederles autoridad de escritura.

Las demás skills NO se promueven por similitud ni por deseo de velocidad. Entrarán automáticamente cuando exista su evidencia de canary real y todos los gates sigan verdes.

## 7. Human-by-exception

Solo se frena por:

- `LEGAL_REQUIRED`;
- `SIGNATURE_REQUIRED`;
- `LOW_CONFIDENCE`;
- `HIGH_RISK`;
- `POLICY_CONFLICT`;
- `SECURITY_INCIDENT`;
- `MONEY_LIMIT`;
- `CUSTOMER_HUMAN_REQUEST`.

Un candidato bloqueado se pone en HOLD y la cola continúa con el resto.

## 8. Rollback

Rollback V1:

1. deshabilitar/revertir `skill-prod-capability-fastlane-v1`;
2. los closures `FULL_SAFE_PREPROD` existentes no se modifican;
3. no hay migración destructiva;
4. no se realiza mutación externa de PROD desde esta fast lane;
5. la capacidad vuelve al estado PREPROD anterior sin pérdida de evidencia.

## 9. Criterio de cierre

Este bloque solo se marca HECHO cuando:

1. tests específicos GREEN;
2. full CEREBRO regression GREEN;
3. registry validation GREEN;
4. PR pequeño fusionado en `main`;
5. workflow post-merge GREEN;
6. resolver en `main` confirma las skills elegibles esperadas;
7. las prohibiciones de write/mutation/external code/Trading/spend continúan fail-closed.
