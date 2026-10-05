# CEREBRO OS · Skill Supply Chain V0

Estado: DEFINED / PREPROD_CANDIDATE
Fecha: 2026-10-06
Coste adicional objetivo: 0 €
PROD writes: NO
Nuevo engine_id: NO

## 1. Hallazgo de solapamiento

La capacidad no parte de cero. Ya existen candidatos y piezas previas que deben conservarse y reconciliarse, no rehacerse:

- PR #175 · Digital Build + Tech Scout overlap audit.
- PR #176 · catálogo versionado de capabilities/templates/skills bajo FACT-001.
- PR #177 · Digital Build Orchestrator PLAN_ONLY.
- PR #201 · Technology Scout V0 con scoring determinista, evidencia, licencia, coste, seguridad y reversibilidad.
- PR #241 · Capability Guard V0.
- PR #263 · IAM-001 Policy Runtime V0.
- PR #416 · RSI Continuous Improvement + Meta-Learning loop A–M, todavía sin merge a PROD.
- Runtime principal ya contiene persistencia, observabilidad, auditoría y FinOps en `main`.

Conclusión: no se crea un motor nuevo. `cap:skill-supply-chain` es una capability transversal coordinada por FACT-001 y consumida por los motores existentes.

## 2. Objetivo

Mantener un catálogo vivo de skills/capabilities externas e internas y convertirlo en una cadena segura de suministro de capacidades para todo CEREBRO, todas las empresas y todos los motores.

Debe funcionar de forma continua sin alterar automáticamente capacidades que ya funcionan.

## 3. Flujo canónico

DISCOVER
→ RESOLVE_UPSTREAM
→ LICENSE_GATE
→ SECURITY_GATE
→ DEDUP/OVERLAP
→ NORMALIZE
→ QUARANTINE
→ LAB
→ TEST
→ EVALUATE
→ TRIBUNAL
→ PREPROD
→ OLD_VS_NEW
→ ROLLBACK_PROOF
→ CANARY cuando aplique
→ PROMOTE
→ MONITOR
→ LEARN
→ RECHECK

Ningún marketplace se considera upstream confiable por defecto.

## 4. Fuentes iniciales

- LobeHub: descubrimiento solamente; resolver repositorio original.
- MCPServers Agent Skills: directorio de descubrimiento; resolver upstream y licencia.
- FragRoger: referencia funcional hasta confirmar licencia compatible con uso/adaptación empresarial.
- GitHub: resolución del upstream, commit, licencia, mantenimiento y procedencia.

Technology Scout podrá añadir fuentes nuevas sin convertirlas en autoridad automática.

## 5. Transversalidad

Bindings funcionales:

- FACT-001: normaliza/fabrica wrappers, adapters y skills propias cuando exista gap real.
- INT-001: inventario vivo de capacidades, dependencias, owners y health.
- RSH-001/INN-001/OPP-001/OBS-001: descubrimiento, investigación, novedad y obsolescencia.
- SEC-001/SEC-002/IAM-001/POL-001: seguridad, secretos, identidad, permisos y policy.
- QA-001/REG-001/EVA-001/JDG-001: tests, regresión, evaluación y tribunal.
- FINOPS-001/FREE-001: coste, cuotas y ruta 0 €.
- ORCH-001/ROUTE-001: selección/composición en tiempo de ejecución.
- LRN-001/UPD-001/SUP-001: resultados, actualización, supervisión y mejora continua.
- RSI loop: propone mejoras del propio proceso, pero nunca se autopromueve ni eleva permisos/presupuesto.

## 6. Funcionamiento continuo

### Event-driven
Revisar cuando aparezca un gap de capacidad, fallo repetido, nueva empresa, nueva capability, release upstream o aviso de seguridad.

### Diario
Descubrir cambios, resolver upstream, poner candidatos nuevos en cuarentena y detectar versiones nuevas.

### Semanal
Recalcular score de skills disponibles, analizar fallos/fallbacks y benchmarkear candidatos de alto valor.

### Mensual
Revisar obsolescencia, licencia, dependencias, coste y necesidad de sustitución.

La frecuencia es contrato objetivo. La activación de schedules cloud solo se promoverá cuando el runtime y los gates estén verificados; V0 no introduce un daemon ni servidor nuevo.

## 7. Reglas de aprendizaje

- No aprender de estrellas/popularidad como señal suficiente.
- Aprender de resultados verificados: calidad, tasa de éxito, latencia, coste, fallos, seguridad y reversibilidad.
- Cada decisión de selección debe conservar evidencia y versión.
- Una skill que empeora puede degradarse o retirarse sin borrar su historial.
- Un fallo de una skill no autoriza a cambiar políticas, permisos ni contratos para hacerla pasar.
- Una nueva skill nunca sustituye automáticamente a una capability existente: requiere OLD vs NEW y rollback.

## 8. Carga bajo demanda

No cargar miles de skills en contexto. Mantener metadata ligera y materializar el contenido completo únicamente para un job autorizado.

Metadata mínima:

- identity/version/upstream commit;
- author/license;
- clase y trust tier;
- inputs/outputs;
- permisos;
- network/filesystem/credentials;
- engine bindings;
- coste;
- tests/evals;
- health/last_checked;
- rollback/rebuild;
- company_scope/environment.

## 9. Seguridad y rechazo

Rechazo directo V0:

- CAPTCHA bypass;
- credential extraction furtiva;
- fingerprint spoofing/anti-detect;
- código ofuscado sin justificación y auditoría;
- upstream no resoluble;
- ejecución silenciosa en PROD;
- acceso a Trading desde CEREBRO general.

Licencia incompatible => REFERENCE_ONLY, no copia/adaptación.
Nuevo gasto => MONEY_LIMIT antes de consumirlo.

## 10. No interferencia con SEO y nuevas empresas

La Skill Supply Chain es una capa de capabilities, no sustituye SEO-001, Company Onboarding ni el pipeline de alta de empresa. V0 es READ_ONLY_DISCOVERY y no ejecuta writes en PROD.

Una nueva empresa sigue activando sus motores habituales. El Router podrá seleccionar skills verificadas cuando estén AVAILABLE/PREPROD_GREEN, pero no cambia el owner del proceso.

## 11. Criterio de promoción

No declarar operativo hasta tener:

- contrato validado;
- tests verdes;
- licencia y upstream probados;
- security gate;
- aislamiento multiempresa;
- coste medido;
- observabilidad/auditoría;
- rollback/rebuild;
- PREPROD;
- evidencia OLD vs NEW cuando sustituya una capability;
- integración con RSI/Technology Scout reconciliada sin duplicación.

## 12. Next block

1. Ejecutar CI de este V0.
2. Corregir cualquier rojo.
3. Auditar/reconciliar PR #176 + #201 + #241 + #263 + #416 contra `main` actual.
4. Evitar merge directo de stacks históricos: extraer solo piezas vigentes y compatibles.
5. Conectar discovery real en READ_ONLY con fuentes iniciales.
6. Añadir almacenamiento de metadata e historial sin cargar Supabase con logs pesados.
7. Activar scheduling continuo solo después de PREPROD GREEN y hard-cost guard.
