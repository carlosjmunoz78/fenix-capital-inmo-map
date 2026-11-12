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
- Una actualización de configuración Vercel del proyecto histórico `fenix-capital-preprod-app` alcanzó temporalmente su control de protección SSO; **se restableció inmediatamente** al estado protegido `enabled=true`, `deploymentType=all_except_custom_domains`, y se comprobó que ese proyecto no tenía despliegues ni dominios activos. No afecta el proyecto de demostración y no se efectuó promoción. El estado anterior exacto de ese ajuste no se había capturado, por lo que se documenta la incidencia en lugar de afirmar rollback idéntico.
- Rollback de UI real: quitar flag `visual_lab=cockpit-v3`, o descartar PR #57; no hay migraciones, rutas, DNS ni acciones destructivas. Eliminar proyecto de demostración es una operación separada a considerar tras revisión visual, no automática.

## Gates restantes
1. Aceptación estética/funcional de la vista previa con el usuario.
2. Owner E2E positivo sobre Gateway LAB **sin copiar JWT ni permitir acceso anónimo**.
3. Fuente verificable de empresas, proyectos, motores, trabajos/decisiones.
4. Tribunal, accesibilidad/seguridad, OLD vs NEW, rollback probado y promoción gradual.
