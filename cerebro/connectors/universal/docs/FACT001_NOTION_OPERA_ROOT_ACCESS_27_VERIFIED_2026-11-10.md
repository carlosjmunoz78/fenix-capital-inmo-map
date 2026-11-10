# FACT-001 · Auditoría física de permisos Notion tras conexión manual en Opera · 2026-11-10

## HECHO: 27/27 verificadas con la identidad propia de CEREBRO
- Usuario confirmó en el chat que conectó todas las páginas abiertas previamente en Opera.
- Se preparó el inventario cerrado `notion-root-access.mjs`, compuesto por 27 IDs reales de páginas y databases anteriormente abiertas; solo GET de Notion a IDs predefinidos; cero lectura de cuerpos o títulos de contenidos, cero escrituras.
- Edge Function LAB `cerebro-fact001-headless-provider-lab` **v15 ACTIVE**, con ruta read-only `notion-root-access` protegida por la firma GitHub OIDC ya establecida y el token Notion independiente de Supabase Vault `cerebro_notion_service_token_v1`.
- OIDC restringida al workflow existente `.github/workflows/fact001-headless-provider-service-lab.yml`; el workflow nuevo inicialmente creado fue retirado porque no cumplía la política de `workflow_ref` (correcto: no relajar identidad).
- [Ejecución física #42897260029 — SUCCESS](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42897260029): 27 comprobadas, **27 ACCESS_VERIFIED**, 0 DENIED, 0 INCONCLUSIVE, `ANON_401=PASS`, `FORGED_401=PASS`, `PROD_403=PASS`.
- Financieros es una **base de datos**, no una página: se corrigió el tipo de endpoint en el inventario y volvió a pasar. Fénix Capital, inicialmente 404 en el primer intento, se verificó 200 en la segunda ejecución; ninguna de las dos sigue pendiente.
- Unit tests y strict read-only CI [#42896238997](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42896238997) SUCCESS después de corregir el UUID de Promos. No se modificó App, CRM, datos Notion, main, DNS ni recursos productivos ajenos.

## Abiertas en Opera: segunda tanda, pendiente de conexión humana
Se verificaron 12 pestañas nuevas en el Opera conectado (además de Fénix Capital ya verificada, abierta para diagnóstico):
1. Plantilla_Tarea_Notion
2. INMOBILIARIAS EN CÓRDOBA CAPITAL — base #1
3. INMOBILIARIAS EN CÓRDOBA CAPITAL — base #2
4. inmobiliarias_cordoba_capital — base #3
5. Tareas
6. Rol como arquitecto operativo Notion
7. Patrón ficha 360º · Oferta bancaria
8. Patrón ficha 360º · Tasación
9. Patrón ficha 360º · FEIN y firma
10. Ajuste UX menor · TIKTOK ADS
11. muestra_limpia_5_dias_redes_fenix_julio_2026
12. TEST · Imagen Notion AI · Fase 5

**ESTADO:** ABIERTO EN OPERA; conexión del usuario y auditoría con token CEREBRO todavía no confirmadas para esta segunda tanda. No inferir acceso por estar abierta en el navegador.

## Regla obligatoria para páginas nuevas
- Candidato `notion-connected-parent-gate.mjs`: los documentos que genere CEREBRO deberán crearse exclusivamente como subpáginas dentro de raíces aprobadas y cuyo acceso de integración propia CEREBRO haya sido verificado, nunca como nuevas páginas raíz huérfanas. Código y tests verdes en #42894767890, **no desplegado al pipeline de creación autónoma**.
- Nuevas raíces/documentos independientes requieren autorización inicial propia; las subpáginas heredan acceso de la raíz conectada según el modelo Notion salvo restricciones específicas.
- El espacio completo Notion no está certificado: inventario total, bases históricas/importaciones, archivos externos, restauración de contenido y auditoría integral pendientes. No promover automáticamente a PROD ni incrementar por inferencia el total global Notion (6/11).

## NEXT
Tras confirmación del usuario «LISTO» de las 12 pestañas nuevas, ejecutar lectura independiente firmada de estos IDs y registrar accesos. Después abrir una tercera tanda de raíces que falten; preferir excluir duplicados ya cubiertos y clasificar importaciones históricas antes de incluirlas en el backup integral.
