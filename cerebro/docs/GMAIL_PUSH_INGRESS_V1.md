# CEREBRO · Gmail Push Ingress V1

## Estado
- DEFINIDO: arquitectura objetivo.
- EXISTENTE: correo CEREBRO actual, parser de respuestas sociales, worker de revisión visual y barrido periódico de respaldo.
- PARCIAL: rama aislada `cerebro/gmail-push-v1` preparada para implementación paralela.
- POR AUDITAR: proyecto Google Cloud reutilizable, OAuth Gmail API disponible y Pub/Sub existente.
- NO PROD: no afirmar operativo hasta E2E real.

## Objetivo
Reducir la latencia de entrada de correo desde el barrido periódico a un flujo por evento, sin eliminar el sistema actual hasta que el nuevo camino quede probado.

## Flujo objetivo
`Gmail -> Gmail API watch -> Google Cloud Pub/Sub -> CEREBRO push ingress -> parser CEREBRO existente -> motor/worker correspondiente -> respuesta -> auditoría`

## Regla de preservación
`CONSERVAR -> ENTENDER -> ENVOLVER -> PROBAR -> MEJORAR -> MIGRAR`

El barrido IMAP/GitHub existente permanece activo como fallback durante la validación. No se elimina ni sustituye hasta disponer de evidencia OLD vs NEW, rollback y E2E real.

## Coste
Objetivo de coste adicional: 0 EUR. Reutilizar cuenta Google, proyecto Google Cloud e infraestructura CEREBRO existentes cuando sea posible. No habilitar servicios de pago ni upgrading sin `MONEY_LIMIT`/autorización explícita.

## Requisitos externos de una sola vez
1. Proyecto Google Cloud seleccionado o creado sin nueva suscripción.
2. Gmail API habilitada.
3. Pub/Sub habilitado y topic dedicado a CEREBRO.
4. Permiso de publicación de Gmail al topic.
5. OAuth de Gmail con consentimiento del propietario y refresh token guardado como secreto, nunca en repo/logs.
6. Suscripción push HTTPS hacia el ingress CEREBRO con autenticación verificable.

## Seguridad
- Fail closed si falla identidad/autenticación.
- Nunca guardar tokens en repositorio, correo, logs ni evidencias.
- Idempotencia por `historyId`/message id.
- Separación `company_id`, `environment`, `version`.
- Solo procesar buzón/identidad configurados.
- Dedupe para evitar dobles respuestas.
- Mantener `OK / NO OK` y lenguaje natural como contrato de revisión social.

## Validación antes de PROD
- contratos
- permisos
- tests
- evaluación
- observabilidad
- backup
- rollback
- rebuild
- coste medido
- PREPROD E2E
- comparación con barrido actual
- prueba de mensaje real: correo -> push -> interpretación -> corrección/OK -> respuesta

## Criterio de aceptación
Una respuesta real del propietario debe ser detectada y procesada por el nuevo camino sin esperar al cron periódico, sin duplicar correo, sin publicar una pieza `NO OK`, y conservando el barrido antiguo como fallback hasta promoción gobernada.
