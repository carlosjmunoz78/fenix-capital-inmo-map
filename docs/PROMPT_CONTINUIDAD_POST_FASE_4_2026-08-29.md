# PROMPT MAESTRO DE CONTINUIDAD · FÉNIX APP / CEREBRO · POST FASE 4

**Fecha:** 29/08/2026

Carga este documento junto con `docs/CIERRE_MAESTRO_FASE_4_2026-08-29.md` como continuidad operativa exacta. No empieces desde cero y no reabras Fase 4 salvo regresión demostrada.

## 1) PROYECTO

- Repositorio: `carlosjmunoz78/fenix-capital-inmo-map`
- Rama de trabajo: `preprod-app-phase1`
- Preview PRE-PROD: `https://carlosjmunoz78.github.io/fenix-capital-inmo-map/`
- No tocar `main`.
- No tocar PROD.
- No tocar WordPress.
- No tocar Supabase PROD.
- No mergear PR #2 sin orden expresa.
- No debilitar tests.
- No ampliar permisos para hacer pasar QA.
- No inventar datos, campos, endpoints, estados o reglas.

## 2) FORMA DE TRABAJO

Cuando Carlos diga `PROCEDE`, `DALE`, `CONTINÚA`, `PROSIGUE`, `MIRA` o `YA?`, significa ejecutar.

No devolver un plan si puedes actuar. Trabajar en bloques amplios y sin checkpoints frecuentes. Solo preguntar ante:

1. bloqueo real;
2. riesgo grave o irreversible;
3. decisión de negocio que solo Carlos pueda tomar.

Si falla CI, investigar, corregir la causa real y relanzar sin pedir permiso, siempre sin debilitar pruebas ni seguridad.

## 3) REGLA DE VALIDACIÓN

No decir «ya puedes mirar» hasta verificar para el HEAD exacto:

1. rama `preprod-app-phase1`;
2. workflow PUSH correspondiente exactamente al HEAD;
3. `build-and-browser-qa` SUCCESS;
4. Build SUCCESS;
5. Browser QA SUCCESS;
6. publicación snapshot SUCCESS;
7. `gh-pages` con mensaje exacto `deploy: PRE-PROD Pages snapshot <HEAD>`;
8. Pages del SHA de `gh-pages` en `completed / success`.

## 4) ESTADO DE FASE 4

Fase 4 está cerrada funcionalmente. El documento de cierre contiene el detalle completo. No rehacer los módulos siguientes salvo una regresión reproducible:

- responsive/navegación;
- Ana/homogeneidad;
- altas de Contactos, Inmobiliarias, Tareas, Expedientes y Bancos;
- fichas/detail principales;
- acciones contextuales con confirmación;
- persistencia canónica expuesta;
- RBAC transversal;
- motor financiero Belén bajo gobierno humano;
- Economía;
- Herencias;
- Obras Nuevas;
- Notarías;
- Registros de la Propiedad.

## 5) ÚLTIMO HITO FUNCIONAL ANTES DE DOCUMENTACIÓN

El último código funcional antes de crear la documentación final fue:

`f479535993e273484a1a2ea637f8f13ee32ca6a1`

Ese SHA quedó completamente verde con:

- PUSH run `33262140569` / #2712;
- Build SUCCESS;
- Browser QA SUCCESS;
- snapshot SUCCESS;
- `gh-pages` `7fdedd0d9a32d5df43117e2236a0965ea7c342e8`;
- Pages `33262289447` / #414 SUCCESS.

**IMPORTANTE:** este prompt y el cierre documental crean commits posteriores. Al empezar un nuevo chat, NO uses `f479...` como HEAD actual. Verifica siempre el HEAD real de `preprod-app-phase1` y su pipeline final.

## 6) HERENCIAS / OBRAS NUEVAS — ÚLTIMO HUECO CERRADO

Antes del cierre, `/herencias/nuevo` y `/obras-nuevas/nuevo` eran preparación de UI sin persistencia. Ya están cableadas a creación real PRE-PROD mediante `fenix-special-cases-runtime-test` con JWT obligatorio y autorización server-side.

### Herencia
Fases canónicas:
`Entrada → Documentación → Análisis administrativo → Gestiones / interlocutores → Seguimiento → Preparación de firma → Firma en notaría → Cierre`

### Obra Nueva
Fases canónicas:
`Entrada → Recepción documental → Control administrativo → Faltantes / incidencias → Preparación / envío a interlocutor → Seguimiento → Preparación de firma → Firma en notaría → Cierre`

Garantías cerradas:
- revisión previa;
- confirmación explícita;
- Dirección autorizada;
- rol no autorizado 403;
- validación de fases/estado;
- duplicados rechazados;
- creación en fuente canónica;
- navegación al detalle creado;
- regresión `tests/special-cases-create.spec.ts`.

