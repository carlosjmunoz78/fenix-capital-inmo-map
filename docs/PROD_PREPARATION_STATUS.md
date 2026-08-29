# APP PROD · preparación aislada

## Punto de partida validado
La rama `prod-preparation` nace exactamente del candidato PRE-LANZAMIENTO `14381a80b8993717add65ced00c3112779625584`.

No se ha fusionado PR #2, no se ha modificado `main`, no se ha activado ninguna APP PROD y no se ha tocado Supabase PROD.

## Objetivo de esta rama
Preparar una versión técnicamente apta para producción sin desplegarla todavía. La preparación debe mantener PRE-PROD intacta y exigir infraestructura/configuración PROD propia.

## Separación obligatoria
PROD deberá tener, antes de cualquier activación:
- proyecto/backend PROD independiente;
- URL y publishable key propias;
- almacenamiento de autenticación propio (`fenix-prod-auth-v1` o versión posterior aprobada);
- Edge Functions PROD propias, sin sufijo `-test`;
- secretos del backend separados y nunca versionados;
- dominio/hosting PROD definidos;
- datos controlados para smoke test;
- rollback documentado y probado.

## Contrato de Edge Functions esperado
La preparación usa estos nombres objetivo, sujetos a comprobación real antes de activación:
- `fenix-app-gateway`
- `fenix-ana-api`
- `fenix-ana-knowledge`
- `fenix-ana-canonical`
- `fenix-evidence-api`
- `fenix-memory-api`
- `fenix-b2b-actions`

No se debe redirigir una APP PROD hacia las funciones `*-test` de PRE-PROD.

## Gate técnico previo a despliegue
1. Configuración de entorno PROD presente mediante variables/secretos, nunca hardcodeada con valores sensibles.
2. Build PROD reproducible.
3. Suite Browser QA verde sobre el código candidato.
4. Verificación de login y sesión con almacenamiento PROD separado.
5. `/navigation` y rutas profundas continúan fail-closed.
6. Dirección/Belén recibe únicamente el ámbito autorizado.
7. Acciones sensibles siguen exigiendo preview/revisión y confirmación explícita.
8. Endpoints PROD responden con contratos equivalentes a los validados en PRE-PROD.
9. DEMO/fixtures PRE-PROD no se importan como datos reales.
10. Smoke test PROD con datos controlados.
11. Punto de rollback disponible antes de abrir uso real.

## Límites actuales
Esta rama puede preparar código, contratos, CI no desplegable y documentación. No debe activar producción por sí sola.

La creación/configuración real de Supabase PROD, secretos, funciones PROD, hosting/dominio y el primer despliegue requieren que dichos recursos estén disponibles y deben verificarse antes de abrir el piloto.

## Primer alcance de uso
El primer uso real se limita a Dirección/Belén. OCR transversal, audio→texto, chat interno completo, nuevas automatizaciones por fricción y activación progresiva de más roles permanecen posteriores al arranque real salvo nueva orden.
