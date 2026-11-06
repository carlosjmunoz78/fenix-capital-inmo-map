# CUT45 · JARVIS owner Gateway persona · LAB · 2026-11-06

## Hallazgo real
El usuario reporta que la App responde «hola guapo» y que JARVIS no mantiene el protocolo ejecutivo de trato «señor». Auditoría de fuente GitHub en `supabase/functions/cerebro-console-gateway-v0/index.ts`: el método `closeOwnerGreeting` contiene **diez saludos explícitos**, entre ellos «Hola Carlos. ¿Qué tal guapo?». Por tanto, el defecto no se explica únicamente por DeepSeek ni por el sintetizador de voz. Se trata también de **texto escrito directamente en el Gateway**.

## Fuente OLD congelada
- Repo: `carlosjmunoz78/fenix-capital-inmo-map`.
- Base de trabajo: `cerebro/jarvis-omnichannel-interlocutor-lab-20261106` (PR #27 DRAFT).
- SHA del archivo `index.ts` antes del cambio: `44241c6abc3cb89560500336e332f0628219d0fc`.
- Se mantienen sus rutas HTTP, autorización del propietario, confirmación exacta, memoria, contratos existentes y funciones históricas.

## Cambio candidato NEW
- `owner-greeting.ts`: tres saludos deterministas, sobrios y con «señor», sin familia de expresiones «guapo» ni llamada a LLM. Rotan según respuestas propias precedentes, no según el reloj.
- `index.ts`: sustituye la función hardcoded por import desde helper testable; cambia únicamente la preferencia por defecto de la Consola CEREBRO a `executive_formal` / 1,10× / pitch 0,98. No transforma arbitrariamente otros mensajes ni inventa ejecución.
- `tests/jarvis-cut45-gateway-persona-lab.test.mjs`: caso de saludo correcto, continuidad determinista, no suplantación por turnos de usuario, ausencia de saludos informales en source, invariantes de identidad y acción.
- CI dedicada Node 24, sin secrets ni llamadas al proveedor y sin deploy.

## Estado y gobernanza
**Solo GitHub LAB.** El Gateway REAL desplegado en Supabase no se ha modificado y puede seguir respondiendo como antes. Esta PR NO conecta el modelo DeepSeek y NO completa dictado físico, voz aprobada ni memoria universal. PR #28 (CUT43, entrenamiento de estilo) y PR #29 (CUT44, UI de micrófono) siguen separados; cualquier combinación requiere dependencias/OLD vs NEW y pruebas.

No se han cambiado producción, App/CRM, ANA, DNS, main, credenciales, Supabase, CUT30 o Trading. Sin gasto nuevo.

## Gates antes de promover
- Evidencia de CI LAB y compatibilidad con TypeScript/Deno Edge sin cambios de runtime.
- Comparativa OLD vs NEW de todas las rutas y respuestas relevantes, incluyendo saludos repetidos, borradores y contexto.
- Revisar preferencias preexistentes `tone`: un registro almacenado `warm_close_caring` puede sobreescribir el valor por defecto; requiere decisión explícita de migración o preferencia especial por superficie. No cambiar preferencias guardadas silenciosamente.
- Autenticación real de propietario y denegaciones negativas, dispositivos, TTS/STT físicos, rollback ensayado, tribunal, costes y autorización de promoción.
- La identidad y el permiso `CARLOS-ADMIN` no pueden inferirse por textos del cliente.

Rollback: descartar PR/branch candidata; el Gateway real sigue intacto.
