# CEREBRO Skill Wrapper Scaffold V1

## Objetivo

FACT-001 puede convertir metadatos gobernados de una skill candidata en un **scaffold CEREBRO reproducible, versionado y fail-closed**. El scaffold acelera la adaptación de skills sin copiar ni ejecutar código externo y sin conceder autoridad operativa por el mero hecho de generar archivos.

La generación de un scaffold **no significa que la habilidad esté implementada ni promocionada**. El resultado inicial es siempre `SCAFFOLD_ONLY_PREPROD`, `operational=false` y el wrapper generado falla de forma explícita hasta que exista una implementación CEREBRO real y haya superado todos los gates.

## Flujo

**SKILL CANDIDATA → METADATOS / LICENCIA / PIN / BINDINGS / COSTE → FAIL-CLOSED GATE → SCAFFOLD PREPROD → IMPLEMENTACIÓN INTERNA CEREBRO → TESTS → OLD vs NEW → EVA-001 → JDG-001 → OBSERVABILIDAD / COSTE / BACKUP / ROLLBACK / REBUILD → CANARY → PROMOCIÓN GRADUAL O RECHAZO**

Si la mejora se promociona, esa versión pasa a ser el nuevo baseline y hereda automáticamente el **Skill Evolution Loop**:

**BASELINE → OBSERVAR → APRENDER → BUSCAR MEJORA → CREAR CANDIDATO → COMPARAR → PROMOVER/RECHAZAR → REPETIR**.

## Entrada mínima obligatoria

Para el camino automático V1 se exige:

- `candidate_id` estable;
- `technical_name`;
- `source_locator` con procedencia gobernada;
- `source_license`;
- `pinned_sha` inmutable;
- `target_engine_bindings` gobernados;
- coste adicional compatible con presupuesto automático de 0 €.

No se inventan metadatos ausentes ni se reutiliza silenciosamente un SHA interno como si fuese el pin de la fuente externa.

## Licencias

V1 automatiza únicamente una allowlist conservadora de licencias permisivas conocidas: MIT, Apache-2.0, BSD-2-Clause, BSD-3-Clause e ISC.

Una licencia ausente o fuera de esa allowlist **no significa rechazo definitivo de la skill**. Significa que el camino automático se detiene con `LEGAL_REQUIRED` hasta que exista una decisión gobernada. El sistema no copia código externo en ningún caso dentro de este flujo.

## Autoridad

El scaffold V1 no autoriza:

- ejecución de código externo de la skill;
- instalación automática de dependencias;
- escritura o mutación directa en PROD;
- efectos externos;
- ampliación automática de permisos;
- uso de datos de clientes;
- acceso a Trading;
- gasto;
- coste adicional superior a 0 €.

Una skill que solicite cualquiera de estas capacidades queda bloqueada en este camino. Trading permanece aislado y nunca hereda autoridad por asociación con una skill.

## Qué genera FACT-001

Cuando los metadatos pasan el gate, FACT-001 genera un bundle determinista con siete artefactos base:

1. manifest PREPROD de la skill;
2. wrapper scaffold CEREBRO fail-closed;
3. test mínimo que demuestra que el scaffold todavía no es operativo;
4. entrada candidata de registro, sin autorización de promoción;
5. contrato de evaluación OLD vs NEW;
6. contrato de recuperación: backup, rollback y rebuild;
7. documentación de procedencia, implementación y evolución continua.

El manifest conserva `company_id`, `engine_id`, `environment` y `version`, además de fuente, licencia, pin y bindings.

## Implementación semántica

El scaffold no intenta adivinar la lógica de la habilidad a partir de metadatos. Después de generarlo, la implementación debe construirse con evidencia gobernada y utilizando, cuando corresponda, `createGovernedInternalWrapper` del runtime existente.

La implementación debe ser CEREBRO-owned y puede aprender del conocimiento licenciado de la fuente, pero no ejecutar código externo en bruto. Sus tareas reales deben definirse explícitamente, con inputs y outputs verificables.

## Promoción

Generar el scaffold nunca actualiza `skill-operational-wrapper-registry-v1.json` como una capacidad operativa. La entrada candidata permanece fuera del registro operativo hasta que se demuestre:

- comportamiento correcto;
- ganancia medible frente al baseline cuando exista;
- ausencia de regresiones;
- permisos adecuados;
- evaluación independiente;
- tribunal verde;
- observabilidad;
- coste medido;
- backup;
- rollback probado;
- rebuild probado;
- PREPROD;
- promoción gradual.

Si NEW es peor o incierto, se conserva OLD y LRN-001 registra el aprendizaje.

## Integración con mejora continua

Toda skill generada por este scaffold hereda la política de mejora continua desde su creación. Si finalmente se promociona, debe seguir buscando de forma permanente:

- `UPSTREAM_UPDATE`;
- `INTERNAL_HARDENING`;
- `COMPOSITE_AUGMENTATION`;
- `DERIVED_SKILL`;
- `REPLACEMENT_CANDIDATE`.

Por tanto, el scaffold no solo automatiza la entrada de nuevas habilidades: también es la vía reutilizable para fabricar **las siguientes generaciones de una habilidad existente** cuando LRN-001 o RSH-001 detectan una oportunidad de mejora.

## Reutilización de motores existentes

Este bloque no crea un segundo plano de control. Reutiliza:

- `FACT-001` para fabricación;
- `LRN-001` para aprendizaje;
- `RSH-001` para scouting e investigación;
- `EVA-001` para evaluación;
- `JDG-001` para tribunal;
- los motores existentes de QA, observabilidad, FinOps, backup, rollback y rebuild.

Regla: **CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR**.

## Artefactos V1

- Política: `cerebro/governance/skill-wrapper-scaffold-policy.v1.json`.
- Generador: `cerebro/runtime/skill-wrappers/governed-wrapper-scaffold-v1.mjs`.
- Tests: `cerebro/tests/skill-wrapper-scaffold-v1.test.mjs`.
- CI: `.github/workflows/cerebro-skill-wrapper-scaffold-v1.yml`.
- Fábrica operacional reutilizada: `cerebro/runtime/skill-wrappers/governed-wrapper-factory-v1.mjs`.
- Evolución continua: `cerebro/governance/skill-continuous-improvement-policy.v1.json`.

## Estado V1

V1 automatiza de forma segura la creación del scaffold y de los contratos de promoción. **No implementa automáticamente la semántica de cualquier skill ni la convierte en capacidad PROD**. El siguiente nivel de automatización es el orquestador por lotes que tome candidatos/revisiones, genere scaffolds seguros, priorice implementación y lance los gates sin ampliar autoridad.
