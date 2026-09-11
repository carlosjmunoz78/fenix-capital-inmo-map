# Gate de promoción a PROD · Fénix Capital CEREBRO OS

## Estado actual
- PRE-PROD no forma parte del flujo operativo normal de la APP.
- La rama canónica de integración sigue siendo `preprod-app-phase1` por compatibilidad histórica del repositorio, pero su destino operativo es PROD tras superar los gates.
- Supabase PROD, dominio, hosting y runtime se mantienen separados de cualquier infraestructura de pruebas.
- El CRM antiguo debe permanecer intacto y utilizable durante la estabilización y convivencia inicial.

## Regla operativa vigente de promoción
Una versión validada puede pasar a PROD sin pedir una nueva autorización manual a Carlos. La autorización operativa vigente permite promoción automática desde la rama canónica siempre que los gates técnicos, de datos, credenciales, RBAC, seguridad, build, QA y smoke estén efectivamente en verde.

Por tanto:
- verde → se continúa hasta PROD;
- rojo → se diagnostica, corrige, relanza y vuelve a validar;
- nunca se publica con CI rojo, incompleto, cancelado o sin ejecutar;
- no se detiene el flujo para pedir confirmaciones repetitivas de promoción;
- solo se detendrá ante un bloqueo externo real que requiera acción de Carlos: credenciales inaccesibles, compra/coste, riesgo destructivo irreversible, pérdida de datos o ambigüedad de negocio sin evidencia suficiente;
- el CRM antiguo permanece intacto y utilizable durante la estabilización.

## Condiciones obligatorias antes de promover
1. HEAD exacto de la rama canónica identificado.
2. Build en `success`.
3. Browser QA en `success` sin debilitar pruebas.
4. Contratos de perfil, usuarios, informes, chat, RBAC y seguridad en `success`.
5. Aislamiento de entorno confirmado: el cliente PROD no puede contener endpoints ni credenciales PRE-PROD.
6. Acciones sensibles conservan revisión/preview y confirmación explícita dentro del producto cuando corresponda.
7. Existe punto de rollback reproducible anterior.
8. Configuración PROD, dominio/hosting, backend, secretos y almacenamiento están definidos de forma separada.
9. El corte de datos del CRM antiguo debe estar actualizado al momento de activación cuando existan deltas pendientes.
10. Tras cualquier corte de datos se revalida deduplicación, integridad referencial e idempotencia antes de abrir el uso operativo.

## Gate de datos
La migración o reconciliación de datos no puede darse por válida solo porque la interfaz compile. Cuando existan cambios pendientes en el CRM antiguo:
1. fijar hora efectiva de corte;
2. leer el estado más reciente;
3. comparar contra el último manifiesto reconciliado;
4. incorporar únicamente deltas reales y validados;
5. excluir QA/TEST/DEMO y plantillas estructurales;
6. reejecutar deduplicación e integridad referencial;
7. comprobar conteos origen→destino e idempotencia;
8. generar evidencia final de corte;
9. ejecutar smoke funcional sobre el CRM nuevo;
10. si queda verde, continuar a PROD sin una nueva confirmación manual.

## Lo que NO constituye una promoción válida
- Fusionar código sin cumplir los gates técnicos y de datos.
- Copiar código a PROD reutilizando configuración PRE-PROD.
- Considerar válido un CI verde de otro SHA.
- Promover con Browser QA rojo, cancelado o sin ejecutar.
- Saltarse controles de seguridad o confirmaciones sensibles dentro del producto.
- Lanzar con una fotografía de datos desactualizada cuando existan deltas operativos pendientes.
- Borrar, apagar o inutilizar el CRM antiguo durante el lanzamiento inicial.

## Secuencia operativa de PROD
1. preparar candidato en rama segura cuando el cambio lo requiera;
2. ejecutar build y contratos sin mutar PROD;
3. corregir cualquier rojo y relanzar hasta verde;
4. integrar en la rama canónica;
5. el workflow PROD vuelve a ejecutar build, Browser QA, aislamiento y reachability sobre el SHA exacto;
6. solo si todos esos gates quedan verdes, publicar el snapshot validado en `app.fenixcapital.es`;
7. verificar el marcador de SHA publicado;
8. mantener rollback inmediato al release anterior y el CRM antiguo como respaldo durante la convivencia.

## Seguridad
- No publicar con un gate rojo.
- No debilitar pruebas para conseguir un verde artificial.
- No copiar secretos a documentación ni repositorio.
- No inventar endpoints, tablas, permisos o reglas de negocio para completar una promoción.
- No ejecutar borrados irreversibles del CRM antiguo como parte del cutover.
- Las contraseñas nunca se almacenan, muestran ni auditan en claro; solo se registran eventos seguros de cambio.
- Los permisos de creación de usuarios, administración y alcance de informes se validan en backend/RBAC, no solo en UI.

## Criterio de cierre
Este documento define un flujo de avance continuo: **verde → prosigue hasta PROD; rojo → corrige, relanza y revalida**. Carlos ya no es un gate manual de promoción cuando el candidato está técnicamente verde. La única parada válida es un bloqueo externo real que requiera su intervención.