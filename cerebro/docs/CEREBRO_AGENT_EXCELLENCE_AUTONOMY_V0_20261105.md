# CEREBRO OS · Autonomía iniciativa propia + Excelencia por méritos V0

**Fecha:** 2026-11-05 · **Estado:** DEFINIDO + política determinista implementada y probada localmente. No conectado todavía a los workers ni habilitado en PROD.

## Intención del propietario
Los agentes y subagentes **no esperan siempre una instrucción humana**. Detectan tareas, proponen acciones fundadas en evidencia y deben ejecutarlas **cuando ya estén dentro de una capacidad registrada y autorizada**, con evaluación independiente, auditoría y resultado verificable. La mejora continua es obligatoria. La excelencia se premia con formación, herramientas y más capacidades *acotadas*, y el bajo rendimiento puede llevar a sustitución controlada.

## Jerarquía
1. Única autoridad de negocio: **propietario** (identidad privada y autenticada; no guardar aquí nombre/correo).
2. **CEREBRO supervisor**: asignación, observabilidad, controles de calidad, parada, propuestas de recompensas y reemplazos.
3. **Agentes especialistas**: iniciativa, ejecución de sus competencias, medición.
4. **Subagentes**: competencias específicas y trazabilidad de la delegación.
5. **Tribunal independiente** de la ejecución evaluada: no es un superior empresarial; verifica evidencia, contraste OLD/NEW, seguridad y mérito.

El registro preexistente `role-agent-registry.v1.json` aún tiene líneas `reports_to_state: UNRESOLVED`. No atribuimos falsamente a las cuentas un supervisor operativo hasta verificar el binding real.

**Solo el propietario decide sobre la gobernanza empresarial.** Esto no elimina cumplimiento normativo, privacidad, derechos de terceros ni políticas de seguridad técnica. Proveedores externos no reciben autoridad empresarial por el hecho de que una herramienta use sus APIs; las condiciones legales/técnicas siguen siendo aplicables.

## Dos modalidades obligatorias
- **Orden explícita:** propietario → Gateway → supervisor → agente adecuado → política → ejecutor autorizado → resultado con evidencia.
- **Iniciativa autónoma:** señal / auditoría / anomalía / oportunidad → agente detecta trabajo → justifica con evidencia → supervisor evalúa autoridad y coste → si bajo riesgo y en scope aprobado, ruta al ejecutor existente → comprobación semántica → aprendizaje → siguiente tarea.

**La libertad consiste en escoger el trabajo útil y cómo realizarlo dentro del contrato autorizado; no en autoasignarse permisos o credenciales.** La aprobación del propietario puede ser una política duradera por categoría de acción; no tiene por qué ser una pregunta repetida por cada ejecución ordinaria.

## Métricas y recompensas
Una decisión de mérito exige datos verificables y un evaluador distinto del agente y del supervisor. Umbral V0: mínimo 30 acciones verificadas; para optar a recompensas, fiabilidad ≥97 %, calidad ≥95 %, cero violaciones de política, cero incidentes de seguridad, cero regresiones y tribunal favorable. Son **umbrales candidatos**, no prueba de desempeño actual. Miden calidad, utilidad real y resultado, no únicamente cantidad de trabajo.

Recompensas candidatas: formación específica, funcionalidad extra registrada, acceso a una API gratuita y previamente aprobada, o autonomía ampliada **sin cambiar límites legales, costes ni credenciales**. El premio no otorga privilegios por sí mismo: se requiere una concesión de capacidades separada, emitida por la autoridad correspondiente y verificable en el Gateway.

Por debajo del 90 % de fiabilidad, reentrenar; por debajo del 75 %, revisar sustitución. El reemplazo **no borra al agente ni sus datos**. Se exige inventario → backup → candidato paralelo → pruebas OLD/NEW → PREPROD → rollback → promoción gradual.

## Estado real de implantación
- **EXISTENTE:** supervisor jerárquico, política de aprendizaje proactivo, tribunal y router gobernado de trabajos.
- **IMPLEMENTADO EN RAMA:** motor puro `agent-excellence-autonomy-v0.mjs` con comprobación de iniciativa y mérito, retornos fail-closed, cero efectos sobre PC/PROD.
- **LOCAL PROBADO:** suite de escenarios negativos/positivos; no verifica ejecución del CEREBRO real.
- **NO IMPLEMENTADO:** conexión de concesiones autenticadas del propietario al runtime, supervisión jerárquica ligada a identidades reales, ejecución PC-001 por iniciativa propia, publicación autónoma.
- **PRÓXIMO GATE:** confirmar identidad de supervisor + concesión del dueño desde fuente segura; integrar a `governed-execution-handoff-router-v1.mjs` y comprobar una tarea autónoma PREPROD de solo lectura o borrador, sin interrumpir PC-001.

**Prohibiciones permanentes V0:** credenciales en texto, pagos no aprobados, autoconcesión de privilegios, escritura PROD, trading real, control remoto de Windows sin prueba física/autorización de dispositivo, ejecución arbitraria de shell, salto de mecanismos de seguridad.

## Reglas de despliegue
`CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → MIGRAR`. Sin nuevo servidor por agente. Sin nueva suscripción. Antes de PROD: contratos, permisos, tests, evaluación independiente, backup, rollback, auditoría, coste medido y PREPROD.