# CEREBRO OS · Navegación autónoma transversal · V1

Fecha: 2026-10-15  
Ámbito: GLOBAL / MULTIEMPRESA / MULTI-ENTORNO gobernado  
Alias humano: **Navegación autónoma transversal**

## Regla ejecutiva

**EL NAVEGADOR ES UNA HERRAMIENTA, NO UNA AUTORIDAD.**

Cualquier motor canónico de CEREBRO puede solicitar el navegador cuando sea la vía adecuada o cuando API, MCP o script no resuelvan el trabajo. El navegador puede servir a SEO, redes, App, formación, investigación, competencia, captación, nuevas empresas, WordPress, administración, QA, conocimiento y cualquier otra función gobernada.

Usar el navegador no requiere por sí mismo una nueva autorización humana. La autorización depende de la acción concreta y del motor que la origina.

## Orden de ejecución

CEREBRO mantiene preferencia por la ruta más determinista y barata:

`API oficial → MCP autorizado → script local → navegador → computer-use → visión`

Esto no degrada al navegador: queda disponible transversalmente, pero no se usa si una vía más determinista y barata resuelve mejor la tarea.

## Qué puede hacer

Cuando la política del motor lo permita, la capacidad puede:

- navegar, buscar, leer y extraer evidencia;
- usar sesiones autenticadas registradas y saludables;
- interactuar con interfaces web;
- rellenar formularios;
- ejecutar acciones rutinarias que el motor de origen ya tenga autorizadas;
- operar en PROD cuando el motor de origen haya superado sus contratos, pruebas, promoción y límites de autoridad;
- usar pools de navegadores y dispositivos en ventanas horarias gobernadas;
- participar en entornos de Trading únicamente dentro de su runtime, credenciales y autoridad aislados.

## Qué NO concede el navegador

El navegador nunca concede por sí mismo:

- permiso de escritura en PROD;
- permiso de publicar, borrar o modificar si el motor no lo tenía;
- permiso de gastar dinero;
- firma legal;
- aprobación jurídica;
- autoridad de Trading;
- acceso a credenciales en claro;
- capacidad para saltarse CAPTCHA, MFA, anti-bot, robots o restricciones de plataforma.

## Humano por excepción

CEREBRO sigue operando autónomamente salvo las ocho excepciones canónicas:

`LEGAL_REQUIRED`, `SIGNATURE_REQUIRED`, `LOW_CONFIDENCE`, `HIGH_RISK`, `POLICY_CONFLICT`, `SECURITY_INCIDENT`, `MONEY_LIMIT`, `CUSTOMER_HUMAN_REQUEST`.

El simple hecho de abrir o manejar un navegador **no** genera `HUMAN_REQUIRED`.

El gasto incremental sí se detiene en `MONEY_LIMIT`. Las acciones legales, firmas, riesgo alto real, seguridad, conflicto de política, baja confianza o petición humana se detienen en su excepción correspondiente.

## Producción

Una acción ordinaria en producción puede ejecutarse por navegador si y solo si el motor de origen ya posee esa autoridad y tiene verdes sus gates aplicables: promoción, rollback, observabilidad, auditoría e idempotencia. La capacidad de navegador no crea ni amplía esa autoridad.

## Sesiones y dispositivos

Las sesiones autenticadas deben estar registradas y saludables mediante IAM/lifecycle; nunca se guardan secretos en el registro. La ejecución física exige binding fresco, kill switch y evidencia del recurso disponible.

CEREBRO puede usar distintos equipos/navegadores en horarios planificados. El equipo es un recurso de ejecución; no es la fuente de autoridad.

## Trading

Trading puede disponer de navegador si lo necesita, pero permanece aislado: sin credenciales compartidas con CEREBRO general, sin recursos críticos compartidos y sin heredar autoridad de otros motores.

## Skill externa agent-browser

La skill externa se trata como fuente de patrones y wrapper normalizado. Esta política **no necesita ejecutar código externo de esa skill** para dar a CEREBRO navegación transversal. Cualquier ejecución externa futura requiere su propio gobierno y no puede ampliar autoridad por sí sola.

## Evidencia y auditoría

- Política máquina: `cerebro/registry/browser-transversal-autonomy-policy.v1.json`
- Gate runtime: `cerebro/runtime/browser-transversal-autonomy-v1.mjs`
- Tests: `cerebro/tests/browser-transversal-autonomy-v1.test.mjs`
- Registro de motores: `cerebro/registry/engine-registry.v1.json`
- Perfil de dispositivos: `cerebro/registry/authorized-execution-device-profile.v1.json`

Esta política debe aparecer en cualquier auditoría futura sobre Browser Bridge, computer-use, agent-browser, dispositivos autorizados o autonomía de motores.
