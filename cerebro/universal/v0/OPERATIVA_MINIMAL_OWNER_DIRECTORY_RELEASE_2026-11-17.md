# OPERATIVA · Directorio aislado, release mínimo

ESTADO: CANDIDATA DRAFT, PROD_PROMOTION=HOLD.
Baseline PROD: a51dd14eac11f02424dce5db426346b041c1824f; deployment dpl_6n6KMNTWNEqpUUDBwn3V4UccXjPJ.
Origen del catálogo: PR #66 SHA 60d84f90117725ce1cab46261151d95ea577caf7; cuatro archivos JSON fijados mediante SHA.
Solo directorio GET, filtros, fichas y motores documentados. La API valida actor CARLOS-ADMIN y company_id=fenix.
No modifica App.tsx, supabase.ts, ConsoleHost, App/CRM, permisos, Supabase, DNS, motores reales, Trading ni Cloudflare.
2506 registros indexados son perfiles lógicos, NO agentes en ejecución verificados.

GATES: build y tests, E2E propietario en stage aislado, OLD vs NEW, rollback probado en dominio seguro, coste y observabilidad.
Rollback PLANEADO no ejecutado: deployment original conservado y sin aliases movidos.
PROD_PROMOTION=HOLD.

## 18/11/2026 · Reparación P0 de acceso propietario en stage

**Incidente reproducido físicamente:** en el despliegue `dpl_D35pXq1nhsQLzkkbZjnj1mtk5wY5`, la ruta `/api/cerebro-preview-owner` devolvía `{"allowed":false,"reason":"LAB_ONLY"}` incluso antes de procesar identidad. El `CerebroConsoleHost` mostraba «No se ha podido verificar tu acceso de propietario». Causa: `api/cerebro-preview-owner.ts` admitía `VERCEL_ENV=preview`, pero el stage sin dominio estaba desplegado con `--prod --skip-domain`, equivalente a `VERCEL_ENV=production` **sin alias de PROD**.

**Corrección mínima:** ese endpoint ahora acepta únicamente el host privado `fenix-capital-preprod-[a-z0-9]+.vercel.app` cuando coincide EXACTAMENTE con `VERCEL_URL` y el modo Vercel es `production`, conservando el soporte existente para `preview`. Rechaza `app.fenixcapital.es`, orígenes extraños y cualquier otro deployment. Sigue siendo GET-only y valida el JWT por Gateway real antes de devolver `allowed:true`. Un contexto con `ok:false` se deniega aunque contenga actor_code. **No cambia permisos, base de datos, Supabase ni la App PROD.**

**Pruebas en `operativa-owner-directory-minimal.acceptance.mjs`:** rama, hostname, origin, falta de Bearer, usuario ajeno, contexto upstream negado, `VERCEL_URL` diferente, alias PROD negado, owner positivo simulado. El despliegue nuevo queda pendiente de verificación anónima física y login del propietario.

**Gate:** publicar un ÚNICO stage nuevo mediante flujo no-domain; esperar build/CI y comprobar `AUTH_REQUIRED` sin sesión en `/api/cerebro-preview-owner` en lugar de `LAB_ONLY`. Después autenticar al propietario en esa URL exacta para verificar el directorio 2.506. `PROD_PROMOTION=HOLD` hasta QA/rollback observabilidad y coste.
