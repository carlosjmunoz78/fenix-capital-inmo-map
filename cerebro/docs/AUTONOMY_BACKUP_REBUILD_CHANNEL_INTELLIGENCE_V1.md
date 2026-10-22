# CEREBRO OS · Autonomy / Backup / Rebuild · Channel Intelligence V1

## Estado de autonomía V1

`PREPROD_PLAN_ONLY`.

La capacidad puede:

- componer perfiles Web y Channel Pod;
- reutilizar evidencias de WAUD/SOCAUD/SOCBOOT;
- puntuar señales de tendencia;
- crear candidatos para LAB/EXP;
- preparar un plan de alta de nueva red;
- producir envelopes deterministas de persistencia.

La capacidad NO puede en V1:

- publicar en redes;
- escribir en WordPress PROD;
- desplegar cambios;
- gastar dinero;
- aceptar términos/contratos;
- instalar software/modelos;
- llamar proveedores con efecto externo;
- promocionar reglas de aprendizaje a conocimiento canónico;
- activar autonomía PROD.

## Dependencias de autonomía

Para aumentar autonomía deben cerrarse de forma independiente:

1. bindings autorizados de fuentes de tendencias/competencia por canal;
2. jobs/eventos físicos con `EVT-001/JOB-001`;
3. publicación por canal con scopes mínimos y verificación posterior;
4. community actions y límites de respuesta;
5. multimedia provider/runtime bindings;
6. evaluación + tribunal + OLD vs NEW;
7. LRN-001 con promoción gobernada;
8. rollback y observabilidad de efectos externos.

## Backup

No hay base de datos nueva en V1. La fuente reconstruible es Git + evidencias upstream autorizadas.

Artefactos a preservar:

- `cerebro/marketing/channel-intelligence-runtime-v1.mjs`
- `cerebro/marketing/channel-intelligence-multicompany-adapter-v1.mjs`
- `cerebro/contracts/channel-intelligence-v1.contract.json`
- tests V1
- documentación V1
- evidencia CI exact-head

Los resultados dinámicos deben persistirse mediante envelopes/almacenamiento ya gobernado; V1 no introduce un nuevo sistema de almacenamiento.

## Rebuild

1. checkout del commit aprobado;
2. validar contrato JSON;
3. ejecutar tests V1;
4. ejecutar `cd cerebro && npm run validate`;
5. reconstruir resultados desde evidencias upstream versionadas de la misma empresa;
6. no reconstruir desde secretos ni desde contenido no trazable;
7. confirmar `prod_authorized=false` hasta nueva promoción explícita.

## Rollback

Mientras la PR sea draft/no merge:

- rollback = abandonar/revertir la rama sin impacto en PROD.

Después de un futuro merge PREPROD:

- rollback de código al commit anterior aprobado;
- descartar candidatos de tendencia/experimento no promovidos;
- conservar evidencia/auditoría;
- no borrar ni modificar motores existentes.

Un futuro binding de publicación requerirá rollback específico del canal antes de poder habilitarse.

## Recuperación ante fallo

- fallo de scoring/adapter: fail closed, no publicar;
- upstream `HUMAN_REQUIRED`: detener ese flujo;
- cruce de tenant: `SECURITY_INCIDENT`;
- coste > 0 o compra/suscripción: `MONEY_LIMIT`;
- intento de PROD/publicación en V1: `POLICY_CONFLICT`;
- falta de evidencia: `LOW_CONFIDENCE`.

## Estado tras reinicio

La capacidad debe ser reproducible sin memoria de conversación. Su comportamiento deriva de código, contrato, upstream evidenciado y configuración versionada. Las preferencias visuales aprendidas deberán ser referencias versionadas/evidenciadas; nunca conocimiento implícito exclusivo de un chat.

## Coste

Objetivo V1: `0 € adicional`.

No existe autorización en este alcance para contratar herramientas, APIs, datasets, suscripciones o modelos de pago.
