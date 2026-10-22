# CEREBRO OS · SOCIAL ARCHITECTURE EVOLUTION CANON V1

**Fecha:** 2026-10-22  
**Estado:** DEFINIDO · CANON ADITIVO  
**company_id:** GLOBAL  
**engine_id:** FACT-001 / LRN-001 / SOC-001  
**version:** 1.0.0

## Decisión

Cada Social Platform Family debe poder declarar una arquitectura V1 completa sin convertirse en una arquitectura rígida.

Estado canónico:

`COMPLETE_V1_EVOLVABLE`

Esto significa: todas las superficies, funciones empresariales, controles y responsabilidades materiales conocidas están cubiertas en V1, pero CEREBRO debe seguir buscando mejoras, nuevas superficies, cambios de plataforma, nuevas capacidades, duplicidades, obsolescencia, riesgos y oportunidades.

No significa `PROD_READY`.

## Funciones empresariales mínimas heredables por toda red

Además de estrategia, contenido, creatividad, publicación, comunidad, leads, paid, datos, investigación, aprendizaje, compliance y supervisor, toda red deberá cubrir cuando sean materialmente aplicables:

- Partnerships & Business Development.
- Stories/ephemeral o formato equivalente propio de la red.
- Customer Care & Social Support.
- Reputation & Reviews/Recommendations.
- Account Security & Access Operations.
- Crisis Communications.
- Employee/Expert Advocacy & Social Selling.
- Lead Acquisition y CRM handoff.
- Business Opportunity Discovery hacia CEREBRO.
- Architecture Evolution.

La implementación concreta cambia por red. No se fuerza una superficie inexistente: se exige que la familia tenga un mapa actualizado de superficies/capacidades y decida `APLICA / NO_APLICA / DEPRECATED / NEW_GAP` con evidencia.

## Bucle de evolución arquitectónica

`OBSERVAR RUNTIME + FRONTERA → DETECTAR SUPERFICIE/GAP/DUPLICIDAD/OBSOLESCENCIA/OPORTUNIDAD → EVIDENCIA → ARCHITECTURE CHANGE PROPOSAL → REUSE/EXTEND/SPLIT/MERGE/CREATE/DEPRECATE → LAB/PREPROD → TESTS → OLD vs NEW → SUPERVISOR → TRIBUNAL SI MATERIAL → NUEVA VERSIÓN → MIGRACIÓN GRADUAL → MEDIR → ROLLBACK SI NECESARIO → ACTUALIZAR CANON`

## Disparadores obligatorios

- nueva superficie o formato de una red;
- deprecación o cambio de alcance;
- cambios de políticas, permisos o APIs;
- cambios de ranking/recomendación;
- nuevas herramientas de creators/partnerships/messaging/measurement;
- nueva regulación;
- hallazgos de seguridad/integridad;
- patrón ganador validado;
- fallos repetidos o baja calidad;
- rol saturado o ownership ambiguo;
- duplicidad de roles o investigación;
- nueva empresa/modelo de negocio/familia;
- nueva herramienta/open-source relevante;
- oportunidad de menor coste o mayor rendimiento;
- hallazgo de Supervisor/Tribunal;
- feedback humano.

## Architecture Change Proposal

Toda modificación material mantiene como mínimo:

`proposal_id, trigger, evidence, scope, affected_surfaces, affected_roles, current_behavior, proposed_behavior, expected_benefit, risk, cost_delta, source_provenance, compatibility_plan, test_plan, old_vs_new_plan, rollback_plan`.

Estados:

`DISCOVERED → TRIAGED → RESEARCHING → CANDIDATE_BUILT → LAB_TESTED → PREPROD_TESTED → OLD_VS_NEW_PASSED → SUPERVISOR_PASSED → TRIBUNAL_PASSED_WHEN_REQUIRED → PROMOTED`

Con alternativas: `REJECTED / ROLLED_BACK / DEPRECATED`.

## Versionado

- PATCH: conocimiento/fuentes/gates sin cambio material de contrato.
- MINOR: capacidad/rol/superficie/control aditivo y compatible.
- MAJOR: cambio material de comportamiento, autoridad, contrato o topología.

Las versiones anteriores se conservan para rollback. No existe ruptura silenciosa de contrato.

## Fitness arquitectónico

CEREBRO evalúa continuamente:

cobertura, calidad, conversión, calidad de lead, experiencia cliente, reputación, acuerdos, oportunidades de negocio, velocidad de aprendizaje, freshness, compliance, legal, seguridad, aislamiento de datos, coste, latencia, fiabilidad, observabilidad, rollback, duplicación y mantenibilidad.

## Fuentes de vigilancia

Prioridad: documentación/noticias oficiales de la plataforma, Business/Help, políticas publicitarias, changelogs de APIs, Ads Library/transparencia, regulación oficial, evidencia operativa interna, mercado/competencia validada y hallazgos del Supervisor/Tribunal.

Los cambios externos nunca se convierten automáticamente en conocimiento canónico ni en autoridad PROD: entran como candidatos con procedencia, prueba y comparación.

## Reglas de preservación

`CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR`

Nunca:

- borrar comportamiento vigente sin mapa de migración;
- aumentar autoridad automáticamente;
- mezclar datos privados entre empresas;
- asumir que una superficie existe para todas las cuentas;
- mantener una superficie deprecada sin detectar obsolescencia;
- ejecutar acuerdos vinculantes, firma o gasto sin autoridad;
- permitir que Supervisor o Arquitectura se autocertifiquen.

## Herencia

Aplica a Facebook, Instagram, LinkedIn, TikTok, YouTube, X, Pinterest y cualquier red futura. Cada nueva Social Platform Family debe heredar este contrato y especializarlo a sus superficies, políticas, formatos, negocio, datos y supervisor.
