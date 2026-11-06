# JARVIS CUT46 · Cierre de integración comunicacional · 2026-11-06

## Decisión y objetivo
El propietario autoriza avanzar para disponer de JARVIS funcional, con tratamiento ejecutivo «señor», conversación escrita y por voz desde JARVIS / Operativa / Neuronal / Navegador. Los defectos reportados son reales: no se escucha/responde físicamente y el Gateway decía «hola guapo». El trabajo aquí es **preparación técnica LAB**, no prueba de producción ni promoción autónoma.

## Inventario OLD y mapa de dependencias
- App/CRM PROD: `app.fenixcapital.es` y CRM real; NO se modifica nada.
- Gateway REAL Supabase: `cerebro-console-gateway-v0`, con control de identidad `CARLOS-ADMIN`. Consulta *solo lectura* de la función desplegada confirmó que contenía diez saludos familiares en `closeOwnerGreeting`.
- OLD Gateway `index.ts` SHA blob `44241c6abc3cb89560500336e332f0628219d0fc`; rollback seguro disponible en el árbol de referencia PR #27.
- PR #27: core de cuatro superficies, DRAFT. PR #29 CUT44: voz/entrada; PR #30 CUT45: saludo Gateway. PR #28 CUT43: currículo y guard de DeepSeek, **dependencia externa aún no integrable a runtime** sin evaluación independiente.
- Rutinas ya existentes: `cerebroVoice.ts` (ANA genérica) y autorización/capabilities de Gateway; **intactas**.
- Registro: `cerebro/registry/jarvis-communication-cut46.v1.json`. Claves: `company_id=fenix`, `engine_id=JARVIS`, `environment=LAB`, `version=CUT46-2026-11-06`.

## Cambios NEW e integración
1. Ramas CUT44+45 integradas en `cerebro/jarvis-cut46-unified-comm-lab-20261106`, sin tocar `main`. Ambos cortes comparten la misma base PR #27, sin conflictos en el mismo archivo.
2. Gateway: eliminado generador de saludos «guapo» y sustituido por tres saludos ejecutivos deterministas `owner-greeting.ts`, sin reescribir contenidos de negocio ni ejecución de acciones. Preferencias por defecto del Gateway y cliente JARVIS quedan `executive_formal` / 1,10×; no se modifica la voz ANA.
3. Dictado: errores STT específicos, hints `es-ES`, voz TTS navegador seleccionada por heurística. **No equivale a la muestra aprobada «Más clara» ni certifica un micrófono real.**
4. La entrada es editable en desconexión; el botón `Enviar` se cierra según `getJarvisOmniState().ready`, no por apariencia del textarea.
5. Reconciliación en montaje de `JarvisOmniDock`: tanto el evento de actualización como el estado compartido actual se consumen. Un evento de conexión anterior al montaje de React ya no debe perderse.
6. Prueba voluntaria `Probar saludo real` en las superficies: solo ante clic y `ready=true`, llama al Gateway actual por la sesión de usuario a través de `postCerebroConsoleChat('hola')`. Valida HTTP 200, intent greeting, no acción ejecutada, y tratamiento «señor» sin familiaridades. Si falla da `AUTH_REQUIRED`, `GATEWAY_UNAVAILABLE` o `PERSONA_MISMATCH`; nunca afirma voz física. **No usa el JWT de GitHub CI** ni envía credenciales a esta interfaz.
7. Pruebas deterministas de contrato conjunto CUT44+45+46, respuesta correcta e incorrecta, sesión caducada, ausencia de permisos, DOM falsificado y neutralidad de ANA.

## Comparación OLD vs NEW
En el archivo del Gateway `index.ts`, se compararon de forma no destructiva las firmas de rutas, verbos HTTP y llamadas RPC del OLD y NEW: **12/12 firmas conservadas, 0 eliminadas, 0 añadidas**. El check no demuestra equivalencia total de comportamiento y se requieren pruebas de regresión amplias antes de deploy.

## Seguridad y coste
- App/CRM/Supabase desplegado/Gateway PROD/ANA/CUT30/DNS/Trading y main, intactos.
- CERO suscripciones, cero API DeepSeek pagada en estas comprobaciones; pruebas offline y Chromium simulado de CI.
- No se desactiva ningún permiso, no se extraen JWT del navegador ni se introduce `service_role` en el cliente.
- No se habilita una URL pública, no se publica Worker Cloudflare, no se modifica Access.
- El evento de pruebas no es autoridad: los permisos reales son del Gateway autenticado.

## Gates antes de llamar a JARVIS 'usable'
- [ ] Sesión real del propietario validada con los 3 GETs del Gateway y con prueba de saludo exclusivamente por acción voluntaria en la App.
- [ ] Prueba real de escritura y recepción de respuestas en las cuatro interfaces.
- [ ] Dictado STT y TTS, permisos, recuperación, interrupción y latencia reales en Opera/Chrome y dispositivo móvil.
- [ ] Personalidad CUT43 evaluada y conectada sin saltarse gateway, seguridad o limites económicos; el saludo solo cubre una ruta determinista.
- [ ] Comparación OLD vs NEW, snapshot/backup desplegable, rollback ensayado y tribunal.
- [ ] Promoción gradual autorizada sin alterar App/CRM principal ni credenciales, después de gate completo.

**Limitación actual:** GitHub Actions tiene `CEREBRO_E2E_USER_JWT` presente pero vencido/cerca de vencimiento. No se puede fabricar sesión propietaria válida desde el runner. La prueba de sesión desde el navegador en uso es el camino permitido cuando la nueva UI esté disponible, sin copiar tokens por chat.

## Rebuild / runbook / rollback
- Fuente DRAFT de integración: `cerebro/jarvis-cut46-unified-comm-lab-20261106`, derivada de PR #29, preserva archivos PR #27 y añade cambios exactos CUT45.
- `npm ci --ignore-scripts && npm run build`; `node --test tests/jarvis-*-lab.test.mjs` (elegir los tests existentes del contrato, nunca scripts pagados); `npx playwright test --config=playwright.jarvis-interface.config.ts` con fixtures ficticios.
- No activar ninguna acción sobre el Gateway real para verificar el build. Para revertir CUT46 antes de promoción, cerrar PR y descartar rama. Para una futura promoción, guardar copia probada del Edge Function y paquete de la App antes de desplegar, y ensayar restauración en entorno aislado.

## Evidencia y estados
- CI inicial unificada: [42292665996](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42292665996) **SUCCESS**: 41 pruebas Node + 22 Playwright.
- Tras agregar prueba propietaria, [42293248438](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42293248438): **47 Node PASS, 21/22 Playwright PASS**, detectó ventana de carrera de evento en una prueba, se corrigió con reconciliación al montaje.
- CI final de código [42293538273](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42293538273): **SUCCESS** con 48/48 Node y 22/22 Playwright desktop+móvil, tras reconciliar estado de conexión al montaje. JWT propietario de Actions `EXPIRED_OR_NEAR_EXPIRY`; la prueba de Gateway real se omite correctamente.
- Revisión adicional del mismo candidato en [42293836786](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42293836786): **24/24 jobs SUCCESS**; ejecución de `npm run validate`, `npm test` y job `OLD vs NEW · full canonical regression` en verde. Esta comprobación es de CI y no equivale a E2E propietario ni a micrófono físico.
- **Estado final:** LAB GREEN / PROD NO-GO; integración unificada comprobada en CI, no certificada físicamente ni desplegada. APP REAL NO MODIFICADA.