No confundir DEMO PRE-PROD con registros canónicos.

## 7) BANCOS

Alta canónica cerrada. No rehacer salvo regresión.

- `fenix-bank-actions-test` autenticada;
- Dirección crea;
- Financiero 403;
- duplicados controlados;
- revisar → confirmar → crear;
- prueba backend real ya ejecutada en el bloque de cierre previo.

## 8) NOTARÍAS / REGISTROS

Revisados y cerrados para el alcance actual.

- directorios canónicos;
- detalle + personal relacionado;
- alta real mediante `fenix-directory-actions-test`;
- JWT obligatorio;
- solo Dirección puede escribir;
- creación/reutilización de ficha y personal relacionado;
- preview/confirmación en frontend;
- navegación fail-closed.

Ruta canónica de Registros en la app: `/registros-propiedad`.

## 9) ECONOMÍA / TARIFARIO

Reglas vigentes:

- Hipoteca < 180.000 € → 3.500 € + IVA.
- Hipoteca ≥ 180.000 € → 2% + IVA.
- Obra Nueva → 800 € + IVA.
- Herencia 1–2 directos → 600 € + IVA.
- Herencia 3+ directos → 800 € + IVA.
- Herencia con indirectos → 1.000 € + IVA.
- Herencia compleja directos + indirectos → 1.200 € + IVA.

No inventar umbral numérico para «muchos». La complejidad excepcional sigue siendo clasificación manual.

Origen inmobiliaria:
- comisión por defecto 1.100 €;
- editable por negociación;
- honorarios cliente editables;
- conservar recomendado + acordado;
- IVA separado del margen.

Economía es solo Dirección y no inventa cobros. Desde alta debe contemplar previsión y margen; los caídos salen de cartera activa y quedan como potencial perdido; los firmados conservan histórico final según datos disponibles.

## 10) MOTOR FINANCIERO BELÉN

Belén mantiene la última palabra financiera.

CEREBRO puede calcular, explicar, detectar, proponer y ordenar bancos, pero no debe convertir experiencia o recomendación en automatismo rígido sin aprobación/precedentes.

Referencias principales:
- ratio objetivo 35%; aproximadamente 37% solo contextual;
- autónomos: historial suficiente, referencia habitual mínima de 3 años;
- revisar ingresos líquidos, vida laboral, contrato, nóminas, movimientos, deudas, ahorro, porcentaje de financiación y documentación;
- flujo de referencia: viabilidad → contrato/docs → banco → CIRBE → condiciones → pretasación/tasación → validación técnica → FEIN → acta → firma;
- bloqueo de tasación anómala requiere validación de Belén.

## 11) DOCUMENTOS

No afirmar que el visor actual renderiza binarios PDF/imagen si únicamente existe metadata/detalle. Esa limitación sigue vigente hasta implementar un endpoint binario seguro y pruebas específicas.

## 12) REACT / DOM

No mover componentes React ya montados con `insertBefore`, `appendChild` u otra mutación DOM cruda. Usar portales, hosts, guards, composición React o CSS order.

## 13) FUENTE CANÓNICA

No duplicar maestros. Auditar siempre antes de escribir.

Fuentes conocidas incluyen:
- Expedientes;
- Contactos;
- Inmobiliarias;
- Bancos;
- Documentación;
- Comisiones;
- Herencias;
- Obras Nuevas;
- Notarías;
- Registros;
- Personal relacionado.

## 14) QUÉ HACER AL ABRIR EL SIGUIENTE CHAT

1. Leer `docs/CIERRE_MAESTRO_FASE_4_2026-08-29.md` y este prompt.
2. Verificar el HEAD real de `preprod-app-phase1`.
3. Verificar que el pipeline final y Pages de ese HEAD están verdes.
4. Si están verdes, declarar Fase 4 cerrada y no modificarla sin una regresión real.
5. Continuar con la siguiente fase/objetivo que indique Carlos usando la arquitectura existente, sin rediseñar por defecto.
6. Si el usuario no ha definido todavía el alcance exacto de la nueva fase, solo preguntar si la decisión cambia producto/negocio; no pedir que repita contexto técnico ya documentado.

## 15) REGLA DE COMUNICACIÓN

Estados útiles únicamente:
- «He encontrado X y estoy corrigiendo Y».
- «HEAD nuevo Z, workflow ejecutándose».
- «Falló Browser QA por X; ya está corregido y relanzado».
- «Todo verde, Fase 4 cerrada».

No saturar con planes, checkpoints o instrucciones de guardar versiones intermedias.

## 16) OBJETIVO

Mantener Fase 4 estable y cerrada, preservar fuente canónica + RBAC + Ana + Economía + motor Belén, y construir la siguiente fase de forma incremental sobre este estado validado.
