# FACT-001 · GitHub P1 · Bloqueo de creación de repositorios · 2026-11-11

**Estado:** BLOQUEADO SOLO PARA CREACIÓN/ADMINISTRACIÓN GLOBAL. CRUD de archivos/ramas/PR del repositorio LAB mantiene su evidencia anterior. No repetir POST de creación ya denegado.

## Evidencia de fuente de verdad y estado actual
- Identidad GitHub normal leída: usuario `carlosjmunoz78`.
- Cuentas instaladas visibles: usuario `carlosjmunoz78`, organizaciones `fenix-cerebro` y `fenix-cerebro-os` (esto NO supone permiso sobre organizaciones).
- Tres instalaciones GitHub App visibles: IDs `105406507`, `176939652`, `177545321`. El conector disponible entrega IDs y `repository_selection=all`, no expone permisos de creación/admin por instalación. No inferir derechos.
- Fallo físico anterior ya documentado: `POST /user/repos` con conector Universal de ChatGPT → `403 Resource not accessible by integration`; no repositorio de prueba creado. Se evitó repetir el POST y arriesgar un duplicado.
- Supabase Vault, proyecto `cluhljgonannaafpmblx`: no aparece por metadatos `cerebro_github_factory_pat_v1` ni `cerebro_github_factory_app_private_key_v1`. Nunca se pidieron ni imprimieron valores.
- La identidad `GITHUB_TOKEN` de Actions del repo no tiene permisos para administrar cuentas ni crear repositorios externos. Los conectores ChatGPT y Gateway son identidades distintas.

## Resolución que se deja delimitada
Utilizar una instalación **existente** de GitHub App si puede recibir el permiso preciso `Repository creation: write` para la cuenta titular, u otra credencial de servicio soportada de alcance equivalente. No otorgar permisos administrativos generales a todos los repositorios por comodidad. Si se necesita una autorización interactiva de GitHub, será una única intervención del titular sobre el scope exacto.

La custodia del secreto de servicio será exclusivamente en Vault/backend y las sesiones de instalación no se expondrán en GitHub Actions. Usar token efímero para create/permissions, política de repo privado con nombre fijo LAB, read-back/branch protections/actions/restore, auditoría, idempotencia y rollback. No crear repositorio hasta poder verificar lifecycle y desactivación o archivo/borrado seguro según permisos.

## Resultado de este bloque
- `CHATGPT_GITHUB_FILE_CRUD=EXISTENTE_VERIFICADO` (evidencia histórica).
- `CEREBRO_GITHUB_REPO_CREATE=BLOCKED_CREDENTIAL_NOT_AVAILABLE`.
- `REPO_LAB_CREATED=FALSE`, `PROD_MAIN_MODIFIED=FALSE`, `NEW_SUBSCRIPTIONS=0`.
- `next_block=GITHUB_APP_OWNER_CONSENT_SCOPED_BACKEND_CREDENTIAL`.
