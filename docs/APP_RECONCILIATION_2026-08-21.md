# APP Fénix Capital · Reconciliación PRE-PROD · 21/08/2026

## Regla de trabajo
- No tocar `main`, PROD ni WordPress.
- Rama canónica de trabajo: `preprod-app-phase1`.
- Runtime visible: Vite/React + Supabase Auth + Edge Functions + schema `preprod_test`.
- El ZIP `FENIX_CEREBRO_OS_CHECKPOINT_06` se usa como especificación funcional y fuente de lógica, NO se copia encima del frontend porque pertenece a una arquitectura Vinext/servidor distinta.
- Mantener como patrón visual el sistema Dirección ya validado y las 44 capturas de Work.

## Estado consolidado
1. Rama, workflow, Vercel y `gh-pages` verificados.
2. Expedientes, Bancos, Inmobiliarias, Tasaciones, Firmas, Documentación, Agenda, Informes y Buscador ya tienen backend PRE-PROD autorizado.
3. Contactos federados conectados sin crear base duplicada:
   - Dirección: clientes + bancos + inmobiliarias.
   - Financiero: sus clientes + bancos.
   - Visitador: inmobiliarias de su cartera.
4. Visitadores conectado con RBAC:
   - Dirección ve equipo.
   - Visitador ve su propio ámbito.
   - Financiero recibe 403.
5. Personas de prueba solicitadas, reutilizando identidades A/B para conservar QA:
   - `FIN-A` = Carlos · Financiero.
   - `VIS-A` = Carlos · Visitador.
6. Gobierno de Ana conectado:
   - usuario explica qué sugirió Ana y por qué no debe hacerse así;
   - queda Pendiente;
   - solo Dirección aprueba/rechaza;
   - aprobación genera `approved_rule` y aumenta versión;
   - ciclo probado FIN-A → DIR-TEST → Aprobada v2.
7. Visitas/gestiones B2B conectado:
   - tabla `preprod_test.gestiones_b2b`;
   - canales Visita/Llamada/WhatsApp/Email/Otro;
   - resultado, próximo contacto, próxima acción, estado y versión;
   - creación solo sobre inmobiliaria del ámbito permitido;
   - Dirección ve todas, Visitador solo las suyas, Financiero 403;
   - fixture probado: `VIS-A/Carlos` ve 1 gestión, `VIS-B` no la ve y Dirección sí.
8. Frontend:
   - `OperationalShellV2` para módulos operativos;
   - `AnaGovernance` en `/ana`;
   - `VisitasShell` en `/visitas`;
   - calculadora visible sin palabra comercial `PRO`.
9. Edge Functions:
   - `fenix-app-gateway-test` v5;
   - `fenix-visitas-api-test` v1.
10. Último build funcional verificado en Vercel: commit `0069a5c833a368709ac503a191788fdbfcbce667` → `success`.

## QA de aislamiento ya ejecutado
- Dirección Contactos: ve todos los fixtures autorizados.
- Financiero Carlos: solo cliente propio + bancos.
- Visitador Carlos: solo inmobiliaria propia.
- Financiero → Visitadores: 403.
- Dirección → Visitadores: equipo completo.
- Visitador Carlos → Visitadores: solo su ficha/cartera.
- Visitador Carlos → Visitas: solo su actividad.
- VIS-B no puede leer actividad VIS-A.
- Dirección sí puede verla.
- Ana: corrección creada, revisada y aprobada con control de versión.

## Pendiente real
1. Comunicaciones desde las fichas: preparar → revisar → autorizar → enviar → guardar resultado, usando Brevo inicialmente pero con proveedor desacoplado.
2. Sincronización canónica Notion ↔ runtime PRE-PROD sin romper el RBAC probado.
3. Fichas detalle de Expediente, Contacto e Inmobiliaria con botones reales según las capturas.
4. E2E completo Dirección / Carlos-Financiero / Carlos-Visitador con URLs forzadas y errores esperados.
5. QA visual contra las 44 capturas.

## Criterio de cierre
Fase 1 solo se marca lista cuando Dirección, Financiero y Visitador puedan trabajar con datos vivos autorizados, mutaciones auditadas, comunicaciones controladas, errores explícitos y sin mocks silenciosos.
