# CEREBRO UNIVERSAL SKILL ACTIVATION FACTORY V1 · MASTER

Fecha: 2026-10-17
Issue canónica: #780
Branch: `cerebro/universal-skill-activation-factory-v1-20261017`
Estado: IN_PROGRESS
Entorno: LAB/PREPROD
PROD: NO TOCAR
Coste adicional objetivo: 0 EUR

## 1. Objetivo

Convertir la incorporación de skills/repositorios en un proceso industrial y automático. El efecto objetivo para el usuario es equivalente a "pegar una URL y, poco después, CEREBRO sabe usarla", pero con gobierno, pruebas, trazabilidad, OLD vs NEW, rollback y aprendizaje.

Entrada aceptada:

- skill individual,
- repositorio completo,
- capability/package/librería,
- wrapper ya normalizado,
- capacidad interna existente que necesite bindings reales.

Salida obligatoria terminal:

- `FULL_SAFE_PREPROD` / `FULL_REAL` cuando funciona realmente en todos los bindings relevantes permitidos,
- `ABSORBED` cuando CEREBRO ya posee capacidad igual o superior,
- `REJECTED` cuando no aporta, es insegura, incompatible o su licencia no es admisible,
- `BLOCKED_EXTERNAL` cuando falta una condición física/tercero concreta,
- `HUMAN_REQUIRED` solo por uno de los 8 motivos canónicos.

Una skill NO cuenta como integrada por estar descubierta, descargada, catalogada, normalizada, documentada, envuelta o con tests aislados.

## 2. Definición de FULL

Una skill solo cuenta como FULL cuando, para cada binding relevante:

1. existe provenance/licencia válida;
2. existe ruta segura de reuse/wrapper/adaptador;
3. el target engine se resuelve desde evidencia gobernada;
4. hay consumo semántico real por el motor;
5. OLD vs NEW pasa;
6. QA/EVA/Tribunal pasan;
7. no hay regresión;
8. backup, rollback y rebuild están demostrados;
9. observabilidad, auditoría y FinOps quedan conectados;
10. LRN-001 recibe feedback persistente e idempotente;
11. la ejecución es reiniciable y fail-closed;
12. coste adicional es 0 EUR salvo excepción aprobada;
13. existe evidencia física PREPROD cuando la capacidad lo exige;
14. la skill queda invocable por CEREBRO sin intervención humana ordinaria.

## 3. Principios no negociables

- CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR.
- Nunca BORRAR → REHACER → ESPERAR.
- FACTORY FIRST.
- Existing-engine-first: ampliar/reutilizar antes de crear motores nuevos.
- Una skill/capability no equivale a un motor ni a una IA.
- No forzar una skill en todos los motores.
- No ejecutar código externo crudo sin evaluación, aislamiento y autoridad explícita.
- Multiempresa: `company_id`, `engine_id`, `environment`, `version`.
- Trading aislado.
- Supabase no es runtime universal de jobs pesados.
- No tocar PROD en esta fase.

## 4. Arquitectura objetivo

`INGEST → PROVENANCE/LICENSE → CAPABILITY DISCOVERY → DEDUPE/ABSORB → DOMAIN CLASSIFICATION → TARGET ENGINE PLANNER → SAFE ENGINEERING ADAPTER → PARALLEL LAB → SEMANTIC BINDINGS → OLD VS NEW → QA/EVA/TRIBUNAL → LRN/OBS/FINOPS → BACKUP/ROLLBACK/REBUILD → PHYSICAL PREPROD → TERMINAL STATE`

El planner debe resolver `skill/repo → capacidades → dominios → motores relevantes` usando el Registry canónico y señales gobernadas, no tablas hardcodeadas por skill concreta.

## 5. Bootstrap de ingeniería

Antes de generalizar el activador se hará un bootstrap mínimo, no un proyecto separado:

- reutilizar `Safe Engineering Profile V1` ya existente;
- hacerlo invocable por FACT para arqueología de código, generación de wrappers/adapters, tests, debugging y validación;
- preservar límites de permisos, coste y PROD;
- evitar crear un nuevo "agente programador" aislado.

Objetivo: la propia Factory usa la capacidad de ingeniería para acelerar su construcción.

## 6. Generalización del binding real

Referencia actual probada: ruta de binding profundo de skills concretas hacia motores concretos con consumo semántico real, OLD vs NEW, Tribunal, LRN, observabilidad, FinOps y rollback.

Trabajo V1:

