# CEREBRO OS · Política ejecutable de dependencias LAB · 13 nov 2026

**Orden explícita del propietario:** `staging.fenixcapital.es` suspendido hasta nuevo aviso. No comprobar disponibilidad, visitar, recuperar, publicar, modificar ni reactivar automáticamente.

El módulo `dependency-policy.mjs` es el guard determinista importado por el **Gateway Universal LAB**. Solo una instrucción posterior y explícita del propietario puede autorizar crear otra versión de la política. `get_dependency_status` devuelve el bloqueo como estado consultable por cualquier interfaz conectada al SDK, después de verificar sesión del propietario. `assessLabOperationV0` permite observación y simulaciones de LAB; las operaciones que dependen del WordPress staging siempre devuelven `BLOCKED_DEPENDENCY`. Destinos dinámicos en comandos se rechazan, aunque pretendan disfrazarse de otro host o URL.

**Límite esencial:** no se han modificado los cron existentes de Hostinger, Edge functions previas, WordPress o App/CRM. El guard solo es efectivo en la nueva ruta `/api/cerebro-universal-preview` y su SDK. No afirmar que impide tráfico externo de otras automatizaciones. El estado de salud de staging se registra `NOT_CHECKED_PER_OWNER_DIRECTIVE`.

**Reversión:** revertir el commit aislado y el despliegue Preview. No hay DDL, secretos o contratos PROD alterados. La suspensión permanece vigente en cualquier versión mientras no exista nueva orden del propietario.
