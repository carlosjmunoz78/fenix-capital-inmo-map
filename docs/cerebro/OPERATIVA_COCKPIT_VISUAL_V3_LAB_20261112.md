# Operativa · Cockpit visual V3 · 2026-11-12

## Alcance
Diseño visual y funcional **opcionales**, aislados en la rama
`cerebro/operativa-cockpit-visual-lab-v0-20261112` y PR #57 DRAFT.
**No desplegado a App PROD**, no se reemplazan la Operativa existente,
JARVIS, Neuronal, Navegador, CRM, Supabase, DNS, Wordpress ni main.

### Contrato de uso
- Barra original **Inicio · Jarvis · Operativa · Neuronal · Navegador** conservada.
- Vistas contextuales accesibles con un clic: Resumen, Entidades, Proyectos,
  Motores, Trabajos, Evidencias y Estado/Decisiones. No hay menú lateral.
- La vista nueva solo se renderiza cuando la URL lleva
  `/cerebro?section=operativa&visual_lab=cockpit-v3` **en una compilación de esta rama**.
  Al regresar a otros menús se conserva el indicador de ensayo.
- Sin el parámetro, `<CerebroOperativeConsole/>` conserva su presentación original.
- Sin logos ni marcas de producto; UI grafito, azul funcional, verde para verificaciones,
  ámbar para pendientes y rojo solo ante incidencias.
- Sin porcentaje global fingido. Estado/contadores vienen de `fetchCerebroActivity`
  vía fuente autenticada; se marca lectura LIVE/CACHED/UNAVAILABLE.
- El aro/pulso responde a **estado del cliente real**: escuchando, hablando,
  enviando, escribiendo o trabajos en ejecución. Si no hay actividad, no simula
  trabajo. `prefers-reduced-motion` desactiva animaciones por accesibilidad.
- El formulario y la voz utilizan el `CerebroConsoleShell` preexistente;
  se mantienen la autorización de propietario, el Gateway y los
  controles de ejecución existentes. No se introduce ninguna credencial.
- El inspector se muestra sobre la barra principal solo cuando está abierto,
  para que el botón de cierre sea alcanzable con ratón y teclado.

## Conexión funcional LAB · Implementada en esta rama (sin promoción)
- `GET /owner-universe?company_id=all` en el Gateway LAB v11 existente,
  mediante sesión Supabase del usuario, mismo dominio del proyecto, GET
  de solo lectura y respuesta saneada.
- El componente permite consultar **Entidades, Proyectos y Motores**:
  empresas verificadas y sin vincular diferenciadas, proyectos con ID/estado,
  estados de motores registrados, catálogo FACT-001 (definiciones) y directorios
  GitOps (estructura), además de ejecución observada en GitHub.
- La petición se cancela al cambiar de empresa/desmontar; los datos de otra
  selección no aparecen temporalmente al cambiar el contexto.
- Si el servidor niega AION o CAPTACASA, aparece `Sin autorización` y no se
  muestran los proyectos ni los motores de Fénix en la vista de esa empresa.
- Solo se habilitan acciones de consulta de empresa cuando su contexto está
  verificado por el servidor; un selector nunca concede permisos.
- `status=PARTIAL` muestra fuentes parciales; ausencia de registros no
  equivale a ausencia de recursos en todo CEREBRO.
- Datos del E2E nuevo **sintéticos**, no constituye prueba HTTP autenticada
  con el propietario real: ese gate continúa PENDIENTE.

### Datos disponibles vs no verificados
- Trabajos/motores se muestran solo cuando existen en la respuesta autorizada de
  actividad de GitHub, con los enlaces originales de evidencia.
- Empresas distintas a Fénix no reciben permisos por seleccionar una opción.
- **El inventario parcial de proyectos YA ESTÁ CONECTADO EN CÓDIGO DEL PREVIEW**
  por `GET owner-universe` en `cerebro-console-gateway-v36-followups-lab`.
  Se muestra únicamente una empresa/proyecto si la identidad y el Gateway
  confirman su contexto, no el censo de todos los sistemas.
- Cliente de la vista aislada: `src/cerebroOperativaLabUniverseApi.ts`
  y `src/CerebroOperativaUniverseViews.tsx`, filtrado server-side.
  No cambia el Gateway PROD de chat ni la página Operativa predeterminada.
- Estados actuales conocidos (última lectura administrativa previa): registro
  PREPROD de empresas vacío, overlay de JARVIS con un proyecto Fénix
  parcial, tabla PREPROD de motores vacía. No se presentan como inventario completo.
- Las decisiones humanas/HEM no se infieren de los fallos de workflow;
  esos fallos se denominan **revisiones**, no autorizaciones humanas.
- Los pasos internos INVESTIGAR/ANALIZAR/EJECUTAR/VERIFICAR/APRENDER se muestran
  como fases conceptuales y no como porcentaje telemétrico no disponible.

### QA
- Validación estática: `tests/cerebro-operativa-cockpit-v3-visual.test.mjs`.
- Build: `npm ci --ignore-scripts` + `npm run build`.
- Navegador Chromium con sesión y fuentes **SINTÉTICAS, AISLADAS**:
  `tests/cerebro-operativa-cockpit-v3-e2e.spec.ts`.
- E2E comprueba montaje exclusivo (sin doble interfaz), cinco pestañas superiores,
  fuente de actividad, núcleo en estado de trabajo, pantallas de Motores,
  Trabajos y Proyectos, inspector, envío real al cliente del Gateway simulado,
  escritorio, móvil de 390px y ausencia de scroll horizontal.
- Workflow solo QA, sin despliegue:
  `.github/workflows/cerebro-operativa-cockpit-v3-visual-lab.yml`.
- Ejecución ya certificada: [Run 43309186312](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43309186312)
  **SUCCESS** con screenshots desktop/mobile y V1 Gate compatible. El último
  ajuste cosmético (texto más corto en el compositor) debe ratificarse en la
  ejecución posterior de su propio commit; no utilizar la ejecución anterior
  como evidencia de un HEAD distinto.

### OLD vs NEW
OLD es la ruta predeterminada y conserva el código y selector de interfaz actual.
NEW reutiliza el mismo hook/contexto/voz y añade una presentación reactiva
separada, seleccionable explícitamente. No existe migración destructiva.

### Rollback
Quitar `visual_lab=cockpit-v3` de la URL o descartar PR #57 devuelve
la Operativa anterior. No hay migraciones de DB, cambios de backend ni
recursos por revertir. No se ha ejecutado rollback físico en producción
porque la rama no se ha promocionado.

### Gates para futuras promociones
1. Aprobación visual de escritorio/tablet/móvil con capturas reales.
2. E2E autenticado del propietario en entorno aislado y pruebas de permisos;
   el E2E actual usa exclusivamente fixtures para validar navegación, fuente LAB y denegación cross-company.
3. Conectar de forma verificada el inventario completo de empresas, proyectos,
   motores, costes, automatizaciones y decisiones humanas al mismo Gateway.
4. Auditoría OLD vs NEW, accesibilidad, rollback y política de producción.
5. Mantener PR DRAFT hasta reunir las pruebas exigidas.

Objetivo de coste: **0 € de suscripciones nuevas**. Los minutos de CI se usan
dentro de la infraestructura preexistente; no se acredita coste marginal
de facturación sin revisar consumo.