- extraer perfiles de skill/candidate del código específico;
- sustituir `EXPECTED_BINDINGS` y tareas hardcodeadas por `ActivationPlan` generado;
- definir familias de contratos semánticos por dominio;
- mantener fail-closed si no existe contrato suficiente;
- permitir N skills × M bindings sin añadir código dedicado por skill;
- emitir receipt por binding y outcome terminal por candidate.

## 7. Paralelismo

Reutilizar Multilane Factory y JOB-001.

- EXPRESS, STANDARD y DEEP.
- FAST_LANE para bajo riesgo/coste 0.
- matrix jobs / workers independientes.
- `fail-fast=false`.
- una skill lenta no bloquea otras.
- HUMAN_REQUIRED aparta solo ese trabajo, no congela la Factory.
- corrección por familia de fallo, no una skill cada vez.

## 8. Capacidades expertas posteriores

Una vez el generalizador esté operativo, la propia Factory incorporará/elevará capacidades transversales:

- Math / Solver / Optimization;
- Systems Engineering;
- Data Engineering;
- Security Engineering;
- nuevas capacidades futuras.

No bloquear Math antes de la Factory. Sí usar Safe Engineering existente como bootstrap.

## 9. Métricas objetivo

Estimación de construcción V1 sobre la base existente: 14–18 horas técnicas. Límite de reevaluación estructural: 20 horas si seguimos necesitando trabajo manual por skill.

SLO posterior orientativo:

- skill sencilla: 1–5 min;
- skill normal: 5–15 min;
- repo mediano: 10–30 min;
- integración compleja: 20–60 min;
- runtime/hardware/credenciales: automático hasta `BLOCKED_EXTERNAL`/`HUMAN_REQUIRED`.

Estos SLO son objetivos, no garantías; deben medirse con evidencia real.

## 10. Comunicación con usuario

No interrumpir cada pocos minutos.

Solo informar por hitos relevantes y de forma muy escueta:

`Estamos haciendo X · hemos conseguido Y · sigue Z.`

No pedir intervención salvo HUMAN_REQUIRED real.

## 11. Continuidad entre chats

Antes de saturación del chat o al cerrar un bloque mayor, crear/actualizar un paquete completo:

- README de traspaso;
- estado máquina/estado de Factory;
- inventario de cambios y SHAs;
- PRs/runs/evidencias;
- decisiones y contratos;
- bloque terminado;
- `next_block` exacto;
- pendientes y riesgos;
- rollback/rebuild;
- prompt exacto para el siguiente chat.

El nuevo chat debe leer evidencias y continuar desde `next_block`; no reconstruir por memoria ni repetir investigación ya cerrada.

## 12. Bloques V1

### B0 · Persistencia y contrato
Estado objetivo: MASTER + STATE + RUNBOOK + HANDOFF + issue canónica.

### B1 · Engineering bootstrap
Estado objetivo: FACT puede invocar Safe Engineering de forma gobernada para generar/adaptar/probar artefactos.

### B2 · Generic Activation Planner
Estado objetivo: candidate/capability → dominios → motores relevantes desde evidencia gobernada.

### B3 · Semantic Contract Families
Estado objetivo: contratos de prueba reutilizables por dominio, no por skill individual.

### B4 · Generic Real Binding Executor
Estado objetivo: N candidates × M bindings, receipts, OLD vs NEW, Tribunal, LRN/OBS/FinOps y rollback/rebuild.

### B5 · Multilane execution
Estado objetivo: lotes concurrentes, FAST_LANE, DEEP no bloqueante, idempotencia y restart.

### B6 · Blind batch certification
Estado objetivo: lote de skills no preparadas específicamente; corrección de fallos de Factory hasta terminalidad.

### B7 · Scale batch
Estado objetivo: lote grande de las 184 y salida terminal trazable por item/binding.

## 13. Estado inicial basado en evidencia viva

- Factory V1 física existe.
- 179 motores canónicos registrados; 177 base preservados + HCI-001/MOTION-001.
- 184/184 items normalizados/reconciliados; NO todos físicamente activos.
- Existe Full Adoption workflow.
- Existe Multilane Skill Factory.
- Existe Safe Engineering Profile.
- Existe JOB-001 durable.
- Existe RSI/LRN continuous evolution loop.
- Existe prueba real de 2 skills con 10 bindings FULL SAFE PREPROD.
- El principal gap es generalizar el último metro desde candidate normalizada hasta bindings reales funcionales sin código específico por skill.

## 14. Regla de éxito

La Factory V1 no se da por terminada porque compile o tenga tests sintéticos. Se termina cuando una entrada nueva no preparada de antemano puede atravesar el circuito automáticamente y quedar FULL/ABSORBED/REJECTED/BLOCKED/HUMAN_REQUIRED con evidencia suficiente, sin integración artesanal individual.
