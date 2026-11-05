# SEO-001 · Web oficial, borradores y publicación autónoma progresiva · V0

**Decisión del propietario (05-11-2026):** operar sobre la web oficial `https://fenixcapital.es` para el trabajo SEO corriente. No duplicar innecesariamente borradores en STAGING. Conservar LAB aislado para pruebas de lógica y STAGING para cambios técnicos de riesgo.

## Flujo
1. Leer y auditar la web oficial con permisos de solo lectura. La web no se modifica por una auditoría.
2. Para una URL nueva, efectuar inventario de rutas y contenido publicado, comprobar slug libre, acceso de mínima autoridad y copia de seguridad/restauración. No editar ni eliminar contenidos existentes.
3. Crear un artículo o landing nuevo **en estado WordPress `draft`** en la web oficial solo cuando estén verificados permisos de escritura restringida, QA editorial, política, copias recuperables y rollback. La URL no se considera públicamente publicada.
4. Notificar al propietario con revisión de contenidos. Su aprobación autenticada debe referirse a la versión exacta mediante digest y permitir su primera publicación. Correcciones se convierten en evidencias de training.
5. Contar como experiencia positiva únicamente misiones **reales** publicadas con aprobación comprobada y QA independiente favorable. En cada clase de contenido y empresa se exigen tres aprobaciones favorables más puntuación de excelencia (>=90, calidad>=90, seguridad>=95), identidades IAM, auditoría, backup y rollback.
6. Una vez verificados estos requisitos, conceder mediante el Gateway del propietario un permiso específico y revocable para publicar **URLs nuevas del mismo tipo**, con comprobación de seguridad, contenido y cuotas en cada publicación. La excelencia sola no crea permisos. Si falla la calidad, se suspende la facultad y vuelve la revisión humana.
7. Hipotecas, financiación y afirmaciones reguladas: comprobar hechos y fuentes, aplicar revisión jurídica cuando sea necesaria. Sin verificación, nunca publicar automáticamente.

**No se han cambiado credenciales, puestos, páginas publicadas ni WordPress.** Lo que se añade en esta PR es el contrato de decisión y pruebas negativas; falta enlazarlo al WordPress real mediante el plugin existente y su IAM, con snapshot, validación y rollback. No se afirma que se haya creado un borrador real o que ya exista publicación autónoma.

No aumentar suscripciones ni contratar IA de pago para esta operativa. Conservación estricta de App, CRM, Supabase, WordPress y demás sistemas. 
