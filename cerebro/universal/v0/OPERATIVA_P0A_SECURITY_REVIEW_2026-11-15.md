# Operativa · P0-A · Security gate · 2026-11-15

**Ambito:** PR #66 DRAFT, rama `cerebro/universal-control-plane-lab-v0-20261113`; únicamente lectores agregados Supabase LAB y proxies Vercel Preview. **No es certificado PROD ni aceptación de autonomía.**

## Comprobación viva acotada
- GitHub PR #66: OPEN / DRAFT / no fusionada; HEAD antes de este incremento: `97abd26caff9873bd157cb2a58916bfdb244a068`.
- Funciones del proyecto `hnqlnvakzaywtafeiybt`: `cerebro-operativa-device-observe-lab-v0` y `cerebro-operativa-job-telemetry-lab-v0` ambas ACTIVE v1, `verify_jwt=false`. El código desplegado coincide con el lector propio del repositorio.
- Vercel LAB `fenix-capital-preprod-app`, deployment `dpl_GUsDv7y88Vnf3ugBfurbmQM1DU8x` READY, target Preview, commit funcional `986eed50a47dcf519d52dfbb0dfc2c12a3c2fee2`.
- CI del HEAD actual consultado a través de los checks de PR; los checks de regresión, lab-contracts y shards reportan SUCCESS. Revalidar después de este commit.
- Tablas LAB examinadas **solo en metadatos de esquema**; `cerebro_device_results_preprod` no tiene company_id: se une únicamente contra command_id + device_id de órdenes Fénix filtradas en servidor. No introducir una condición sobre columna inexistente.
- No se han consultado secretos, payloads privados ni datos de clientes.

## Límite de confianza y bloqueo
Los dos Edge readers admiten JWT de otro issuer con `verify_jwt=false`, remiten credenciales al resolver propietario preexistente, exigen `CARLOS-ADMIN` y después leen con service-role **sólo en servidor LAB**. Los proxies Preview aplican su propia comprobación de propietario antes de llamar a LAB y validan estrictamente las proyecciones de respuesta.

**PARCIAL / P0-A NO CERRADO:** el lector y los proxies no verifican por sí solos la firma, el issuer, exp, session_id ni revocación: dependen del resolver existente. Esta revisión no acredita todavía ni el comportamiento en vivo del resolver con JWT expirado/revocado, ni la denegación física con otra identidad, ni el rollback físico del Preview. No se deben publicar controles autónomos ni cambiar `verify_jwt` sin contrato JWT cross-project probado.

## Incremento seguro de pruebas
`operator-owner-proxy-deny.test.mjs`: pruebas puramente deterministas, sin llamadas externas, para ambos proxies: rechazo de anónimos, escrituras, scope/empresa, origen, parámetros extra y hosts ajenos; respuesta negativa del resolver simulando expiración/revocación/usuario distinto; rechazo de respuesta LAB adulterada con supresión de campos privados. Los casos de expiración y revocación son **simulaciones del resolver**, no pruebas reales de Supabase Auth.

## Próximo gate
1. Verificar CI del nuevo HEAD y la ausencia de regresiones.
2. Ejecutar negativos HTTP **reales** contra ambos Edge + proxies desde un transporte autorizado que pueda enviar métodos/cabeceras, sin revelar JWT ni eludir SSO. El chat normal carece de un ejecutor HTTP autenticado habilitado en este corte; un intento por red del contenedor no alcanzó DNS.
3. Certificar contrato dinámico del resolver: firma/issuer, caducidad, sesión revocada, actor, scope Fénix y respuesta cross-project. Si se acredita un fallo, corregirlo sólo en LAB en rama/Preview protegido, con test y rollback.
4. Ensayar rollback físico del Preview sin afectar funciones anteriores; registrar recibo.
5. Mantener P0-B de identidad y leases como siguiente prioridad paralela de solo lectura.

**Costes:** ninguna suscripción nueva; consumo marginal de GitHub Actions/infraestructura NO_MEDIDO. **Estado:** PARCIAL / seguridad no certificada para ejecución autónoma.
