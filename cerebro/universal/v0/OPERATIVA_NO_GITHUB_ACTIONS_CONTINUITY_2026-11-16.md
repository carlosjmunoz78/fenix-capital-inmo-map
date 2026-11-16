# CEREBRO OS · OPERATIVA · continuidad SIN GitHub Actions

Fecha 2026-11-16. Ámbito PR #66 DRAFT; emisor LAB `hnqlnvakzaywtafeiybt`; PROD sigue HOLD.

## Decisión y estado
El propietario informa de que **GitHub Actions está bloqueado temporalmente**. Este dato se trata como bloqueo externo indicado por el propietario; **no se espera su desbloqueo** para preparar ni ejecutar comprobaciones que tengan otro transporte seguro.

**EXISTENTE:** ciclo LAB oficial `security-lab/owner-session-auth-cycle-core.mjs` y ejecutor `owner-session-auth-e2e-private.mjs`. El lector LAB `public.cerebro_operativa_session_guard_lab_v0` existe y por inspección real en Supabase deniega `anon/authenticated`, admite solo `service_role`, y responde `false` para UUID inexistentes. El lector del emisor PROD está instalado y aislado pero no conectado.

**HECHO sin Actions:** `security-lab/operativa-no-actions.mjs`, un operador Node 22+ que NO depende de Actions, un proyecto Vercel, un Worker nuevo ni una suscripción. Modos:
- `--status`: solo estado, sin red ni secretos. `LIVE_AUTH_E2E=NOT_RUN`, `OPERATIVA_PROD=HOLD`.
- `--self-test`: invoca pruebas puras `node --test` del ciclo Auth LAB, contrato del lector PROD y validador FACT, **sin claves**. Requiere checkout completo del PR #66, no npm ni GitHub Actions. El proceso hijo recibe un entorno de variables restringido para impedir que herede secretos de PROD/CRM/otros conectores.
- `--live`: solo con la bandera exacta `CEREBRO_LAB_SESSION_E2E_ARM=CEREBRO-LAB-SESSION-E2E-ONE-SHOT-hnqlnvakzaywtafeiybt`, `CEREBRO_LAB_PROJECT_REF=hnqlnvakzaywtafeiybt`, `CEREBRO_LAB_SERVICE_ROLE_KEY` y `CEREBRO_LAB_PUBLISHABLE_KEY` obtenidas del **mismo LAB** y suministradas al proceso desde un gestor de secretos PRIVADO. Si falta un requisito, `BLOCKED`, salida 2, cero cuentas. El hijo hereda **solo** esas cuatro variables y variables básicas del sistema, nunca claves de PROD. La validación original consulta el lector LAB con UUID inexistente **antes** de crear una cuenta. No reintentar tras un fallo hasta verificar limpieza.

## Uso con infraestructura existente
**Windows (PC de oficina, con Node disponible):** obtener la rama privada mediante el Git ya autenticado y abrir `cerebro/universal/v0/security-lab/operativa-no-actions-check.cmd`. Es un diagnóstico **sin secretos ni operaciones de Auth**, cierra en PASS/FAIL. La ausencia de Node bloquea, no lo instala ni compra nada.

**Hostinger/servidor ya contratado o terminal local con Node 22+:** desde la raíz del checkout:
```sh
node cerebro/universal/v0/security-lab/operativa-no-actions.mjs --status
node cerebro/universal/v0/security-lab/operativa-no-actions.mjs --self-test
```
No hacen falta GitHub Actions. El comando `--live` se ejecutará **solo** desde un host privado, con `@supabase/supabase-js` ya instalado en el proyecto, y las variables LAB inyectadas por su gestor de secretos; no copiarlas a variables `VITE_*`, repositorio, mensajes, archivos `.env` compartidos o logs.

## Evidencia VERIFICADA sin Actions
- Inspección real Supabase LAB de permisos y negativa de sesión inexistente: HECHO.
- Código de operador probado con Node 22 independiente en contenedor local: **3/3 tests reales del control CLI PASS**; status y ejecución desarmada/argumentos inválidos rechazan sin red ni crear usuarios.
- Mecanismo `--self-test` probado con **10 pruebas de fixture de infraestructura** (10/10): valida resolución de rutas, ejecución de Node, lectura del resumen y salida PASS. **No equivale a ejecutar en este entorno la suite real completa de la rama**, que requiere checkout. Se corrigió el cálculo inicial de raíz durante el ensayo.
- El código publicado del operador se cotejó con hashes Git de los archivos ensayados. Sin ejecución de Live Auth y sin acceso a credenciales LAB.
- No se encontraron sesiones ni sandboxes Vercel existentes reutilizables, y abrir uno nuevo puede consumir créditos; no se contrató ni creó ninguno.
- No se usó GitHub Actions para certificar estos cambios; **nuevo CI GitHub NO_VERIFICADO mientras esté bloqueado**.

## Contrato de aceptación pendiente
1. En host privado YA contratado, suministrar solo claves LAB por canal secreto, instalar las dependencias bloqueadas por lockfile si faltan y ejecutar **una sola vez** `--live`; debe devolver `PASS_LAB_ISSUER_ONLY`, `TEMP_USER_CLEANUP=SUCCESS`. Una prueba fallida no se reintenta automáticamente. No enviar valores al chat.
2. Demostrar JWT válido y revocado en un adaptador servidor del **emisor PROD**, usando una identidad temporal autorizada distinta de la del propietario; confirmar `DENIED` después de logout con token aún no caducado. Ni `getClaims()` aislado ni `signOut()` local sustituyen el lector de sesión.
3. Certificar P0-B recibo real `job_id / request_id / receipt_id / provider`, P0-C...H, FinOps con factura, UX dueño PC/móvil/tablet, snapshots/rollback, gate final de release. **PROD OPERATIVA = HOLD** hasta P0-A...H verdes y autorización específica. No publicar solo porque el operador está preparado.

## Coste, seguridad y rollback
Sin suscripciones nuevas, sin nuevas funciones/Workers/colas/cron/bases, sin cambios en App/CRM, Gateway PROD, Auth, DNS, main, alias Vercel o Trading. Consumo real `NO_MEDIDO`.
Rollback del operador en LAB: `git revert` de los commits específicos del operador y de este documento; no hay datos ni recursos externos afectados. Nunca ejecutar el rollback del lector PROD en ausencia de incidente o gate de seguridad.
