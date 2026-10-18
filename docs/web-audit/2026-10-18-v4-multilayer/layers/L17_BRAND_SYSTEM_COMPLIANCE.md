# L17 · Brand System Compliance

**Owner:** WEB-001 + BRANDBOOT capability · **Auditoría:** HECHO · **Resultado:** ACCIÓN REQUERIDA

## Hallazgos
- Manual Fénix: colores corporativos/publicitarios `#222222`, `#870064`, `#FFB71B`, `#FF5F00`.
- El manual reserva Montserrat solo a representaciones del logotipo, no a títulos/texto general/publicidad.
- Montserrat se aplica en CSS de 114/204 páginas, incluidas landings locales y CTAs: incompatibilidad directa con el manual.
- Existen colores auxiliares de theme/componentes; su mera presencia técnica no prueba incumplimiento visual.

## Acciones
- Definir tipografía web aprobada distinta de Montserrat o actualizar formalmente la norma de marca.
- Crear tokens web aprobados y hacer QA visual antes de reemplazos.
- Auditar logo, clearspace y tamaños mínimos.

## V5 · Aclaración operativa de marca web Fénix

Existe una preferencia/dirección explícita para la **UI web**: no se pretende una estética morada ni rosa. Esta regla no borra ni modifica el manual de marca ni sus activos oficiales; actúa como restricción de diseño web sobre cómo se distribuye el color en la interfaz.

### Regla
- base visual: blanco + negro/antracita + grises limpios;
- acentos preferentes: `#FFB71B` y `#FF5F00` cuando contraste/jerarquía lo permitan;
- `#870064` no debe dominar fondos, botones, cards, gradientes o acentos repetidos de la interfaz;
- conservar colores oficiales cuando formen parte inseparable de logo/activo aprobado;
- cualquier excepción debe quedar documentada y pasar contraste/accesibilidad.

### Gate
`FENIX_VISUAL_POLICY_GATE` forma parte de L16/L17/L18 y del tribunal V5. Una solución no puede declararse visualmente cerrada solo porque use colores incluidos en el manual: debe respetar también esta dirección de interfaz.