# CEREBRO OS · SOCIAL NETWORK × BUSINESS FAMILY AUTHORITY CANON V1

**Fecha:** 2026-10-22  
**Estado:** DEFINIDO / CANÓNICO / PREPROD-ONLY  
**engine_id:** FACT-001  
**company_id:** GLOBAL  
**version:** 1.0.0

## 1. Regla canónica

Cada combinación material de **RED SOCIAL × FAMILIA DE NEGOCIO** constituye una unidad operativa lógica independiente.

Ejemplos:

- Facebook × Financial/Real-Estate.
- Instagram × Financial/Real-Estate.
- LinkedIn × Financial/Real-Estate.
- Facebook × Tech Products/AI.
- Instagram × Tech Products/AI.
- LinkedIn × Tech Products/AI.

Cada una debe tener, como mínimo:

`TEAM + ORCHESTRATOR + SUPERVISOR + TRIBUNAL`

No es válido sustituir esas cuatro identidades por un único “equipo social”, “supervisor social” o “tribunal social” genérico.

## 2. Qué puede compartirse

Para evitar multiplicar servidores y costes, las unidades pueden compartir de forma segura:

- runtime SOC-001;
- workers;
- event bus;
- observabilidad física;
- almacenamiento común cuando exista aislamiento lógico suficiente;
- scouts compartidos;
- tooling seguro;
- investigación deduplicada;
- patrones generalizables ya validados.

Compartir infraestructura **no implica compartir autoridad**.

## 3. Qué no puede compartirse como autoridad final

No se comparte entre redes/familias:

- certificación de autonomía;
- supervisor final;
- tribunal final;
- permisos de publicación;
- autoridad de gasto;
- claims sectoriales;
- políticas específicas de plataforma;
- conocimiento privado de empresa;
- credenciales;
- evidencia OLD vs NEW;
- rollback de otra unidad como si fuera propio.

## 4. Capa social corporativa o de empresa

Puede existir una capa superior para ver todas las redes de una empresa y coordinar campañas cross-network.

Puede:

- consolidar reporting;
- coordinar campañas entre redes;
- deduplicar investigación;
- compartir patrones generalizables;
- enrutar oportunidades comerciales detectadas en varias redes;
- priorizar trabajo entre unidades.

No puede:

- reemplazar el equipo especializado de la unidad;
- reemplazar su Orchestrator;
- reemplazar su Supervisor;
- reemplazar su Tribunal;
- publicar saltándose el gate de la unidad;
- certificar autonomía de la unidad;
- heredar automáticamente un GREEN de otra red o familia.

## 5. Tribunal dedicado

Cada `NETWORK × BUSINESS_FAMILY` tiene tribunal independiente del Orchestrator y del Supervisor.

Debe juzgar con evidencia específica de esa unidad:

- autonomía;
- políticas materiales;
- nuevas capacidades de alto impacto;
- permisos de gasto;
- promoción a PROD;
- cambios del Supervisor;
- certificaciones BEST_AVAILABLE que afecten autoridad/autonomía.

El tribunal puede reutilizar jueces lógicos comunes —QUALITY, PERFORMANCE, RISK, COMPLIANCE, COST, LEARNING— pero sus expedientes, contexto y veredicto pertenecen exclusivamente a la unidad evaluada.

## 6. Factory First

FACT-001, al crear una nueva combinación RED × FAMILIA, debe generar automáticamente:

- manifest;
- team contract;
- roles/agentes/subagentes;
- Orchestrator binding;
- Supervisor contract;
- Tribunal contract;
- knowledge namespace;
- learning namespace;
- evaluation namespace;
- autonomy ledger;
- observability scope;
- cost scope;
- backup;
- rollback;
- rebuild.

## 7. Empresa, marca, territorio y campaña

Una empresa no sustituye la unidad.

Se instancia como overlay:

`NETWORK × BUSINESS_FAMILY + COMPANY + BRAND + TERRITORY + PERSONA + CAMPAIGN`

Ejemplo:

`FACEBOOK × FINANCIAL_REAL_ESTATE + FENIX_CAPITAL + CÓRDOBA + FUENSANTA + FIRST_HOME_LOW_SAVINGS`

El mismo equipo lógico y autoridades especializadas pueden servir varias empresas compatibles sin mezclar datos privados ni certificaciones.

## 8. Regla de aprendizaje cruzado

Se pueden compartir patrones generalizados y conocimiento profesional validado.

No se comparten automáticamente:

- certificaciones;
- permisos;
- datos privados;
- credenciales;
- autoridad;
- conclusiones de performance que dependan de una empresa/territorio concreto.

La unidad receptora debe validar cualquier conocimiento transferido dentro de su propio contexto.

## 9. Estado físico de referencia actual

La primera implementación física es:

`UNIT-FB-FINANCIAL-REAL-ESTATE-V1`

con:

- `TEAM-FB-FINANCIAL-REAL-ESTATE-V1`;
- `FB-00` como Orchestrator binding;
- `SUP-FB-FINANCIAL-REAL-ESTATE-V1`;
- `TRIBUNAL-FB-FINANCIAL-REAL-ESTATE-V1`.

Esta implementación permanece PREPROD y no implica autorización PROD.

## 10. Regla final

**Una red no certifica a otra. Una familia no certifica a otra. Una capa social corporativa coordina, pero no sustituye la autoridad especializada de cada RED × FAMILIA.**

`TEAM → ORCHESTRATOR → SUPERVISOR → TRIBUNAL → EXECUTION/AUTONOMY`
