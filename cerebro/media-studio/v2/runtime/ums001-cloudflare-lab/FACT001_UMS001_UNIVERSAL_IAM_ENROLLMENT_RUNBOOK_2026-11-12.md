# FACT-001 → UMS-001 · Universal issuer enrollment LAB

## EVIDENCIA
- Universal signed Gateway `cerebro-ums001-universal-gateway-lab-eu` ampliado aditivamente con `enrollFactoryIssuer` y nueva tabla `media_factory_enrollments`. El validador firmado y `core.mjs` anteriores están preservados. Snapshot anterior disponible en `universal-signed-gateway.baseline.*`.
- Un provisionador compartido `cerebro-fact001-ums001-issuer-provisioner-lab-eu`, sin subdominio público, consume `FACT001_ENGINE_CREATED` a través de cola privada `cerebro-fact001-ums001-enrollment-lab-eu` (EU, ID `45f17e040bcb4c10a509f31b1460da49`; consumidor `1bb3034a77e845638d5e54aeab29882f`).
- Namespace KV de credenciales cifradas `ef5338650a474aff97b818c242adaef7`. KV no garantiza residencia exclusiva UE; la cola sí está configurada EU.
- Credenciales `FACT_ENROLL_TOKEN`, `FACT_EVENT_SIGNING_KEY`, `FACT_PRIVATE_MASTER_KEY` guardadas exclusivamente en Secret bindings, nunca en chat ni repositorio.
- Alta autorizada requiere evento FACT firmado HMAC, empresa `fenix`, LAB, canal autorizado y capacidad IMAGE.SYNTHETIC. Genera keypair Ed25519, cifra PKCS8 con AES-GCM, registra SPKI público y manda probe firmado al ledger. El código existe; **aún no se ha visto una alta positiva**.
- **Prueba negativa verificada**: evento `FACT-ENROLL-NEGATIVE-20261112-0001` → `FACT_EVENT_SIGNATURE_DENIED`; ningún registro para `FACT-NEGATIVE-001`. No se han generado imágenes por esta prueba.

## FÁBRICA
Repositorio `carlosjmunoz78/capital-mapa-pro`, rama `cerebro-engine-factory-v0`, commit `db65eba7c552188363fd2c6105c41ddcf6718c19`.
- En `factory.py`, cada motor hereda un contrato UMS-001 común y se genera outbox de inscripción.
- Si el proceso FACT-001 dispone de `CEREBRO_FACT_ENROLL_EVENT_KEY`, `CEREBRO_CLOUDFLARE_API_TOKEN`, `CEREBRO_CLOUDFLARE_ACCOUNT_ID`, `CEREBRO_FACT_ENROLL_QUEUE_ID` y scope de empresa, envía HMAC a la misma cola de registro. Si no, deja `PENDING_FACTORY_IAM_TRANSPORT` sin afirmar éxito.
- 6/6 pruebas locales de Python pasadas (incluye auto-scaffold, ausencia de tenant, mock envío firmado, denegación multiempresa, identidad heredada).

## RESTANTE
1. Inyectar esas variables en el runner efectivo de FACT-001 con Vault/secrets, sin copiarlas a archivos. Cloudflare FACT tiene su `FACT_EVENT_SIGNING_KEY` pero no hay evidencia de que el runner Python/GitHub tenga el mismo valor ni token Cloudflare.
2. Ejecutar la **alta positiva real desde FACT-001**, verificar `ACTIVE`, y la firma con la Gateway existente.
3. Encaminar trabajos IMAGE.SYNTHETIC de cualquier motor registrado hacia FLUX y devolver al origen. El Gateway universal actual solo registra y audita un signed job; la producción de imágenes general todavía no se conecta.
4. Multiempresa: ampliar scope por tenant únicamente con IAM, autorización, coste y aislamiento comprobados; actualmente limitación Fénix LAB.
5. QA marca/visual/comercial, coste global y publicación quedan fuera.

## ROLLBACK
Desactivar `FACT_PROVISION_ENABLED` (nuevo worker) y `FACT_ENROLL_ENABLED` (Gateway), retirar solo consumidor nuevo si fuera necesario. No borrar otros KV/colas, mantener snapshots. No tocar main, PROD, App, CRM, Buffer, DNS ni Trading.
