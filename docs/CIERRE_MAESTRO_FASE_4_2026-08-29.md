# FÉNIX CAPITAL · CEREBRO OS · CIERRE MAESTRO FASE 4

**Fecha:** 29/08/2026  
**Entorno:** PRE-PROD  
**Repositorio:** `carlosjmunoz78/fenix-capital-inmo-map`  
**Rama exclusiva:** `preprod-app-phase1`

> Este documento cierra funcionalmente la Fase 4. El SHA final de cierre es el HEAD de `preprod-app-phase1` que contiene este documento y el prompt de continuidad asociado. Debe validarse siempre contra el workflow PUSH exacto, el snapshot exacto de `gh-pages` y GitHub Pages antes de considerar el cierre publicable.

## 1. Reglas de seguridad que permanecen vigentes

- No tocar `main`, PROD, WordPress ni Supabase PROD.
- No mergear PR #2 como parte de este cierre.
- No ampliar permisos ni debilitar pruebas para superar QA.
- RBAC backend-first y fail-closed.
- Si `/navigation` falla, la navegación visible se reduce a Inicio.
- Una deep route no puede elevar permisos.
- Escrituras sensibles con revisión/vista previa y confirmación.
- No inventar campos, endpoints, reglas, datos ni estados: usar contratos canónicos auditados.
- Datos DEMO de Herencias/Obras son únicamente PRE-PROD y no equivalen a producción.
- No mover nodos propiedad de React con mutaciones DOM crudas.

## 2. Estado cerrado por bloques

### A · Responsive / navegación
Cerrado. Shell común, navegación autorizada, modo oscuro, feedback de interacción y controles críticos cubiertos por Browser QA.

### B/C · Ana + homogeneidad
Cerrado para el alcance de Fase 4. Ana permanece contextual y consistente en los módulos operativos; las acciones sensibles mantienen revisión y confirmación. Correcciones/aprendizaje conservan gobierno y trazabilidad.

### D · Altas
Cerrado para las altas expuestas y confirmables en esta fase:

- Contactos: alta real.
- Inmobiliarias: alta real.
- Tareas: alta real.
- Expedientes: alta real.
- Bancos: alta real, control de duplicados y RBAC server-side.
- Notarías: alta real canónica y personal relacionado.
- Registros de la Propiedad: alta real canónica y personal relacionado.
- Herencias: alta real canónica PRE-PROD.
- Obras Nuevas: alta real canónica PRE-PROD.

### E · Fichas / detail
Cerrado dentro del contrato actual. Expedientes, contactos, inmobiliarias, bancos, tareas, Herencias, Obras Nuevas, Notarías y Registros disponen de detalle navegable según permisos. Las relaciones canónicas mantienen navegación cuando existe ID real.

**Limitación deliberada:** el visor documental actual representa detalle/metadata y navegación de documento; no debe describirse como render binario universal de PDF/imagen hasta que exista un endpoint binario seguro explícito.

### F · Botones / acciones / flujos
Cerrado para las acciones publicadas y cubiertas por el contrato actual. Los flujos sensibles no deben mostrar falso éxito: 403 se interpreta como aislamiento de permisos. Seguimientos y escrituras verificadas pasan por preview/confirmación.

### G · Persistencia / fuente canónica
Cerrado para las altas confirmables expuestas en Fase 4. El hueco final detectado era Herencias/Obras Nuevas: la UI de alta existía, pero no persistía. Se corrigió mediante el runtime autenticado `fenix-special-cases-runtime-test`, manteniendo Notion como fuente canónica de esos módulos en PRE-PROD.

### H · RBAC
Cerrado para el alcance de Fase 4 mediante contratos y regresiones por rol. Dirección conserva ámbito global operativo; Financiero y Visitador permanecen recortados. Los 403 son aislamiento esperado, no errores de datos.

### I · Motor financiero Belén
Integrado bajo gobierno humano. CEREBRO puede exponer criterios, contexto, ranking/estrategia y conocimiento aprobado, pero no convierte una recomendación de Belén en automatismo rígido sin precedentes y aprobación. Belén mantiene autoridad final financiera.

Reglas base vigentes en el motor:
- objetivo de ratio 35%; entorno ~37% requiere validación contextual;
- autónomos con historial suficiente, referencia habitual mínima de 3 años;
- estudio de 100% según perfil y condiciones aprobadas;
- documentación, CIRBE, banco, pretasación/tasación, FEIN, acta y firma como flujo de referencia;
- excepciones y cambios de criterio bancario requieren lectura contextual y no una regla ciega.

### J · Herencias
Cerrada la brecha de creación/persistencia. Fases canónicas:

`Entrada → Documentación → Análisis administrativo → Gestiones / interlocutores → Seguimiento → Preparación de firma → Firma en notaría → Cierre`

Alta real con nombre/referencia, estado, fase y siguiente acción soportados por la fuente canónica; duplicados rechazados; Dirección autorizada y rol no autorizado rechazado; detalle/timeline conserva la experiencia existente.

### K · Obras Nuevas
Cerrada la brecha de creación/persistencia. Fases canónicas:

`Entrada → Recepción documental → Control administrativo → Faltantes / incidencias → Preparación / envío a interlocutor → Seguimiento → Preparación de firma → Firma en notaría → Cierre`

Mismas garantías de revisión, confirmación, duplicados, RBAC y navegación al detalle que Herencias.

### L · Notarías / Registros
Revisados contra runtime y backend PRE-PROD:

- directorios leen fuente canónica;
- fichas cargan datos y personal relacionado;
- navegación falla cerrada;
- altas usan `fenix-directory-actions-test` con JWT obligatorio;
- solo Dirección puede ejecutar alta;
- el backend crea/reutiliza la ficha principal y crea/reutiliza personal relacionado sin duplicar maestros;
- escritura limitada a propiedades ya existentes en las fuentes auditadas.

### M · Cierre total
Cierre funcional alcanzado bajo el contrato de Fase 4. Antes de pasar a la fase siguiente, el HEAD que contenga este documento debe superar el pipeline final completo y quedar publicado como snapshot PRE-PROD exacto.

## 3. Conocimiento comercial vigente

### Hipotecas
- < 180.000 €: 3.500 € + IVA.
- ≥ 180.000 €: 2% + IVA.
- Honorarios pactados pueden sobrescribir la recomendación; conservar recomendado + acordado.

### Origen inmobiliaria
- Comisión propuesta por defecto: 1.100 €.
- Editable por negociación.
- Ejemplo estándar sobre 3.500 €: margen base Fénix 2.400 € antes de otros gastos.
- IVA siempre separado del margen.

### Obra Nueva
- 800 € + IVA, con posibilidad de importe acordado registrado si el contrato de datos lo soporta.

### Herencias
- 1–2 directos: 600 € + IVA.
- 3+ directos: 800 € + IVA.
- Con indirectos: 1.000 € + IVA.
- Compleja con directos + indirectos: 1.200 € + IVA.
- No existe umbral numérico aprobado para «muchos»; `complex_mixed` sigue siendo clasificación manual.

## 4. Economía

Economía continúa siendo solo Dirección y de lectura operativa. La proyección implementada distingue:

- cartera prevista activa;
- previsión avanzada;
- firmado/devengado;
- ingreso potencial perdido;
- margen previsto restando comisión cuando procede;
- negociación de honorarios/comisión;
- cobro únicamente cuando exista fuente canónica real.

No debe inventarse estado de cobro. Las operaciones caídas salen de cartera activa y conservan su valor como potencial perdido. Las firmadas se tratan como histórico final dentro del dato disponible.

## 5. Backend PRE-PROD relevante

- `fenix-app-gateway-test`
- `fenix-notion-runtime-test`
- `fenix-notion-actions-test`
- `fenix-bank-actions-test`
- `fenix-special-cases-runtime-test`
- `fenix-directory-actions-test`
- `fenix-belen-financial-context-test`
- runtimes específicos de Notarías y Registros

Las funciones de escritura sensibles auditadas usan autenticación y validación server-side. No trasladar esta lógica a confianza de frontend.

## 6. Pruebas/regresiones relevantes

La suite de Browser QA incluye, entre otras:

- navegación/autorización por rol y deep routes;
- create routes autorizadas;
- altas canónicas de expediente y banco;
- creación confirmada de Herencias/Obras Nuevas;
- acciones contextuales con preview/confirmación y 403;
- Notarías canónicas y fail-closed;
- navegación/ficha de Registros;
- reglas comerciales, overrides y proyección de Economía;
- conocimiento y gobierno de Ana;
- contexto financiero Belén;
- intervinientes de casos especiales;
- homogeneidad y feedback de interacción.

La creación final de Herencias/Obras Nuevas queda bloqueada por `tests/special-cases-create.spec.ts`.

## 7. Punto funcional inmediatamente anterior a esta documentación

Último HEAD funcional ya validado antes de añadir documentación de cierre:

`f479535993e273484a1a2ea637f8f13ee32ca6a1`

Validación confirmada de ese bloque:

- workflow PUSH `33262140569` / #2712;
- Build SUCCESS;
- Browser QA SUCCESS;
- publicación snapshot SUCCESS;
- `gh-pages` `7fdedd0d9a32d5df43117e2236a0965ea7c342e8`;
- mensaje `deploy: PRE-PROD Pages snapshot f479535993e273484a1a2ea637f8f13ee32ca6a1`;
- Pages `33262289447` / #414 SUCCESS.

La documentación posterior crea un HEAD nuevo y, por tanto, exige una validación final equivalente antes del cierre definitivo.

## 8. Criterio de paso a la fase siguiente

No iniciar cambios de la siguiente fase hasta confirmar para el HEAD final de esta documentación:

1. rama exacta `preprod-app-phase1`;
2. workflow PUSH del mismo SHA;
3. `build-and-browser-qa` SUCCESS;
4. Build SUCCESS;
5. Browser QA SUCCESS;
6. publicación de snapshot SUCCESS;
7. `gh-pages` con mensaje exacto `deploy: PRE-PROD Pages snapshot <HEAD>`;
8. GitHub Pages sobre el SHA de `gh-pages` en `completed / success`.

## 9. Qué NO está prometido por este cierre

- No se ha tocado ni desplegado PROD.
- No se ha mergeado a `main`.
- No se afirma render binario universal de documentos.
- No se inventa fuente de cobro.
- No se ha convertido el criterio de Belén en automatismo rígido.
- No se consideran canónicos los registros DEMO de Herencias/Obras.
- No se define el umbral numérico de complejidad de herencias.

## 10. Resultado

Fase 4 queda funcionalmente cerrada en PRE-PROD dentro del alcance y contratos auditados. El siguiente chat debe partir del HEAD final validado, no del SHA funcional previo, y no reabrir módulos cerrados salvo regresión demostrada.
