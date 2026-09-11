# APP Fénix Capital · cierre candidato 2026-09-11

Estado: **CANDIDATO DE CIERRE VALIDADO EN RAMA SEGURA**.

Base canónica revisada: `preprod-app-phase1` @ `6cca1630581b8b33dc7033e61d4c64238c2e8835`.
Rama de trabajo: `work/app-closeout-2026-09-11`.

## Alcance cerrado

- Perfil común y cambio de contraseña propia mediante Supabase Auth autenticado.
- Administración de personal:
  - Carlos: Director, Financiero y Visitador.
  - Belén: Financiero y Visitador.
  - Cambio de contraseña de personal limitado al creador autorizado.
- Informes diarios y semanales:
  - Dirección: ámbito empresa.
  - Financiero y Visitador: únicamente su propia actividad.
  - Eventos basados en el registro de actividad auditado y con zona `Europe/Madrid`.
- Chat de equipo:
  - mini ventana flotante operativa;
  - texto, dictado, grabación de audio y adjuntos;
  - expansión al chat completo conservando estado en el mismo shell;
  - almacenamiento y RPC autenticados.
- RBAC y seguridad: autoridad en backend, sin service-role en frontend y sin persistir contraseñas.
- Aislamiento PRE-PROD/PROD: sufijos y almacenamiento auth separados.

## Gate de publicación

PRE-PROD permanece manual y sin publicación automática.
La promoción a PROD permanece **manual y explícita** mediante `APP PROD Promote`.
Este cierre no publica por sí mismo en `gh-pages`, no cambia `main` y no ejecuta mutaciones de datos de negocio.

## Evidencia

El workflow `Closeout Safe Validation` debe quedar completamente verde antes de considerar este candidato cerrado. Incluye build, contratos de perfil/personal, informes por rol, controles flotantes, audio/dictado, mini chat, RBAC, aislamiento de entornos, configuración PROD y gate de release.
