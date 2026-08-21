# APP Fénix Capital · Reconciliación PRE-PROD · 21/08/2026

## Regla de trabajo
- No tocar `main`, PROD ni WordPress.
- Rama canónica de trabajo: `preprod-app-phase1`.
- Runtime visible: Vite/React + Supabase Auth + Edge Functions + schema `preprod_test`.
- El ZIP `FENIX_CEREBRO_OS_CHECKPOINT_06` se usa como especificación funcional y fuente de lógica, NO se copia encima del frontend porque pertenece a una arquitectura Vinext/servidor distinta.
- Mantener como patrón visual el sistema Dirección ya validado y las 44 capturas de Work.

## Hallazgo clave
El frontend runnable del repositorio y el Checkpoint 06 no son el mismo proyecto técnico. La vía rápida y segura es PORTAR al runtime real los contratos funcionales del Checkpoint 06, no sustituir el repositorio.

## Estado consolidado de este checkpoint
1. Verificada rama `preprod-app-phase1`, commit histórico `63766c1cf9222ab55ed94fa9968568885a3ee10b`, workflow y `gh-pages`.
2. Verificado Supabase PRE-PROD y Edge Functions activas.
3. RPC server-side activas para Expedientes, Inmobiliarias, Contactos federados y Visitadores.
4. `fenix-app-gateway-test` actualizado a v5 con autenticación fail-closed y rutas:
   - `/health`
   - `/personal`
   - `/expedientes`
   - `/inmobiliarias`
   - `/contactos`
   - `/visitadores`
   - `/ana/correcciones`
   - proxy autorizado hacia `fenix-app-api-test` para el resto.
5. Contactos PRE-PROD funciona como vista federada por rol sin crear una base duplicada:
   - Dirección: clientes + bancos + inmobiliarias.
   - Financiero: sus clientes + bancos.
   - Visitador: inmobiliarias de su cartera.
6. Visitadores queda aislado por rol:
   - Dirección ve el equipo Visitador.
   - Visitador ve su propio ámbito.
   - Financiero recibe 403.
7. Se han preparado las dos personas de prueba solicitadas usando identidades ya existentes, sin crear cuentas innecesarias:
   - `FIN-A` muestra nombre `Carlos` y rol Financiero.
   - `VIS-A` muestra nombre `Carlos` y rol Visitador.
   Los actor codes e identidades A/B se mantienen para no romper las pruebas de aislamiento.
8. Gobierno de Ana implementado en PRE-PROD:
   - cualquier usuario puede explicar qué sugirió Ana y por qué no debe hacerse así;
   - la corrección queda `Pendiente`;
   - solo Dirección puede aprobar/rechazar;
   - si se aprueba, queda `approved_rule` y pasa a `Aprobada`;
   - control de versión evita dobles decisiones concurrentes.
   - ciclo PRE-PROD probado: creación por Financiero → aprobación por Dirección → versión 2.
9. Frontend conectado mediante `OperationalShellV2` para Expedientes, Bancos, Contactos, Inmobiliarias, Tasaciones, Firmas, Documentación, Financieros, Visitadores, Agenda, Informes y Buscador.
10. `AnaGovernance` montado en `/ana` con cuadro de corrección y revisión de Dirección.
11. La calculadora se muestra sin la palabra comercial `PRO` en la interfaz visible.
12. Vercel ha compilado y desplegado en verde el commit `27f1c3c9899adbcd5c9deb8e044e2a5d45d9788a`.

## QA ejecutado en este checkpoint
- Contactos Dirección: 6 registros visibles en fixture sintético autorizado.
- Contactos Financiero `FIN-A/Carlos`: solo su cliente + bancos.
- Contactos Visitador `VIS-A/Carlos`: solo su inmobiliaria.
- Visitadores solicitado por Financiero: 403.
- Visitadores solicitado por Dirección: lista de equipo.
- Visitador `VIS-A/Carlos`: solo su propia ficha/cartera.
- Ana: corrección creada por FIN-A, aprobada por DIR-TEST, estado final `Aprobada`, versión 2.

## Lo que NO se da todavía por cerrado
- Las fuentes PRE-PROD siguen siendo fixtures aislados en Supabase; la sincronización canónica con Notion debe conectarse sin romper el RBAC ya probado.
- Email/WhatsApp dispone de backend de comunicaciones y evidencia Brevo, pero aún falta integrarlo en las fichas y validar el transporte final de lanzamiento.
- Visitas/gestiones B2B todavía requiere su endpoint y pantalla operativa completa.
- Fichas detalle de Contacto, Inmobiliaria y Expediente todavía deben reconciliar botones/acciones contra las capturas.
- No se declara Fase 1 lista hasta E2E completo Dirección/Financiero/Visitador y QA visual.

## Siguiente orden exacto
1. Visitas/gestiones B2B del Visitador + creación/modificación con auditoría.
2. Comunicaciones desde Contacto/Expediente/Inmobiliaria: preparar → revisar → autorizar → enviar, manteniendo Brevo desacoplado como proveedor.
3. Sincronización canónica Notion ↔ runtime PRE-PROD de forma controlada y sin duplicar fuentes.
4. Fichas detalle y botones reales según las 44 capturas.
5. E2E Dirección / Carlos-Financiero / Carlos-Visitador + aislamiento A↔B.
6. QA visual y cierre de diferencias.

## Criterio de cierre
Fase 1 solo puede marcarse lista cuando Dirección, Financiero y Visitador puedan trabajar con datos vivos autorizados, botones reales, auditoría, errores explícitos y sin mocks/snapshots silenciosos.
