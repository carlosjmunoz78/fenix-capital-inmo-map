# CEREBRO OS · Política de adopción FULL de skills · V1

Fecha: 2026-10-15  
Ámbito: GLOBAL / PREPROD  
Owner lógico: FACT-001 · Fábrica de Motores  
Fuente de verdad operativa: Git + registros versionados de CEREBRO

## Regla ejecutiva

**SKILL ADMITIDA = DEUDA HASTA FULL.**

Una skill que CEREBRO decida conservar no se considera terminada por estar descubierta, catalogada, envuelta o probada una vez. Debe llegar al máximo nivel seguro y útil permitido por sus gates, sin ampliar autoridad ni saltar `HUMAN_REQUIRED`.

`FULL` significa `FULL_SAFE_PREPROD` mientras no exista una promoción posterior expresamente gobernada. Nunca significa escritura en PROD, permisos ilimitados, acceso a Trading, uso de datos de clientes, ejecución directa de código externo, auto-merge o gasto adicional.

## Orden de mayor beneficio

1. **Fábrica inteligente de skills** (`skill-creator`). Primero porque es multiplicadora: mejora la capacidad de fabricar, adaptar y mantener las siguientes skills y refuerza FACTORY FIRST.
2. **Manejo seguro de GitHub** (`github`). Segundo porque mejora el plano de control de ingeniería, auditoría, pruebas y automatización del repositorio.
3. **Optimización y seguridad de bases de datos** (`supabase-postgres-best-practices`). Tercero por impacto transversal en seguridad, fiabilidad y rendimiento de los motores que trabajan con datos, preservando Supabase como core transaccional.
4. **Control avanzado del navegador** (`agent-browser`). Cuarto por gran valor operativo pero mayor superficie física, de UI y permisos; se mantiene detrás de los anteriores hasta resolver sus gates.
5. Las siguientes skills admitidas se ordenarán por **beneficio medido, alcance transversal, reducción de trabajo humano, riesgo, coste 0 € y facilidad de rollback**, no por novedad.

## Flujo obligatorio para cada skill

`DESCUBRIR → VERIFICAR PROCEDENCIA/LICENCIA → ENTENDER → REUTILIZAR/ENVOLVER → RESOLVER MOTORES RELEVANTES → PREPROD SHADOW → OLD vs NEW → TRIBUNAL → ROLLBACK/REBUILD → OBSERVABILIDAD/AUDITORÍA/COSTE → APRENDIZAJE → EVIDENCIA CONTINUA → FULL_SAFE_PREPROD`

No se fuerza una skill sobre todos los motores. Se activa únicamente en los motores cuya vinculación exista en evidencia gobernada y donde `OLD vs NEW` demuestre mejora o paridad necesaria sin regresión.

## Condiciones de FULL_SAFE_PREPROD

Todas deben ser verdaderas:

- procedencia y licencia verdes;
- wrapper interno seguro o ruta de reutilización existente;
- motores relevantes resueltos desde evidencia, no inventados;
- OLD vs NEW PASS para cada binding activado;
- Tribunal PASS;
- cero regresiones aceptadas;
- rollback probado;
- rebuild probado;
- observabilidad conectada;
- auditoría trazable;
- coste medido / FinOps conectado;
- feedback al aprendizaje continuo conectado;
- idempotencia probada;
- coste adicional 0 € o excepción gobernada;
- evidencia continuada cuando el runtime de la capacidad tenga cadencia real.

## Human-by-exception

Nunca se interpreta una orden general de «llevar todo a FULL» como autorización para saltar una excepción humana canónica. Si aparece `LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT` o `CUSTOMER_HUMAN_REQUEST`, el candidato se detiene en ese gate y CEREBRO continúa automáticamente con el siguiente trabajo seguro no bloqueado.

## Política de aliases

Toda comunicación con Carlos debe utilizar primero el alias entendible en español. El nombre técnico/ID se añade solo cuando sea necesario para auditoría, depuración o trazabilidad.

Todo motor, submotor, capacidad o skill nuevo debe nacer con:

- identificador técnico estable;
- `alias_es` entendible;
- descripción breve en español;
- estado real;
- fuente de verdad;
- versión;
- entorno;
- relación con motores/capacidades si existe.

Falta de alias = deuda documental. El alias puede mejorar sin cambiar el ID técnico.

## Trabajo paralelo que no debe detenerse

Mientras una skill espera un gate físico o humano, CEREBRO continúa con otras líneas seguras. En particular:

- **Aprendizaje continuo**: acumular únicamente ejecuciones programadas genuinas hasta cerrar el soak requerido.
- **Vigilancia de competencia**: mantener evidencia GET-only PREPROD con targets reales.
- **Búsqueda de oportunidades**: mantener evidencia PREPROD sobre fuentes públicas gobernadas.
- **CEREBRO en Android**: esperar cable/dispositivo físico autorizado sin bloquear el resto.

## Invariantes no negociables

- `prod_write=false`
- `prod_mutation=false`
- `auto_merge=false`
- `customer_data=false`
- `external_skill_code_execution=false`
- `trading=false`
- `paid_fallback=false`
- `additional_cost_eur=0`
- `permission_expansion=false`
- `autonomous_prod_promotion=false`

## Auditoría

Registro máquina: `cerebro/registry/skill-full-adoption-v1.json`  
Selector de prioridad: `cerebro/skills/skill-full-adoption-selector-v1.mjs`  
Tests: `cerebro/tests/skill-full-adoption-selector-v1.test.mjs`

La cola se debe actualizar cada vez que una skill cambia de estado, se admite una nueva, alcanza FULL, se descarta o queda bloqueada por una excepción humana. Nunca se debe eliminar evidencia histórica para «poner verde» el estado.
