# APP Fénix Capital · Reconciliación PRE-PROD · 21/08/2026

## Regla de trabajo
- No tocar `main`, PROD ni WordPress.
- Rama canónica: `preprod-app-phase1`.
- Runtime: Vite/React + Supabase Auth + Edge Functions + schema `preprod_test`.
- El ZIP `FENIX_CEREBRO_OS_CHECKPOINT_06` se usa como especificación funcional y fuente de lógica; no se copia encima del frontend.
- Mantener como patrón visual el sistema Dirección ya validado y las 44 capturas de Work.

## Estado consolidado
1. Expedientes, Bancos, Inmobiliarias, Tasaciones, Firmas, Documentación, Agenda, Informes y Buscador tienen backend PRE-PROD autorizado.
2. Contactos federados conectados sin base duplicada:
   - Dirección: clientes + bancos + inmobiliarias.
   - Financiero: sus clientes + bancos.
   - Visitador: inmobiliarias de su cartera.
3. Visitadores conectado con RBAC:
   - Dirección ve equipo.
   - Visitador ve su propio ámbito.
   - Financiero recibe 403.
4. Personas QA solicitadas:
   - `FIN-A` = Carlos · Financiero.
   - `VIS-A` = Carlos · Visitador.
5. Gobierno de Ana conectado:
   - corrección del usuario → Pendiente;
   - solo Dirección aprueba/rechaza;
   - aprobación genera regla y versionado;
   - ciclo FIN-A → DIR-TEST probado.
6. Visitas/gestiones B2B conectado:
   - Visita/Llamada/WhatsApp/Email/Otro;
   - resultado, próximo contacto, próxima acción, estado y versión;
   - aislamiento VIS-A ↔ VIS-B probado.
7. Comunicaciones controladas conectadas en PRE-PROD:
   - workspace `/comunicaciones` y `/comunicaciones/nueva`;
   - `fenix-communications-gateway-test` v1 con CORS + validación real de JWT;
   - flujo: preparar → revisar → autorizar → transportar → registrar resultado;
   - Carlos Financiero no puede autoautorizar mensajes que requieren aprobación (`403 approval_required`);
   - Dirección sí puede autorizar;
   - cualquier transporte no permitido queda bloqueado;
   - modo `SIMULATED` probado con éxito y `external_sent=false`;
   - idempotencia, hashes, versiones, intentos e historial quedan persistidos;
   - navegación PRE-PROD incluye Comunicaciones para Dirección, Financiero y Visitador.
8. Brevo real sigue desacoplado mediante `fenix-brevo-api-preprod`; ya existe evidencia histórica E2E de envío y webhooks, pero el workspace nuevo no ejecuta envíos externos durante QA sin habilitación expresa del transporte.
9. Frontend operativo:
   - `OperationalShellV2`;
   - `AnaGovernance`;
   - `VisitasShell`;
   - `CommunicationsShell`;
   - calculadora sin palabra comercial `PRO`.
10. Último build de Comunicaciones: commit `dafd8fea1a9d8c196b972aef4af4a93aee769b25` → Vercel `success`.

## QA de aislamiento ya ejecutado
- Dirección Contactos: todos los fixtures autorizados.
- Carlos Financiero: cliente propio + bancos.
- Carlos Visitador: inmobiliaria propia.
- Financiero → Visitadores: 403.
- Visitador Carlos → Visitas: solo su actividad.
- VIS-B no lee actividad VIS-A.
- Ana: corrección creada y aprobada con control de versión.
- Comunicaciones: Financiero prepara; no puede aprobar; Dirección aprueba; simulación controlada sin envío externo.

## Pendiente real
1. Activar transporte Brevo real desde el circuito de Comunicaciones con gate explícito, destinatario válido y registro de provider_message_id/eventos; WhatsApp sujeto a plantilla/consentimiento/reglas del proveedor.
2. Sincronización canónica Notion ↔ runtime PRE-PROD sin romper RBAC ni duplicar fuente maestra.
3. Fichas detalle de Expediente, Contacto e Inmobiliaria con acciones reales: preparar Email/WhatsApp, abrir documentos, tareas, tasación, firma y seguimiento.
4. E2E completo Dirección / Carlos-Financiero / Carlos-Visitador con URLs forzadas.
5. QA visual contra las 44 capturas y cierre de diferencias.

## Criterio de cierre
Fase 1 solo se marca lista cuando Dirección, Financiero y Visitador puedan trabajar con datos vivos autorizados, mutaciones auditadas, comunicaciones controladas, errores explícitos y sin mocks silenciosos.
