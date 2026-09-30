# CEREBRO Console · Owner Decision by Exception Policy V1

Estado: **DEFINIDO / IMPLEMENTACIÓN PARCIAL**  
Fecha: 2026-09-30  
Ámbito: `CONSOLE-001`, `CHAT-001`, `CTX-001`, `CMD-001`, `ACTGW-001`, Policy/Human Exception.

## 1. Objetivo

La Console debe permitir al propietario humano autorizado consultar CEREBRO libremente dentro de la información y permisos disponibles y ordenar trabajo ordinario con una interacción natural, sin convertir cada excepción en un muro.

El humano autorizado mantiene la decisión final mientras un proceso no esté promovido a autonomía completa. CEREBRO debe aprender de esas decisiones como precedentes auditables y proponer automatización de patrones repetidos cuando exista evidencia suficiente.

## 2. Consultas

Una consulta de lectura no requiere confirmación.

CEREBRO debe poder responder sobre cualquier contenido al que tenga acceso autorizado por contexto y permisos: motores, SEO, redes, CRM, App, WordPress, Notion/conocimiento, jobs, auditoría, estado, métricas, documentos y demás fuentes conectadas.

Regla: **preguntar no ejecuta cambios**.

Si una fuente necesaria no está conectada o la confianza es insuficiente, CEREBRO debe decir exactamente qué falta. No debe inventar datos ni presentar estado histórico como evidencia viva.

## 3. Acciones · una confirmación útil

Cuando el usuario pide una acción, CEREBRO:

1. interpreta la intención;
2. concreta el alcance exacto;
3. presenta una propuesta breve y comprensible;
4. pregunta si debe activarla;
5. permite preguntas, explicación o cambios de alcance antes de confirmar;
6. ejecuta únicamente después de un `sí` explícito referido a la propuesta vigente.

No existe una doble confirmación repetitiva por defecto.

Ejemplo:

- Usuario: «Prepara la zona de Valencia en SEO».
- CEREBRO: «¿Quieres que active el proceso SEO para Valencia y provincia con el flujo SEO canónico?»
- Usuario: «¿En qué consiste?»
- CEREBRO: explica el proceso completo y termina con «¿Quieres que active este proceso?»
- Usuario: «Sí».
- CEREBRO: ejecuta la propuesta vigente.

Si el usuario cambia el alcance («solo Valencia capital»), la propuesta anterior queda invalidada y CEREBRO presenta la nueva propuesta exacta antes de ejecutar.

## 4. HUMAN_REQUIRED no es un muro

`HUMAN_REQUIRED` significa **decisión o intervención humana necesaria**, no cancelación automática del proceso.

CEREBRO debe devolver:

- motivo exacto;
- impacto/riesgo;
- opciones disponibles;
- recomendación descriptiva cuando exista evidencia;
- acción humana mínima necesaria;
- enlace o control directo cuando exista;
- estado de reanudación.

### Resoluciones

`SIGNATURE_REQUIRED`  
Mostrar qué se firma, por qué y el enlace exacto de firma. Tras evidencia de firma, reanudar automáticamente.

`MONEY_LIMIT`  
Mostrar importe, concepto, proveedor, motivo y enlace de pago/autorización cuando exista. Tras aprobación/pago verificable, reanudar.

`HIGH_RISK`  
Explicar riesgo, consecuencias, rollback/mitigaciones y pedir decisión del propietario.

`POLICY_CONFLICT`  
Explicar qué regla entra en conflicto, qué ocurriría al autorizar la excepción y pedir una decisión con alcance explícito.

`LOW_CONFIDENCE`  
Pedir únicamente el dato o decisión mínima que falta.

`LEGAL_REQUIRED`  
Explicar la obligación y llevar al humano al acto legal necesario. La autorización humana no elimina la obligación legal.

`SECURITY_INCIDENT`  
Explicar el incidente y las opciones seguras. La contención crítica no se desactiva silenciosamente por una confirmación genérica.

`CUSTOMER_HUMAN_REQUEST`  
Derivar al humano solicitado y conservar contexto.

## 5. Autoridad del propietario

El propietario humano autorizado puede aprobar, rechazar, modificar o crear una excepción de política **dentro de sus permisos legales y técnicos**.

Dos niveles distintos:

- **aprobación de ejecución:** vale solo para la propuesta/acción exacta;
- **cambio de política:** altera comportamiento futuro y debe registrarse explícitamente como cambio de política, con alcance, versión, auditoría y rollback.

Un «sí» a una acción no modifica permanentemente una política global.

## 6. Aprendizaje por precedentes

Cada decisión humana relevante debe registrar al menos:

```text
company_id
engine_id
environment
version
action_id
proposal_hash
exception_reason
owner_decision
scope
reason/context
timestamp
result
rollback_ref
```

CEREBRO puede detectar patrones repetidos y proponer: «Esta excepción se ha resuelto de la misma manera N veces. ¿Quieres convertirla en política automática bajo estas condiciones?»

Nunca auto-promocionar una excepción a política permanente sin gate de política/promoción.

## 7. Estado técnico actual

**HECHO:** Console/Gateway autenticados; Gateway PROD V3 activo; entrada móvil canaria `/cerebro/` publicada y validada en CI.  
**HECHO:** adaptador general de conocimiento Notion en modo solo lectura para Dirección, con ranking determinista, fuentes y fail-closed sin evidencia.  
**HECHO:** propuesta de acción conservada entre mensajes; explicación/revisión no ejecuta; confirmación única ligada a la propuesta vigente.  
**PARCIAL:** ejecución real de acciones confirmadas. El primer binding auditado es SEO-001 PREPROD; debe reutilizar su cola/autopilot/rollout existente, no crear una vía paralela.  
**POR AUDITAR/IMPLEMENTAR:** bindings ACTGW→motores restantes y enlaces concretos de firma/pago por proveedor.

No declarar ejecución real de una acción hasta que ACTGW/engine correspondiente tenga binding vivo y evidencia E2E.
