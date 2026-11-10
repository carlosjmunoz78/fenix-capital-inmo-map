# FACT-001 · Cloudflare: fábrica universal de departamentos internos, motores, empresas y webs

## Aclaración del alcance
«Departamento de Instagram» o «departamento de LinkedIn» = **un motor/departamento interno de CEREBRO que lleva su trabajo**, NO conectar desde esta misión las API sociales de Instagram o LinkedIn. El catálogo de infraestructura debe admitir también cualquier otro departamento, motor, empresa nueva o web sin rediseño, sin esperar a la consola.

### Objetivo funcional
Un único operador **headless**, con dos orígenes firmados (`owner_order` y `automation`), puede recibir intención → descubrir dependencias y recursos existentes → calcular recursos mínimos → scaffold FACT-001 → crear/configurar/implementar → probar → observar/operar/reparar → desplegar/revertir/eliminar según permisos. Aplica `CONSERVAR→ENTENDER→ENVOLVER→PROBAR→MEJORAR→MIGRAR`.

Cada motor mantiene `company_id`, `engine_id`, `environment`, `version`. Los motores son lógicos y comparten runtimes/workers cuando sea seguro; no un Worker por rol por defecto. Los recursos de Cloudflare son dinámicos según necesidad (Workers, Pages, D1, KV, R2, Queues y Access); no reservar ni pagar por cada unidad innecesariamente. Webs nuevas requieren propiedad del dominio, inventario DNS, SSL y reversión antes de cambiar rutas. Ninguna operación supone permisos sobre cuentas sociales externas.

### Trabajo ejecutado en LAB
- `src/cloudflare-onboarding.mjs`: plan declarativo reutilizable de 4 tipos: `department`, `engine`, `company`, `website`. Selección dinámica de recursos, nombres segregados, 4D, cuenta Cloudflare fija, coste adicional máximo 0 €, protección frente a colisiones y propiedad ajena mediante inventario verificado, bloqueo de DNS y PROD.
- `src/cloudflare-scaffold.mjs`: genera **18 archivos JSON reales en memoria** por departamento o web: manifest, config, data contracts, permisos, políticas, eventos, jobs, API, tests, evaluación, tribunal, observabilidad, costes, backup, rollback, rebuild, documentación y training hooks. Esto **no** significa que esos recursos ya estén creados ni los tests ejecutados en un proveedor.
- `tests/cloudflare-onboarding.test.mjs` y `tests/cloudflare-scaffold.test.mjs`: ejemplos de `social-instagram`, `social-linkedin` (departamentos internos), motores no sociales, empresas nuevas y webs; tests de aislamiento, nombres, recursos mínimos, propietario externo y protección PROD/DNS.
- CI [#42822832223](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42822832223): **28/28 pruebas PASS** (8 de onboarding + 4 de scaffold + 11 headless + 5 registry). Sin recursos nuevos, sin operaciones de API de escritura ni nuevos cargos.
- API Cloudflare OpenAPI validada: creación de Pages `POST /accounts/{account_id}/pages/projects` requiere Pages Write; D1 `POST .../d1/database` D1 Write; KV `POST .../storage/kv/namespaces` KV Write; Queues `POST .../queues` Queues Write; R2 `POST .../r2/buckets` R2 Storage Write. La publicación de código Workers tiene contrato multipart/versión y se debe adaptar y probar, NO asumir que un JSON POST genérico basta.
- Antecedentes de **pruebas físicas LAB** independientes: creación/lectura/eliminación de D1 EU con CEREBRO vía OIDC [#42700998048](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42700998048), y operaciones KV [#42697512937](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42697512937). Solo demuestran esas capacidades concretas, no despliegue total de departamento/website.

### Gates que faltan antes de VERDE global
1. Implementar drivers tipados y verificar permisos **CEREBRO autónomo** de creación/lectura/actualización/eliminación para Workers+Pages+D1+KV+R2+Queues+Access y otros recursos requeridos, no reutilizando OAuth de ChatGPT.
2. Registro durable e inventario de recursos/propiedad en backend independiente, secretos protegidos, asignación IAM por empresa/departamento, políticas de coste/cuotas Free, reconciliación de errores y reintentos, auditoría, monitorización.
3. D1/Workers/Pages/colas: test físico de un departamento real LAB completo, crear→configurar→desplegar→verificar→actualizar→rollback→borrar/retener solo el recurso nuevo; cero datos de clientes y limpieza final. No crear recursos ficticios innecesarios.
4. Test de una web nueva sin afectar `fenixcapital.es`, `app.fenixcapital.es` ni DNS existente, con dominio protegido y test de rollback. Los proyectos que realmente sirven PROD están protegidos independientemente del nombre.
5. Pasar tribunal, backup/rebuild, prueba de coste y gates de política. Solo después permitir activación automática de cualquier unidad con alcance de servicio aprobado.

### Estados honestos
- Diseño de FACT-001 y generación real de 18 archivos: **HECHO / TESTS VERDE**.
- Lectura independiente de Cloudflare: **HECHO / E2E VERDE** ([#42821438877](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42821438877)).
- D1/KV aislados en pruebas previas: **HECHO en esas operaciones**.
- Alta autónoma completa de cualquier departamento: **PARCIAL / FALTA E2E**.
- Alojamiento y ciclo de vida autónomo completo de nuevas webs: **PLANIFICADO / FALTA E2E**.
- Escrituras en PROD, DNS y recursos de App/CRM: **NO AUTORIZADAS POR ESTE OPERADOR**.

No se requiere interfaz gráfica para proseguir: el operator entra por Gateway/runners firmados y puede tener origen `owner_order` o `automation`. La consola será una vista opcional. Cero suscripciones contratadas y ningún recurso productivo alterado por estas nuevas plantillas.
