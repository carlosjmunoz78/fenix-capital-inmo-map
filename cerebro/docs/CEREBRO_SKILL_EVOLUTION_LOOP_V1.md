# CEREBRO Skill Evolution Loop V1

## Objetivo

Toda habilidad adquirida, adaptada, generada o derivada por CEREBRO entra en un ciclo permanente de mejora gobernada. Incorporar una skill no significa darla por terminada: la versión activa pasa a ser el **baseline estable** desde el que CEREBRO debe buscar una versión mejor.

Esto no autoriza auto-modificación incontrolada. La versión activa de PROD permanece inmutable mientras las mejoras se construyen y prueban como candidatos versionados en PREPROD.

## Regla estructural

**SKILL ADQUIRIDA → BASELINE → OBSERVAR → MEDIR → BUSCAR MEJORA → ADAPTAR / REFORZAR / COMPONER / CREAR → CANDIDATO PREPROD → TESTS → OLD vs NEW → EVALUACIÓN → TRIBUNAL → PROMOVER O RECHAZAR → APRENDER → REPETIR**

La política es heredada por defecto por todas las skills presentes y futuras. Una exclusión requiere una excepción de política gobernada y auditable.

## Qué significa “buscar constantemente mejora”

CEREBRO debe revisar cada habilidad por eventos y también periódicamente, con un intervalo máximo objetivo de 24 horas para generar o renovar su cola de revisión. La revisión debe considerar, como mínimo:

1. **UPSTREAM_UPDATE** — nuevas versiones, correcciones o conocimiento útil en la fuente original.
2. **INTERNAL_HARDENING** — hacer nuestra implementación más segura, fiable, rápida, observable, portable o barata.
3. **COMPOSITE_AUGMENTATION** — combinar la habilidad con otras capacidades para obtener un resultado superior.
4. **DERIVED_SKILL** — crear una habilidad propia nueva cuando la composición o adaptación permita superar al baseline.
5. **REPLACEMENT_CANDIDATE** — proponer una alternativa mejor cuando exista evidencia de que sustituir aporta una ventaja neta.

Las fuentes de mejora incluyen evidencia de uso real, tests y regresiones, aprendizaje de LRN-001, cambios upstream, habilidades complementarias, alternativas open-source/locales y oportunidades de coste, seguridad o rendimiento.

## Cobertura canónica multi-registro

El scout no se limita al registro de wrappers de la última tanda. La política se aplica a la unión deduplicada de los registros gobernados que representan skills realmente incorporadas en distintas fases:

- `cerebro/registry/skill-operational-wrapper-registry-v1.json` → wrappers CEREBRO operativos;
- `cerebro/registry/skill-dynamic-adoption-v1.json` → capacidades dinámicamente adoptadas;
- `cerebro/registry/skill-full-adoption-v1.json` → skills admitidas en FULL_SAFE_PREPROD.

El binding canónico es `cerebro/registry/skill-evolution-policy-binding-v1.json`. Cualquier nuevo registro canónico de skills adquiridas, adaptadas, generadas o derivadas debe añadirse a ese binding para heredar la obligación de mejora. El scout conserva la procedencia de todos los registros y deduplica por `technical_name`, evitando revisar dos veces la misma capacidad sin perder trazabilidad.

## Reutilización de la arquitectura existente

Este loop **no crea un segundo sistema de aprendizaje ni una segunda fábrica**. Especializa para skills los planos ya existentes de CEREBRO y los reutiliza:

- política acumulativa global: `cerebro/registry/cerebro-compounding-evolution-policy.v1.json`;
- aprendizaje y mejora continua existente: `cerebro/registry/native-capability-continuous-improvement-v1.json`;
- aprendizaje: `LRN-001`;
- investigación/scouting: `RSH-001`;
- fábrica: `FACT-001`;
- evaluación: `EVA-001`;
- tribunal: `JDG-001`;
- observabilidad, FinOps, QA, backup, rollback y rebuild: motores gobernados existentes.

La regla es **SPECIALIZE + REUSE, no DUPLICATE CONTROL PLANES**.

## Responsabilidades

**LRN-001** consume evidencia, fallos, resultados de evaluación, promociones y rechazos. Debe convertirlos en gaps, hipótesis y prioridades de mejora y evitar repetir intentos ya descartados sin nueva evidencia.

**RSH-001** busca cambios upstream, alternativas mejores, técnicas complementarias, opciones open-source/locales y evidencia externa útil sin conceder autoridad de ejecución a código externo.

**FACT-001** toma una hipótesis aprobada para experimentación y genera el scaffold del candidato: contratos, permisos, config, tests, evaluación, tribunal, observabilidad, costes, backup, rollback, rebuild, documentación y hooks de training.

La Skill Factory no reemplaza directamente una skill activa. Construye un candidato paralelo.

## Regla OLD vs NEW

Una mejora solo puede promocionarse si demuestra una ganancia medible y no introduce regresiones en seguridad, compatibilidad, calidad, coste, observabilidad, rollback o backup/rebuild. Si el resultado es peor o incierto, se conserva OLD y el intento se registra como aprendizaje.

El baseline anterior debe seguir siendo un objetivo de rollback válido durante la promoción gradual.

## Autoridad y coste

Este ciclo V1 no autoriza:

- escritura o mutación directa en PROD;
- efectos externos;
- ejecución de código externo de una skill;
- instalación automática de dependencias;
- acceso a Trading;
- gasto;
- coste adicional autorizado por encima de 0 €.

Cualquier ampliación de autoridad debe pasar por la gobernanza normal de CEREBRO y nunca se hereda por el mero hecho de que una skill sea útil.

## Bucle de capacidad acumulativa

El efecto buscado es acumulativo:

**MÁS USO → MÁS EVIDENCIA → MÁS APRENDIZAJE → MEJOR SKILL → MEJOR MOTOR → MEJOR CEREBRO → NUEVA EVIDENCIA**.

Una habilidad puede terminar mejorada internamente, ampliada con otra, convertida en una composición, derivada en una capacidad nueva o reemplazada por una alternativa superior. El objetivo no es aumentar el número de skills, sino aumentar capacidad útil, calidad, autonomía y robustez con evidencia.

Cada versión mejorada se convierte en el nuevo baseline únicamente después de pasar los gates. A partir de ahí vuelve a entrar en el mismo ciclo. Por tanto, la mejora no es una tarea puntual: es una propiedad permanente de la habilidad mientras siga activa en CEREBRO.

## Artefactos V1

- Política canónica: `cerebro/governance/skill-continuous-improvement-policy.v1.json`.
- Binding para skills presentes y futuras: `cerebro/registry/skill-evolution-policy-binding-v1.json`.
- Planificador de candidatos: `cerebro/runtime/skill-wrappers/skill-evolution-planner-v1.mjs`.
- Scout/cola de revisión multi-registro: `cerebro/runtime/skill-wrappers/skill-evolution-scout-v1.mjs`.
- Tests de guardrails y cobertura: `cerebro/tests/skill-evolution-loop-v1.test.mjs`.
- Workflow de revisión recurrente: `.github/workflows/cerebro-skill-evolution-loop-v1.yml`.

## Estado V1

V1 crea y prueba la **obligación de mejora**, la cobertura multi-registro, la cola recurrente de revisión y el contrato de candidato seguro. No concede por sí solo capacidad para mutar PROD ni convierte automáticamente una hipótesis en una promoción. La promoción sigue requiriendo el pipeline de tests, evaluación, tribunal, observabilidad y rollback de CEREBRO.
