# CEREBRO OS · Dependency Map · Channel Intelligence V1

## Estado

DEFINIDO + IMPLEMENTACIÓN PREPROD EN RAMA AISLADA.

Este mapa documenta cómo la capacidad `CHANNEL-INTELLIGENCE-V1` se apoya en motores y runtimes existentes. No modifica el Registry de 177 motores y no crea un scheduler nuevo.

## Flujo existente reutilizado

```text
SCAN-001
  ├─> KW-001
  ├─> WAUD-001 ───────────────────────────────┐
  ├─> SOCAUD-001 ─> SOCBOOT-001 ─────────────┼─> CHANNEL-INTELLIGENCE-V1 / MKT-001
  └─> LOCALP-001                              │
                                              │
WEB-001 + SEO-001 + KW-001 + MKT-001 ─────────┤
COMPET-001 + MKT-002 + FRC-001 ───────────────┤
OPP-001 + INN-001 ────────────────────────────┤
Digital Build / Multimedia Factory ───────────┤
                                              ↓
                                      WEB OPERATING PROFILE
                                      CHANNEL POD PROFILE(S)
```

`WAUD-001` y `SOCAUD-001` permanecen dentro del fan-out post-scan existente. `SOCBOOT-001` sigue siendo el bootstrap social canónico por empresa. La nueva capacidad consume sus evidencias; no vuelve a implementar esos motores.

## Inteligencia y aprendizaje

```text
observed/public/authorized signal
      ↓
MKT-002 / COMPET-001 / SEO-KW / SOCAUD-001
      ↓
FRC-001
      ↓
Trend Opportunity Score V1
      ↓
OPP-001 / INN-001
      ↓
EXP-001 + LAB-MKT
      ↓
EVA-001 / tribunal / OLD vs NEW
      ↓
LRN-001
      ↓
validated candidate rule / cross-channel insight
```

En V1 el `Trend Opportunity Score` es determinista y no sustituye la evaluación/tribunal. Una señal marcada para LAB no autoriza publicación ni gasto.

## Web Operating Profile

Compone capacidades de:

- `WEB-001`
- `WAUD-001`
- `SEO-001`
- `KW-001`
- `MKT-001`
- `COMPET-001`
- `MKT-002`
- `FRC-001`
- `OPP-001`
- `INN-001`
- `EXP-001`
- `LAB-MKT`
- `LRN-001`
- `EVA-001`
- `SUP-001`

No asume que todos esos motores estén operativos físicamente. La composición declara dependencias/capacidades y mantiene su estado de evidencia individual.

## Channel Pod Profile

Cada `company_id + channel_id` crea una instancia lógica sobre motores compartidos. No crea un servidor ni un nuevo `engine_id`.

Dependencias lógicas principales:

- `MKT-001`
- `SOCAUD-001`
- `SOCBOOT-001`
- `COMPET-001`
- `MKT-002`
- `FRC-001`
- `OPP-001`
- `INN-001`
- `EXP-001`
- `LAB-MKT`
- `LRN-001`
- `EVA-001`
- `SUP-001`

Inicialmente se prueban perfiles de `instagram`, `facebook` y `linkedin`. Una red futura usa el mismo contrato y pasa por `FACT-001` para scaffold de capability/profile, sin ampliar el Registry salvo gap real auditado.

## Publicación y medición social

Topología auditada actual:

```text
SOC-001 / CEREBRO
      ↓
Publisher Gateway
      ↓
BUFFER
      ↓
Facebook / Instagram / LinkedIn
```

Lectura/medición existente:

```text
Facebook / Instagram / LinkedIn
      ↓
Make (rutas ya conectadas de lectura/identidad/métricas)
      ↓
Supabase / Notion / CEREBRO
```

Reglas de dependencia:

- `BUFFER` es el publisher actual evidenciado.
- `MAKE` no es publisher canónico y no debe adquirir autoridad de publicación por reutilizarse como bridge de lectura.
- Buffer se conserva hasta que un adapter sustituto demuestre paridad/superioridad en PREPROD.
- `META_DIRECT` y `LINKEDIN_DIRECT` son candidatos futuros, todavía sin binding de escritura.
- La migración de publisher exige mapa de dependencias, snapshot, E2E, OLD vs NEW, idempotencia, verificación física, rollback y promoción gradual.
- El gateway de esta V1 es fail-closed y no ejecuta publicaciones externas.

## Runtime / jobs / eventos

Se reutilizan:

- `EVT-001` para eventos cuando exista binding autorizado.
- `JOB-001` para jobs/scheduling cuando exista binding autorizado.

V1 no crea un scheduler alternativo y no declara ejecución continua física si `EVT-001/JOB-001` no están enlazados al entorno correspondiente.

## Producción multimedia

Se reutiliza la `Digital Build / Multimedia Factory` existente. `CHANNEL-INTELLIGENCE-V1` puede planificar qué asset/format necesita un POD, pero no instala modelos, llama proveedores, compra servicios ni publica assets en V1.

## Separación durante STAGING → PROD

La promoción actual de la web Fénix Capital es un flujo separado.

```text
WEB MIGRATION / PROMOTION
STAGING -> validación -> PROD estable

CHANNEL INTELLIGENCE V1
rama aislada -> PREPROD -> tests -> evidencia
```

Durante la migración:

- no hay escritura WordPress PROD desde Channel Intelligence;
- no se altera el flujo de despliegue de la web;
- `site_ref` es una referencia opaca, no un permiso de escritura;
- cuando PROD esté estable podrá registrarse una baseline visual como evidencia para futuras comparaciones, mediante gate separado.

## Seguridad y gobierno

Toda promoción futura queda detrás de:

- `POL-001`
- `HEX-001`
- `EVA-001`
- `SUP-001`
- backup/rebuild/rollback
- OLD vs NEW cuando aplique

Cross-company es DENY por defecto. Paid/publish/provider binding están deshabilitados en V1. Trading permanece fuera de alcance y aislado.
