# UMS-001 · 31 protagonistas individuales FLUX · ejecución y archivo físico · 2026-11-08

## Resultado HECHO físicamente
- GitHub Actions [run 42519089192](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42519089192): **success**; 31/31 retratos WEBP generados por FLUX 1.1 Pro vía Replicate.
- Descarga del artifact `UMS001_FLUX31_SOLO_CANONICAL_CANDIDATES_42519089192`; archivos 31/31 verificados contra SHA-256 y legibles por PIL.
- Las 31 imágenes individuales miden 896 × 1152. Se conserva la salida exacta original, seed y prompt de cada persona, prediction_id y costes previstos.
- Archivo de las 31 fuentes **inmutables** en [Drive · CASTING 31 INDIVIDUALES](https://drive.google.com/drive/folders/1LPrgpu_6joV7-KMi3HSnmUWQbjsq6W6V), donde se verificaron 31 imágenes + 3 mosaicos + status.json + manifest original + ZIP de respaldo (37 archivos).
- 31 fichas nuevas de actor en [Notion · 🎞️ Assets](https://app.notion.com/p/7b135ed0bf0542eba0f680a9be5bb6fd), con clave idempotente, actor_id, group_id, archivo y URL Drive, SHA-256, resolución y QA pendiente; lectura posterior comprobó 31 claves distintas.
- Respaldo anterior íntegro de 65 imágenes ChatGPT distintas y alias (78 rutas), 4 ZIP y 65 fichas de Notion permanece en [Drive · Resguardo](https://drive.google.com/drive/folders/1K20-szrAmuW090OlAam1QY2SnQtVkV_a). Los originales FLUX 16 retratos grupales, las 6 imágenes Kontext anteriores y 32 escenas andaluzas tampoco se han reemplazado.
- Nuevas carpetas de destino [CASTING PERSONAJES APROBADOS](https://drive.google.com/drive/folders/1T1gVjFDgiTdPqP2M3GAK8SGH30HnidV1) y [DERIVADOS 10 PLANOS POR ACTOR](https://drive.google.com/drive/folders/1xjBQqxQ9DucD2EbgyAl_Z5MOjOLnfcL8) creadas **vacías hasta superar QA**.

## Límite editorial y de identidad
31 **nuevos retratos individuales generados desde texto** NO garantizan ser las mismas caras de los 16 retratos de grupo originales. Es una nueva versión de casting; los originales de las dos versiones deben conservarse y quedar referenciados por su propia procedencia.

**QA NO superado todavía:** identidad visual exclusiva global, continuidad entre los 10 ángulos por actor, composición de pareja/familia manteniendo todos los rostros, detalles de anatomía, créditos/condiciones comerciales y exactitud de edades.

**Incidencias iniciales observadas:**
- `C15_01_MARINA`: encuadre de busto no muestra de forma inequívoca la silla de ruedas, aunque el brief la requiere. Rehacer plano de tres cuartos/cuerpo entero con FLUX Kontext usando el retrato nuevo como ancla. Nunca eliminar el original.
- `C14_03_ADOLESCENTE_14`: edad aparente puede resultar mayor, confirmar antes de uso.
- Familias `C08` y `C14`: la foto de grupo vieja no contiene todos los hijos requeridos. Ahora hay cuatro fotos individuales para cada familia, pero falta **foto grupal/escena real con las cuatro identidades coincidentes**.

Se han verificado unicidad de IDs y de hashes de archivo, **NO equivalencia biométrica ni distinción perfecta de los rostros**. Un detector frontal de caras o una semilla reproducible no prueban continuidad fisonómica.

## Costes y seguridad
- 31 × 0,04 USD = **1,24 USD estimados**; importe real pendiente de conciliar con factura Replicate.
- 5 ediciones Kontext Pro (dos Lucía, Hugo, Mateo, corrección de Marina) encargadas en [run 42522105360](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42522105360), **HECHO físicamente, run SUCCESS**: cinco imágenes descargadas, SHA256 verificado, archivadas en [Drive · FLUX Kontext5](https://drive.google.com/drive/folders/1YjGGwcYTdPEFpDfqG6LwPiDba66ubkFu) y registradas en cinco fichas de Notion. Estimación **0,20 USD**, sin publicación. [Comparativa original vs derivados](https://drive.google.com/file/d/1onmOYMshWWWBmrTyCJNXsJbDi2Jkrg8Z/view?usp=drivesdk). La silla de ruedas de Marina se aprecia ahora en la variante; QA final de identidad facial y derechos todavía pendiente.
- `company_id=fenix`, `engine_id=UMS-001`, `environment=LAB`, nuevos derivados requieren `actor_id+anchor_sha256`, no tocar App/CRM/Supabase/SEO/WordPress/PROD.

## Próximos gates
1. Visual QA de los 31 candidatos: rostros diferentes entre grupos (ej. Hugo vs Mateo), edades coherentes, calidad premium. Tras aprobar cada candidato, fijar un `immutable_actor_anchor_sha256`.
2. Verificar el piloto de FLUX Kontext con las cinco imágenes: errores faciales, drift, proporciones, silla de ruedas visible.
3. Producir primero 3–4 ángulos del mismo personaje por secuencia con imágenes referencias aprobadas; control de consistencia antes de escalar a 310 vistas.
4. Generar escenas de familia y pareja con múltiples referencias aprobadas (comprobar compatibilidad del modelo y presupuesto).
5. Solo tras QA crear guiones/storyboards, voz original, clips Runway y montajes Reels de Instagram y Facebook. La publicación seguirá OFF hasta aprobación y requisitos de derechos.

**No confundir CREAR con APROBAR.** Las fuentes originales y los registros son reutilizables e inmutables.
