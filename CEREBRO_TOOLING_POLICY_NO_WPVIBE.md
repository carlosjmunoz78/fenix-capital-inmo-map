# CEREBRO OS · Política global de tooling WordPress · NO WPVibe

**Estado:** ACTIVA · OBLIGATORIA
**Ámbito:** CEREBRO OS, Fénix Capital, Fénix Inmobiliaria, PRE-PROD, PROD, handoffs, runbooks, CI/CD, automatizaciones, mantenimiento y futuras empresas conectadas.

## Regla absoluta

**WPVibe NO se usa.**

No se utilizará WPVibe como herramienta operativa, fallback, emergencia, puente temporal, instalador, actualizador, editor, uploader, mantenimiento, despliegue ni dependencia de motores CEREBRO.

Una cuota, reset, disponibilidad, autorización o fallo de WPVibe **nunca puede generar HUMAN_REQUIRED ni bloquear una misión**.

Si una sugerencia automática, asistente, agente, workflow o documento antiguo propone WPVibe, se ignora por incompatibilidad con la arquitectura vigente.

## Camino obligatorio para WordPress

1. Fénix Core Guard y plugins propios CEREBRO/Fénix.
2. Abilities, MCP, REST, jobs, cron, scripts y bridges propios.
3. Funciones nativas de WordPress encapsuladas por controles propios.
4. Si falta una capacidad, se desarrolla en el plugin propio con contrato, permisos, idempotencia, tests, observabilidad, backup y rollback.

WPVibe nunca sustituye una capacidad propia pendiente.

## Continuidad

Todo handoff, prompt maestro, runbook, README y especificación nueva debe incluir como mínimo:

> **WPVibe está prohibido como vía operativa o fallback. Para WordPress se usan los plugins propios CEREBRO/Fénix; si falta una capacidad, se implementa en ellos y se valida en PRE-PROD con backup y rollback.**

## Excepciones HUMAN_REQUIRED

No declarar HUMAN_REQUIRED por WPVibe. Solo: `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT` o `CUSTOMER_HUMAN_REQUEST`.
