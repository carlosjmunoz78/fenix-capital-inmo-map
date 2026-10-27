# CEREBRO OS · JARVIS BOOST 001 · ZERO-TOUCH OWNER SETUP · 2026-10-27

## Objetivo
Dejar el máximo trabajo posible ejecutable sin presencia continua del propietario. El propietario solo interviene en pasos que técnicamente o legalmente no pueden delegarse: financiación inicial, alta/entrega segura del secreto, MFA/CAPTCHA/consentimiento de terceros, permisos físicos iniciales de dispositivo y validaciones humanas de experiencia cuando sean imprescindibles.

## Qué debe quedar encendido/conectado

### 1. Cloud / GitHub / CEREBRO
Debe permanecer disponible la infraestructura ya existente de GitHub Actions, CEREBRO Gateway/Runtime y servicios cloud usados por CEREBRO. No requiere un PC personal encendido para auditoría, generación de código, tests, Factory, RSI/LRN, documentación o PREPROD cloud.

### 2. PC de oficina autorizado
Para pruebas físicas y trabajo local:
- PC encendido y conectado a Internet estable;
- alimentación conectada;
- Windows arrancado con el usuario autorizado;
- evitar suspensión/hibernación durante la ventana de trabajo; la pantalla puede apagarse;
- Browser Bridge / worker autorizado debe estar arrancado y con heartbeat/attestation saludable antes de usar rutas BROWSER_BRIDGE o COMPUTER_USE;
- no desactivar antivirus, firewall, UAC ni controles de seguridad para facilitar automatización;
- mantener perfiles de navegador existentes; no borrar cookies, perfiles ni sesiones antes del inventario;
- si una sesión web ya está autenticada, preservarla; si una web exige login/MFA/CAPTCHA, clasificar ACTION_REQUIRED y reanudar el mismo job después del paso humano.

Estado actual: Browser Bridge se trata como PARCIAL y requiere fresh attestation antes de asumir control real.

### 3. Navegador / perfiles
No hace falta dejar manualmente Facebook, WhatsApp, GSC, WordPress y todas las redes abiertas a la vez. CEREBRO debe aprender a abrir el perfil/cuenta correcta. Para el primer inventario conviene preservar las sesiones ya existentes.

Regla objetivo:
company_id + service + identity_id + browser_profile -> sesión correcta -> acción -> verificación.

Nunca guardar contraseñas en prompts, repositorios, Notion o logs.

### 4. Móvil de Carlos
Hasta que JARVIS MOBILE V1 exista, el móvil no es requisito para que DeepSeek audite/codifique. Para E2E móvil posterior:
- móvil encendido y con Internet;
- batería suficiente o cargador;
- notificaciones permitidas para Jarvis;
- micrófono/voz y demás permisos se conceden solo cuando la app los solicite y sean necesarios;
- no se exige dejar pantalla desbloqueada permanentemente.

La instalación inicial, permisos Android y cualquier aprobación del sistema operativo pueden requerir una intervención única.

### 5. DeepSeek
Antes del primer uso pagado:
- cargar 100 EUR objetivo inicial;
- auto-recharge OFF;
- crear API key;
- guardar la key una sola vez en el mecanismo de secretos aprobado bajo la referencia DEEPSEEK_API_KEY;
- no pegar la key en el chat ni en documentación.

Hard cap BOOST: 200 EUR. Presupuesto variable posterior: 0-10 EUR/mes salvo nueva autorización OWNER_ROOT.

## Secuencia autónoma después de esos prerequisitos
1. Releer main y reconciliar cualquier cambio nuevo sin sobreescribir trabajo concurrente.
2. Ejecutar CI y tests del candidato.
3. Revalidar contrato/precios/model IDs DeepSeek.
4. Tiny canary con output mínimo.
5. Validar telemetría y hard-stop económico.
6. W00: freeze de estado vivo/inventario/evidencia.
7. Auditar arquitectura multiagente completa; conservar agentes/subagentes por defecto.
8. Ejecutar W01-W20 en lotes gobernados según dependencias.
9. Corregir solo en ramas/candidatos, con tests y OLD-vs-NEW.
10. PREPROD antes de cualquier promoción.
11. Registrar aprendizaje durable en Factory/LRN/Registry/knowledge/evals.
12. Continuar sin pedir aprobación para trabajo ordinario ya autorizado; parar únicamente en HUMAN_REQUIRED canónico o ACTION_REQUIRED externo no-bypassable.

## HUMAN_REQUIRED / ACTION_REQUIRED
Jarvis/CEREBRO no debe interrumpir al propietario por trabajo ordinario. Puede necesitarlo para:
- LEGAL_REQUIRED;
- SIGNATURE_REQUIRED;
- LOW_CONFIDENCE;
- HIGH_RISK;
- POLICY_CONFLICT;
- SECURITY_INCIDENT;
- MONEY_LIMIT;
- CUSTOMER_HUMAN_REQUEST;
- y, como handback técnico externo no bypassable, login/MFA/CAPTCHA/consentimiento/permisos del OS; tras completarse, el job debe reanudarse desde el mismo punto.

## Qué NO necesita Carlos dejar encendido
- No necesita tener ChatGPT abierto toda la noche para que CI cloud ejecute jobs ya disparados.
- No necesita tener todos los navegadores abiertos.
- No necesita mantener el móvil desbloqueado.
- No necesita vigilar los tests.
- No necesita responder a decisiones técnicas ordinarias cubiertas por la política.

## Estado de mañana
PREPARED_NOT_FUNDED hasta que exista saldo + secret reference validado + canary green.
Luego: FUNDED_CANARY_GREEN -> SUPER_AUDIT_RUNNING -> BUILD_CANDIDATES -> PREPROD_EVAL -> PROMOTION_CANDIDATES.

## Regla de seguridad
Nunca sacrificar seguridad para conseguir zero-touch. Zero-touch significa automatizar lo delegable y hacer handback/reanudación cuando un tercero exige presencia humana; no significa saltar MFA/CAPTCHA, desactivar controles del sistema ni exponer secretos.
