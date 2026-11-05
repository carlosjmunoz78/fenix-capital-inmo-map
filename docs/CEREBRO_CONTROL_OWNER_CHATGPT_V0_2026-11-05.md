# CEREBRO OS · CONTROL POR CHATGPT DEL PROPIETARIO · V0 · 2026-11-05

## Objetivo y decisión del propietario
CEREBRO realiza **autónomamente** los trabajos ordinarios. El propietario da órdenes en lenguaje natural a través de ChatGPT: "genera", "enséñame", "mejora", "pausa", "reanuda", "rechaza", "aprueba", "deshaz". ChatGPT es **interfaz humana preferente**; CEREBRO **no depende** de mantener una conversación abierta ni de un modelo particular para trabajar. Conservar acceso administrativo de emergencia y auditoría en caso de fallo de ChatGPT.

## Estado físico, no aspiracional
**EXISTENTE:** conector Supabase desde ChatGPT, tablas/cola creativa `public.cerebro_creative_job_v1`, worker programático GitHub OIDC y depósito privado. Una orden de 1 imagen se insertó físicamente desde ChatGPT con ID `99427de0-877c-4e2a-88c4-c9c26a6ccfae` y quedó **HOLD**, sin generación ni publicación.

**HECHO 2026-11-05:** migración adicional exclusiva PREPROD `cerebro_owner_control`, dos tablas privadas:
- `cerebro_owner_control.commands_v0`: órdenes con idempotencia, empresa, motor, autor, payload validado, estado y objetivo, sin permisos de publicación ni modificaciones PROD.
- `cerebro_owner_control.audit_v0`: eventos de creación/cambios de estado, protegido de borrado accidental.
- Las tablas tienen RLS y **no** pueden consultarse ni escribirse desde roles anónimos o usuarios autenticados corrientes. La vía de control actual es un **conector de propietario ya autorizado**; el Gateway futuro debe autenticar explícitamente a CARLOS-ADMIN antes de almacenar órdenes.
- Orden física: `d62feb88-86ba-4c0e-971e-c4fae36c767e` enlazada con la petición creativa, `HOLD SECURITY_INCIDENT`. Auditoría `SUBMITTED` comprobada.

**HECHO EN RAMA:** `cerebro/runtime/owner-command-control-v0.mjs` compila comandos, valida alias `fenix-capital` → `fenix`, impide acceso interempresa, alta seguridad, pago no presupuestado, publicación automática y lectura/escritura PROD.

**PARCIAL:** la tabla de órdenes **todavía no está consumida por el trabajador**. Su inserción real es un control de entrada verificado, no certifica automatización ni pausa/reanudación efectiva.

**BLOQUEO:** no ejecutar generación con la clave marcada comprometida; hace falta rotación segura y un ejecutor de imágenes con gasto gobernado/ledger. No exponer, registrar ni acceder a valor de claves desde prompts.

## Contrato de órdenes
`STATUS`, `REQUEST_IMAGE`, `REVIEW_IMAGE`, `REJECT_IMAGE`, `APPROVE_IMAGE`, `REQUEST_IMPROVEMENT`, `PAUSE_ENGINE`, `RESUME_ENGINE`, `CANCEL_JOB`, `ROLLBACK`.

- Todas las órdenes requieren autorización **comprobada del propietario en el Gateway**, no basta poner `actor=CARLOS-ADMIN` en un campo.
- HUMAN_REQUIRED solo para motivos canónicos (riesgo alto, dinero, seguridad, obligación legal, baja confianza, etc.).
- **Nunca autoaprobación:** crear una orden no otorga publicación ni es evidencia de ejecución. Aprobar creatividad ≠ autorizar post social.
- `PAUSE`/`RESUME` solo cobran efecto cuando un worker realmente consulta el estado, lo reconoce y se verifica rollback.
- Compatibilidad: `company_id=fenix` es canónico en la cola existente; `fenix-capital` es alias comercial, sin mezclas interempresa.
- Operación 7/7 objetivo, con mínimos reintentos, idempotencia, auditoría, métricas de ejecución y formación.

## Próximos gates técnicos (secuenciales)
1. Conectar Gateway owner-auth con este almacén privado y worker OIDC compatible, **sin** acceso directo al modelo ni credenciales en frontend.
2. Comprobar firma de órdenes, claims de propietario, controles multiempresa, idempotencia y lectura/escritura segura.
3. Implementar y probar worker consumidor y conmutación real de autonomía `PAUSE`/`RESUME`/`ROLLBACK` en un LAB aislado (OLD vs NEW).
4. Resolver el incidente de la clave en proveedor/almacenes cifrados, conectar imágenes IA y ledger autorizado.
5. Una imagen OpenAI generada desde FACT-001, archivo real y evaluación de marca independiente.
6. Solo tras revisión comercial, SOC-001 gestiona la publicación en un canal permitido con ID nativo.

## Estrategia de rollback
No desplegar código experimental en App/CRM/PROD. Si el contrato V0 falla, no procesar órdenes nuevas; mantener cola y workers legados intactos. La tabla privada es aditiva y nunca reemplaza los historiales de `cerebro_creative_job_v1`.

## Evidencia
- PR: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/pull/23
- CI owner gate: https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42025858822
- Auditoría de PREPROD y RLS: 2026-11-05 (lecturas verificadas, sin exposición del secreto).
