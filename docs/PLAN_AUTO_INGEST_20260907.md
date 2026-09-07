# Plan auto-ingesta documental

Objetivo: subir en lote todos los documentos de un expediente, clasificarlos nativamente por interviniente y tipo documental, lanzar extracción IA solo para lectura/estructuración de contenido y actualizar la interfaz sin acciones manuales de "Releer" ni refrescos.

## Contrato
1. El usuario crea/añade intervinientes e indica su rol en la operación.
2. El usuario sube todos los documentos del expediente en una sola acción.
3. La app resuelve de forma nativa a qué interviniente y familia documental pertenece cada archivo usando metadatos/nombre normalizado y reglas deterministas.
4. La IA no decide dónde va el documento: solo extrae contenido, incluidos PDFs que contienen imágenes.
5. Cada documento dispara automáticamente su análisis al quedar persistido.
6. El resultado se escribe en la ficha documental correspondiente y en los campos estructurados del contacto/expediente según el contrato existente.
7. La interfaz recibe el nuevo estado automáticamente y muestra progreso por documento sin bloquear al usuario.
8. Debe existir reintento seguro e idempotente para documentos que fallen.
9. Ningún fallo parcial debe obligar a reprocesar el lote completo.
10. PROD solo se promueve cuando PRE-PROD, despliegue y smoke queden verdes.

## Loop de entrega
- Inventariar solo los puntos de entrada ya existentes de upload/reread/extract.
- Implementar orquestación automática e idempotente.
- Añadir cobertura de lote, clasificación determinista, reintento y actualización automática.
- Ejecutar PRE-PROD del HEAD exacto.
- Corregir únicamente fallos reales hasta verde.
- Merge a main.
- Esperar PROD Live Deploy + PROD Runtime Smoke.
- Verificar SHA servido y contrato de lectura sin writes destructivos.
