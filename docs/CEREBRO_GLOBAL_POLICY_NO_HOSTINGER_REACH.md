# CEREBRO OS · Política global · NO HOSTINGER REACH

**Estado:** ACTIVA · OBLIGATORIA

Hostinger Reach queda fuera de CEREBRO OS y de Fénix.

## Regla

- No usar Hostinger Reach para formularios, captación, newsletters, emails, automatizaciones, scheduling, journeys, CRM ni fallback.
- El plugin `hostinger-reach/hostinger-reach.php` se clasifica como **DENY / RETIRAR**.
- No actualizar, renovar, ampliar ni reintroducir Reach.
- Captura/consentimiento: plugins propios CEREBRO/Fénix, especialmente Fénix CEREBRO Leads.
- Newsletter: Brevo Free mientras mantenga contrato, consentimiento y coste 0 €.

## Retirada

Inventario de dependencias → backup binario + checksum → desactivación PREPROD → smoke/E2E de formularios y leads → eliminación → verificación → rollback disponible.

La retirada técnica del plugin no equivale a cancelación económica. Debe verificarse también que en la cuenta/billing de Hostinger Reach no exista renovación ni cargo futuro.

## Alcance

Esta política afecta **solo a Hostinger Reach**. No autoriza cancelar hosting web, dominios, DNS ni Business Email de Hostinger que sigan teniendo dependencias operativas.

Todo handoff, runbook, Engine Registry, FinOps, onboarding multiempresa y nueva automatización debe heredar esta regla.
