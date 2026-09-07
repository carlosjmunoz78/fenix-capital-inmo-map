# FACT-001 Changelog

## 0.1.0 · 2026-09-07
- Rama aislada creada desde `preprod-app-phase1`.
- Añadido schema canónico de motor.
- Añadida plantilla de manifest.
- Creado Engine Registry inicial con FACT-001 y APP-001.
- Registrado APP-001 como specimen auditado, sin modificar la App real.
- Añadido mapa inicial de dependencias basado en auditoría viva.
- Añadido validador determinista sin dependencias externas.
- Añadidos tests y workflow CI exclusivo de FACT-001.
- Abierto PR draft contra PREPROD; no autorizado para merge/promoción a PROD.

## Reglas de continuidad
- No fusionar hasta que CI esté verde y se cierre el caller inventory crítico.
- No modificar contratos, RLS, Edge Functions o comportamiento PROD desde esta rama.
- Toda ampliación debe actualizar Registry, dependency map y este changelog.