# Manual de usuario · APP Fénix Capital · Fase 1 PRE-PROD

## Acceso
La pantalla de acceso admite únicamente identidades TEST autorizadas durante PRE-PROD. No introducir datos reales de clientes en pruebas.

## Navegación
El menú muestra los módulos que el backend autoriza para la sesión. La URL o el menú no conceden permisos adicionales.

## Tema Claro/Oscuro
El botón de tema está siempre visible. Cambiarlo no recarga la APP ni debe hacer perder el contexto actual.

## Calculadora Hipotecaria PRO
CAL-001 está disponible como panel flotante.
- Puede minimizarse y restaurarse.
- Conserva los valores durante la sesión del mismo usuario.
- Al cerrar sesión se elimina el estado privado no guardado.
- La cuota es una simulación matemática; no supone aprobación bancaria.

Campos principales:
- importe a financiar;
- TIN anual;
- plazo;
- precio de compra opcional;
- ingresos netos y otras cuotas opcionales.

Resultados principales:
- cuota estimada;
- total pagado;
- intereses estimados;
- porcentaje de financiación, si se informa precio;
- esfuerzo orientativo, si se informan ingresos.

## Cambio de usuario
Usar siempre `Salir`. Después del logout, la siguiente identidad TEST no debe ver el estado privado de la anterior.

## Mensajes y permisos
- Si un recurso no está permitido, la APP no debe mostrar sus datos.
- Un error de permisos no debe resolverse cambiando manualmente la URL.
- Las acciones sensibles requieren las autorizaciones humanas definidas en cada flujo.

## Buen uso en PRE-PROD
- Usar solo datos sintéticos.
- No copiar contraseñas ni tokens a documentos o capturas compartidas.
- Informar de cualquier pantalla que conserve datos después del logout.
- No considerar un resultado de CAL-001 como dictamen financiero.

## Estado de Fase 1
Esta versión valida shell, navegación, autenticación TEST, tema, CAL-001 y QA de navegador. La promoción a PROD y WordPress no forma parte de este manual hasta que se autorice expresamente.
