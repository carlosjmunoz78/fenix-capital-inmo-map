# CEREBRO P0-A · E2E REAL Auth LAB · Ejecutor privado desarmado · 2026-11-16

**ESTADO: PREPARADO EN PR #66, NO EJECUTADO CONTRA AUTH REAL.**

Se añade `security-lab/owner-session-auth-e2e-private.mjs`, un runner **desarmado por defecto** para el único proyecto `hnqlnvakzaywtafeiybt`. El test `owner-session-auth-e2e-private.test.mjs` prueba en CI que la ejecución sin armado no hace ninguna llamada ni crea usuarios.

## Flujo real cuando se ejecute de forma autorizada desde un runner seguro

1. Comprobar `CEREBRO_LAB_PROJECT_REF=hnqlnvakzaywtafeiybt`, llaves de **ese LAB exclusivamente** entregadas por mecanismo secreto (nunca en PR, chat, logs o Vercel público), y armado exacto `CEREBRO_LAB_SESSION_E2E_ARM=CEREBRO-LAB-SESSION-E2E-ONE-SHOT-hnqlnvakzaywtafeiybt`. **No configurar estas llaves ahora.**
2. Crear una cuenta **temporal y aleatoria** con `admin.auth.admin.createUser({email_confirm:true})` usando API oficial del emisor LAB; no se envían invitaciones y no se inserta manualmente en `auth.users`.
3. Iniciar sesión con `signInWithPassword`; verificar `getClaims` y la correspondencia de issuer, UUID y fecha de JWT.
4. Consultar el RPC privado con rol service_role: sesión inexistente = false, usuario incorrecto = false, sesión **real vigente = true**.
5. Cerrar **solo esa** sesión con `auth.signOut({scope:'local'})`; comprobar `false` en el mismo `session_id + user_id`. Sin renovar JWT ni revocar la sesión de otra persona.
6. Borrar la cuenta temporal por su ID recién creado con `admin.auth.admin.deleteUser`, incluso si falla una comprobación. Resumir sin IDs, tokens, correos o contraseñas. Si falla cleanup, reportar `CLEANUP_FAILED` y bloquear repetición hasta inspección interna.

**No se ejecutará automáticamente** en CI: necesita armado y dos claves LAB disponibles solo para el runner. La cuenta `@example.invalid` no representa un correo de cliente ni requiere SMTP. No se altera configuración Auth, GDPR ni emails reales; el alcance es exclusivamente el emisor LAB.

## Gates que NO cubre

- El propietario real usa un issuer diferente (`cluhljgonannaafpmblx`); una prueba LAB no demuestra revocación del token de la App.
- No es aún una prueba física del adaptador HTTP, ni certifica actor `CARLOS-ADMIN`. Prueba el camino `Supabase Auth LAB oficial → RPC privada LAB` únicamente.
- No afecta a los lectores Edge, a la PR DRAFT, a la versión Vercel ni a PROD.
- Requiere confirmar la disponibilidad de claves LAB seguras y, si no están accesibles, **mantener BLOQUEADO**, no improvisar con credenciales de otras empresas o PROD.
- Coste nueva suscripción 0 €, consumo marginal de Auth/Supabase/GitHub no medido.

**Rollback:** no crear más usuarios; eliminar exclusivamente la cuenta de ensayo si quedase pendiente; no eliminar migraciones ni funciones existentes.