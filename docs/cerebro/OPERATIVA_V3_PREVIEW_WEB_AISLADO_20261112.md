# Operativa V3 · Preview web independiente y aceptacion visual · 2026-11-12

## Hecho verificable
- Rama de origen protegida: `cerebro/operativa-cockpit-visual-lab-v0-20261112`, PR #57 DRAFT (sin merge a main).
- Nuevo proyecto Vercel **aislado**, solo para revisar el diseño interactivo: `operativa-v3-visual-lab`, ID `prj_xBJSrAxr43NWMcwvoBQ5gd8jNEPS`.
- **Compilación Vite operativa**: deployment `dpl_3A2wxMEX1nA4TCYvvHFRwPNu6gm7`, URL HTTPS:
  `https://operativa-v3-visual-r3ievc1i1-carlosjmunozcabeza-2582s-projects.vercel.app/`
- La protección de Vercel sigue activa en el proyecto de demostración; existe enlace compartible temporal de 7 días, generado para la revisión y NO guardado en el repositorio (contiene un secreto de acceso de alcance limitado a la demo).
- Confirmado en la sesión Opera del usuario (pestaña creada/reutilizada, sin alterar la pestaña App PROD): la página renderiza, se leen las cinco pestañas, el núcleo y el campo de orden; las capturas reales muestran el compositor por encima del corte de pantalla de aproximadamente 645px.
- El preview contiene únicamente **datos sintéticos y respuestas simuladas**, con aviso visible de DEMOSTRACIÓN. No importa credenciales, ni env vars privadas, ni usa el Gateway, ni abre acceso a App/CRM/Trading.
- Este preview sirve para aprobar visualmente V3 y las pantallas secundarias; **no sustituye** las pruebas E2E positivas de sesión de propietario ni las fuentes multiempresa.

