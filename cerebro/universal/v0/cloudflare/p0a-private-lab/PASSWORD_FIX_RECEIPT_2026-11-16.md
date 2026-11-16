# P0-A · Registro de causa real · Password Auth demasiado largo · 16/11/2026

**HECHO por lectura de logs gestionados de Supabase LAB `hnqlnvakzaywtafeiybt` (sin datos personales):** la fuente `auth_logs` contiene dos peticiones `POST` que fallan con `status=400`, `error_code=validation_failed`, y el texto de error, clasificado por SQL sin mostrarlo, contiene `password` y `too long`. Timestamps: `2026-11-16T16:26:27` y `2026-11-16T16:33:37`. La hipótesis anterior de correo `example.invalid` no explica estos fallos; corregirla fue una medida preventiva, **no la causa demostrada**.

**ERROR DE CÓDIGO:** antes se generaban tres UUID completos y sufijo `Aa7!`: 3×36+4=112 caracteres, demasiados para la política del emisor Auth. No mostrar ni conservar contraseña real.

**FIX LAB:** contraseña nueva con 32 caracteres aleatorios hexadecimales + 12 caracteres hexadecimales aleatorios adicionales + `Aa7!` = 48 caracteres; mezcla aleatoria, letras mayúsculas/minúsculas, dígitos y símbolo. Correo temporal exclusivo `cerebro-p0a-<UUID>@fenixcapital.es`, administrado con `email_confirm=true`, sin envío de mensajes. No se crea ningún cliente real.

**PRUEBAS:** en entorno local Node 22, `node --check` correcto, suite integral de `cycle.test.mjs` sintética 13/13 PASS incluidas reglas de longitud y cleanup; además se incorpora `password-contract.test.mjs` al PR para prevenir regresiones. Las pruebas sintéticas **NO sustituyen el E2E físico**.

**ESTADO ANTES DEL REDEPLOY:** dos instancias Auth LAB ejecutadas `run3` y `run4`, ambas `complete/FAIL_CLOSED/stage=CREATE/cleanup=NOT_NEEDED`; consulta administrativa agregada `COUNT(auth.users WHERE email LIKE 'cerebro-p0a-%@fenixcapital.es' OR ...@example.invalid)` = 0 después. Worker `CEREBRO_P0A_ENABLED=false`, workers.dev false, previews false, 0 cron y secreto service_role cifrado. No cambios Supabase PROD, App, CRM, WordPress, Hostinger, DNS, otros Workers ni main.

**SIGUIENTE GATE:** tras comprobar que el nuevo código esté realmente desplegado en versión activa, ejecutar **una sola** prueba LAB con idempotencia; verificar RPC `false→true→false`, claims oficiales y `TEMP_USER_CLEANUP=SUCCESS`; comprobar la cuenta residual `COUNT=0` en Supabase Auth; devolver el flag a `false` aunque falle. Si no se acredita, detener sin bucles, registrar la causa exacta y mantener PROD HOLD. Sin nuevas suscripciones; uso marginal no medido.
