# L23 · Analytics, Tracking, Consent & Attribution

**Owner:** OBS/Marketing + WEB-001 · **Auditoría:** HECHO · **Resultado:** PARCIAL

## Hallazgos
- Marcadores Google Analytics, Meta Pixel y Complianz aparecen en 204/204 capturas.
- No se detecta marcador GTM separado; no implica falta de analítica porque GA puede cargar sin GTM.
- La presencia de scripts no prueba que el consentimiento bloquee/active tags correctamente ni que eventos conviertan.

## Acciones
- Testar tags antes/después de consentimiento por categoría.
- Definir diccionario de eventos y atribución lead→expediente→firma.
- Evitar duplicidad de píxeles/eventos.