## Correcciones de la rama
- CSS V3 de alcance aislado: `.cerebro-interface-bar` en flujo normal (no sticky/fixed) únicamente para Cockpit V3. El menú global de la App original y las otras pantallas no se modifica.
- CSS responsive para baja altura (max-height 780, min-width 781): reduce proporción de decoración/espaciado y prioriza entrada de órdenes.
- Historial de conversación V3: mirror **solo lectura** del mismo `.cerebro-chat-log` del cliente V0, sin segundo fetch ni segundo envío de órdenes, texto limitado y renderizado seguro como contenido React, no HTML.
- E2E de navegador con sesión y respuestas **simuladas**: verifica que el chat de la versión V3 refleje pregunta/respuesta y la barra no tape el composer; ventana 1300×645.
- [GitHub Actions Cockpit QA #43324005388](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43324005388) **SUCCESS**.
- [GitHub Actions Operativa V1 Gate #43324005373](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43324005373) **SUCCESS**.
- [Voice Contract V1 #43324005482](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43324005482) **SUCCESS**.

## Estado de permisos y publicación
- App/CRM/Supabase PROD/main no se han desplegado ni reemplazado; sigue pendiente autenticación positiva del propietario para conectar la V3 real.
- **No se ha contratado suscripción nueva**. Desplegar una demo Vite utiliza el Vercel ya conectado y puede consumir cuota del plan actual; no se acredita facturación final sin lectura de consumo.
- Una actualización de configuración Vercel del proyecto histórico `fenix-capital-preprod-app` alcanzó temporalmente su control de protección SSO; **se restableció inmediatamente** al estado protegido `enabled=true`, `deploymentType=all_except_custom_domains`, y se verificó después que **sí existen dominios y un despliegue READY históricos** en ese proyecto. El retorno de \`update_project\` había omitido esos campos; una lectura independiente de \`get_project\` corrigió esa interpretación. Por tanto, la protección SSO se considera CRÍTICA y se restauró antes de continuar. No puede acreditarse el ajuste previo exacto porque no se capturó snapshot antes de esa modificación accidental. No afecta el proyecto de demostración y no se efectuó promoción. El estado anterior exacto de ese ajuste no se había capturado, por lo que se documenta la incidencia en lugar de afirmar rollback idéntico.
- Rollback de UI real: quitar flag `visual_lab=cockpit-v3`, o descartar PR #57; no hay migraciones, rutas, DNS ni acciones destructivas. Eliminar proyecto de demostración es una operación separada a considerar tras revisión visual, no automática.

## Gates restantes
1. Aceptación estética/funcional de la vista previa con el usuario.
2. Owner E2E positivo sobre Gateway LAB **sin copiar JWT ni permitir acceso anónimo**.
3. Fuente verificable de empresas, proyectos, motores, trabajos/decisiones.
4. Tribunal, accesibilidad/seguridad, OLD vs NEW, rollback probado y promoción gradual.

## Evolución 13/11/2026 · Denegación por empresa y demo renovada

- Cambios **solo en PR #57 DRAFT**: `CerebroOperativeConsole.tsx` incorpora barrera de envío a empresa distinta de Fénix/alcance vinculado, tanto en llamada de chat como inicio de voz y dictado. Rechaza también enviar eventos `submit` artificiales, independientemente de deshabilitar el botón.
- `CerebroOperativeCockpitV3.tsx` deshabilita controles de texto, voz y dictado cuando no hay contexto de empresa autorizado; muestra razón legible al usuario.
- El historial del chat de Fénix se oculta al seleccionar un contexto no verificado y vuelve a aparecer al regresar; no se envía ningún dato a esa otra empresa.
- Para cambiar empresa durante una conversación/orden activa es necesario terminar dicha sesión; no se crea un segundo canal de ejecución ni se manipulan permisos del servidor.
- [Cockpit V3 Chromium #43326180174](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43326180174): **SUCCESS**, verifica el bloqueo de voz/dictado/envío e historial por empresa, el intento directo de enviar, la vuelta al contexto permitido y la compatibilidad de los controles.
- [Operativa V1 Gate #43326180204](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43326180204): **SUCCESS**.
- [Voice Contract #43326180277](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43326180277): **SUCCESS**.
- Se publicó una nueva **demostración sintética aislada**, deployment Vercel `dpl_JD4eNQoHEa4ud5aSTEmEc1CfkH66`, READY:
  `https://operativa-v3-visual-bkk7ueaat-carlosjmunozcabeza-2582s-projects.vercel.app/`.
- Revisión física por navegador Opera: pestaña `Operativa V3 · Vista previa` actualizada, UI renderizada, barra global completa y campo central visible. El enlace temporal protegido vence en siete días; **no guardar secretos de bypass aquí**.
- Los datos de la demostración son **sintéticos**; sus indicadores y peticiones no representan tareas reales. No se utiliza credencial personal, Supabase, CRM, Gateway ni proveedor de voz real.
- **Promoción bloqueada** hasta E2E positivo autenticado del propietario, prueba de permisos multiempresa reales, comparación OLD vs NEW, revisión de accesibilidad y aceptación visual.
- **Sin cambios a main, App PROD, CRM, Supabase PROD, Vercel histórico ni DNS** en esta evolución. La demo usa un proyecto ya creado en la fase anterior, sin contratar servicios nuevos; el coste facturable final de su cuota no se ha auditado.

## Gate adicional 13/11/2026 · Membresía cerrada por defecto

- El adaptador cliente de Owner Universe de `src/cerebroOperativaLabUniverseApi.ts` valida expresamente `owner_scope=SERVER_VERIFIED_FENIX_ONLY` mientras ese sea el contrato actual del Gateway LAB. Una etiqueta de scope desconocida se rechaza; no se asume acceso multiempresa.
- Dentro de ese scope solo se aceptan filas `company_id=fenix`; no se publican filas/proyectos/motores de otras empresas aunque apareciesen accidentalmente en una respuesta inconsistente.
- Para consultar una empresa concreta, se exige `access_status=VERIFIED_OWNER_CONTEXT_NOT_REGISTERED` exacto; `REGISTRY_PRESENT_INTEGRATION_UNVERIFIED`, cadenas desconocidas y campos ausentes no habilitan operaciones.
- Prueba Chromium con respuesta sintética deliberadamente mal formada para AION, incluyendo una fila de proyecto `MUST-NOT-DISPLAY`: el registro aparece no autorizado, la fila no se muestra y texto/voz siguen bloqueados.
- Verificaciones en Supabase **solo lectura**: `public.fenix_prod_actor_context_by_auth_server(uuid)` es SECURITY DEFINER, pero la lista de permisos PostgreSQL solo concede EXECUTE a `service_role` y `postgres`, no a `anon` ni `authenticated`. No se cambian permisos ni definiciones de funciones.
- [QA V3 con navegador y HTTP real](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43327589065): **SUCCESS**; [Operativa V1](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43327589016): **SUCCESS**; [Contrato de voz](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43327589196): **SUCCESS**.
- Gate NO SUPERADO: ninguna prueba HTTP positiva con la sesión real del propietario; no se ha solicitado copiar JWT, no se ha relajado autorización ni se ha promocionado main/PROD.
- Si se amplía a otra empresa, debe cambiar PRIMERO el contrato de identidad/membresía del servidor y pasar QA de segregación, después el whitelist cliente; nunca habilitarla solo mediante selector de UI.

## Revisión de rendimiento y sesión real · 13/11/2026

- **HECHO EN PR (sin modificar App PROD):** el observador del estado de voz/comandos deja de producir un estado React distinto en cada mutación de DOM. Se usa comparación de los 5 campos de `CoreSnapshot` y se devuelve el estado previo cuando son idénticos, evitando renderizados redundantes.
- Los observadores de `snapshot` y del espejo de conversación quedan limitados a `.operativa-core-bridge` cuando está presente, en vez de observar cambios ajenos de toda la App. No se crea ni cambia ningún transporte de chat.
- **PRUEBAS VERDES:** [QA visual y Chromium V3 #43328376790](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43328376790), [Operativa V1 Gate #43328376729](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43328376729), [Voice Contract #43328376706](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43328376706). Todas concluidas **SUCCESS**.
- **SOLO LECTURA, sesión de Opera:** la App `https://app.fenixcapital.es/cerebro?section=operativa` renderiza conversación, selector Fénix y el estado visual `CEREBRO conectado con transporte autenticado`. Esto es evidencia de funcionamiento de la **UI actual**, no un resultado de HTTP con JWT del propietario contra la función LAB.
- **POR VALIDAR:** ni el conector Opera ni el conector de pestañas disponibles ofrecen ejecución de JavaScript/acciones de formularios autenticados; no pueden generar una prueba positiva `GET /owner-universe` usando la sesión vigente. No se extraen, copian, imprimen, exportan ni rotan secretos, y no se inventan resultados de autenticación.
- **NO PROMOVER:** faltan E2E positivo real, alcance multiempresa y aceptación final, conforme a las restricciones del proyecto.

## Incidencia de barra superpuesta · Captura real del usuario · 13/11/2026

**Problema observado:** en `app.fenixcapital.es/cerebro?section=operativa`, la barra global Inicio/JARVIS/Operativa/Neuronal/Navegador aparece sobre el área del chat, dificultando ver y pulsar el compositor. Esa URL sigue siendo la App antigua en PROD, no la V3 de laboratorio.

**Corrección propuesta y probada SOLO en PR #57 DRAFT:**
- `src/cerebro-interface-bar.css`: regla de `position:relative` estrictamente bajo `.cerebro-console-host.view-operativa > .cerebro-interface-bar`. Evita que la cabecera `sticky` intercepte el chat al desplazarse. JARVIS, Neuronal, Navegador e Inicio conservan sus estilos y navegación sin cambio.
- Móvil (<=660px): las cinco pestañas siguen visibles a la vez en una distribución de cinco columnas sin una barra deslizante de 510px. El texto de cada pestaña se ajusta a su celda.
- `tests/cerebro-operativa-v3-e2e.spec.ts`: nueva regresión de la vista anterior con sesión sintética, aserción de posición relativa, orden de barra anterior al contenido, pestañas dentro de 390px y compositor visible; captura `test-results/operativa-legacy-nav-mobile.png`.
- El E2E de Cockpit V3 sigue verificando compositor, voz, inspector, navegación y no solapamiento.
- Evidencia en GitHub Actions: [Operativa V1 Gate #43329265717](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43329265717) **SUCCESS**; [Cockpit V3 Chromium #43329265791](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43329265791) **SUCCESS**; [Voice Contract #43329265940](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/43329265940) **SUCCESS**.

**No afirmar publicación:** este cambio no se ha fusionado a main, no se ha desplegado en App PROD, ni se ha probado el resultado en una sesión real de esa versión. La captura de usuario no representa el código V3 del PR. Pueden quedar estilos adicionales en el paquete PROD que solo se acreditarán mediante OLD vs NEW y aceptación visual real. El próximo gate sigue siendo el E2E positivo del propietario para Gateway LAB y después promoción gradual con rollback.
