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
   - `fenix-communications-gateway-test` con CORS + validación real de JWT;
   - flujo: preparar → revisar → autorizar → transportar → registrar resultado;
   - Carlos Financiero no puede autoautorizar mensajes que requieren aprobación (`403 approval_required`);
   - Dirección sí puede autorizar;
   - cualquier transporte no permitido queda bloqueado;
   - modo `SIMULATED` probado con éxito y `external_sent=false`;
   - idempotencia, hashes, versiones, intentos e historial quedan persistidos;
   - navegación PRE-PROD incluye Comunicaciones para Dirección, Financiero y Visitador.
8. Brevo real está desacoplado detrás del circuito de Comunicaciones. El envío externo PRE-PROD permanece cerrado salvo autorización + allowlist + configuración server-side.
9. Fichas detalle montadas y operativas:
   - `/expedientes/:id`;
   - `/contactos/:id`;
   - `/inmobiliarias/:id`;
   - acciones contextuales a Comunicaciones, Documentación, Tasaciones, Firma y Gestión B2B según tipo.
10. Los listados de Expedientes, Contactos e Inmobiliarias ya abren su ficha detalle autorizada mediante clic o teclado; Buscador puede abrir destinos soportados cuando recibe ruta.
11. Frontend operativo:
   - `OperationalShellV2`;
   - `DetailShell`;
   - `AnaGovernance`;
   - `VisitasShell`;
   - `CommunicationsShell`;
   - calculadora sin palabra comercial `PRO`.
12. Último build funcional de navegación a detalle: commit `aaa7580ca530b5356ab2d92678966acdf77acc34` → Vercel `success`.

## QA de aislamiento ya ejecutado
- Dirección Contactos: todos los fixtures autorizados.
- Carlos Financiero: cliente propio + bancos.
- Carlos Visitador: inmobiliaria propia.
- Financiero → Visitadores: 403.
- Visitador Carlos → Visitas: solo su actividad.
- VIS-B no lee actividad VIS-A.
- Ana: corrección creada y aprobada con control de versión.
- Comunicaciones: Financiero prepara; no puede aprobar; Dirección aprueba; simulación controlada sin envío externo.
- Expedientes: FIN-A lista solo `EXP-FIN-A-001`; FIN-B solo `EXP-FIN-B-001`; Dirección ve ambos.
- URL forzada Inmobiliaria: VIS-A abre `INM-VIS-A-001`; VIS-B sobre esa misma ficha recibe `403`; Dirección la abre correctamente.

## Pendiente real
1. Sincronización canónica Notion ↔ runtime PRE-PROD sin romper RBAC ni duplicar fuente maestra.
2. Completar E2E navegador Dirección / Carlos-Financiero / Carlos-Visitador, incluyendo URL forzada de Expediente y Contacto.
3. Convertir acciones contextuales restantes en mutaciones específicas desde ficha, sin obligar a volver al listado cuando no proceda.
4. QA visual contra las 44 capturas y cierre de diferencias claro/oscuro, densidad, topbar, Ana, calculadora y responsive.
5. Solo después: habilitación controlada de un envío Brevo real a destinatario QA permitido si aporta valor de cierre.

## Criterio de cierre
Fase 1 solo se marca lista cuando Dirección, Financiero y Visitador puedan trabajar con datos vivos autorizados, mutaciones auditadas, comunicaciones controladas, errores explícitos y sin mocks silenciosos.
