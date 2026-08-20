# Manual de usuario · APP Fénix Capital · Fase 1 PRE-PROD

## Acceso
La APP PRE-PROD se abre en `https://fenix-capital-preprod.vercel.app`.

La pantalla de acceso admite únicamente identidades TEST autorizadas durante PRE-PROD. `DIR-TEST` puede escribirse directamente como usuario. No introducir datos reales de clientes en pruebas.

## Recuperar contraseña
1. Escribe tu usuario TEST, por ejemplo `DIR-TEST`.
2. Pulsa **¿Has olvidado tu contraseña?**.
3. La APP solicitará a Supabase un código de recuperación.
4. Revisa el correo asociado al usuario TEST.
5. Introduce en la APP el código de 6 dígitos recibido.
6. Escribe y confirma la nueva contraseña.
7. La APP valida el código antes de guardar la nueva contraseña.

No solicites varios códigos seguidos. Supabase aplica límites temporales de envío y una ráfaga de solicitudes puede bloquear nuevos correos durante un periodo.

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
- No copiar contraseñas, códigos OTP ni tokens a documentos o capturas compartidas.
- Informar de cualquier pantalla que conserve datos después del logout.
- No considerar un resultado de CAL-001 como dictamen financiero.

## Estado de Fase 1
Esta versión valida shell, navegación, autenticación TEST, recuperación por código, tema, CAL-001 y QA de navegador. La promoción a PROD y WordPress no forma parte de este manual hasta que se autorice expresamente.
