# Regla canónica de clasificación documental

Desde 2026-09-03, los documentos nuevos se identifican con **tipo documental + persona o referencia** antes de OCR/extracción.

Ejemplos: `DNI Emilia García.pdf`, `Nómina Emilia García agosto.pdf`, `Préstamo BBVA Emilia García.pdf`, `Tarjeta visita Marta Pérez Inmobiliaria Centro.jpg`.

Si el nombre no permite determinar con claridad qué documento es o a quién pertenece, la APP/CEREBRO debe detener el tratamiento y preguntar ambos datos antes de continuar. En expedientes con varias personas, usar apellidos u otra referencia suficiente para desambiguar. El legado no se renombra retroactivamente.

Flujo: clasificación confirmada → original preservado → OCR/extracción → resumen → contraste → propuesta de autorrelleno → conflictos → confirmación humana → actualización trazable → contexto CEREBRO/Ana.
