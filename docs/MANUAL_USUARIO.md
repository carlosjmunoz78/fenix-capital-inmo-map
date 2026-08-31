# Manual de usuario · APP Fénix Capital · Fase 1 PRE-PROD

## Acceso
La APP PRE-PROD se abre únicamente en el host PRE-PROD que figure como validado en el runbook. No se considera una URL cerrada hasta superar un smoke HTTPS real.

La pantalla de acceso admite únicamente identidades TEST autorizadas durante PRE-PROD. Los alias disponibles en cliente son `FIN-A`, `FIN-B`, `VIS-A` y `VIS-B`. Dirección usa su identidad TEST autorizada.

No introducir datos reales de clientes en pruebas.

## Recuperar contraseña
1. Escribe tu usuario TEST.
2. Pulsa **¿Has olvidado tu contraseña?**.
3. La APP solicitará a Supabase el código de recuperación.
4. Revisa el correo asociado al usuario TEST.
5. Introduce el código recibido.
6. Escribe y confirma la nueva contraseña.
7. La APP valida el código antes de guardar la nueva contraseña.

No solicites varios códigos seguidos. Supabase aplica límites temporales de envío.

## Navegación
El menú muestra exclusivamente los módulos que el backend autoriza para la sesión. La URL o el menú no conceden permisos adicionales.

La navegación de Fase 1 se adapta al rol:
- Dirección dispone de la visión global autorizada.
- Financiero trabaja sobre su ámbito financiero autorizado.
- Visitador trabaja sobre su ámbito B2B autorizado.

**Mi perfil no aparece como entrada del menú.** Se abre pulsando el avatar o la identidad de la cabecera. También es accesible con teclado mediante Enter o Espacio sobre ese control.

## Mi perfil
La ficha muestra únicamente la identidad disponible en la sesión: nombre, email y rol. Si Supabase Auth aporta una fotografía HTTPS de perfil, se muestra esa imagen real. Si no existe foto, la APP usa iniciales; no genera una fotografía ficticia.

## Notarías
El módulo **Notarías** es un directorio maestro de consulta y está separado del flujo de FEIN, acta y firma.

- Dirección y Financiero pueden verlo cuando el backend lo autoriza.
- Visitador no tiene acceso al directorio y recibe aislamiento 403.
- La ficha muestra solo datos realmente existentes: dirección, localidad, notario/oficial principal, teléfono, email, horario/observaciones, notas y última firma cuando estén disponibles.
- Los campos ausentes aparecen como `No disponible`; no se completan por intuición.

## Tema Claro/Oscuro
El botón de tema permanece accesible en la APP. Cambiarlo no debe hacer perder el contexto actual.

## Calculadora hipotecaria
CAL-001 está disponible como panel flotante global.
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

## Acciones y confirmaciones
Las acciones sensibles no se guardan automáticamente. Cuando un flujo lo requiere, Ana o la ficha muestran primero una vista previa y la escritura solo se ejecuta tras confirmar.

## Avisos
El centro de avisos de esta fase no simula una fuente de notificaciones independiente. Solo deriva avisos de tareas canónicas pendientes cuando existe fecha o criticidad explícita.

## Economía
Economía es de solo lectura para Dirección. Cualquier cifra que no pueda derivarse con seguridad de una fuente autorizada se presenta como `No disponible`.

## Cambio de usuario
Usar siempre **Salir**. Después del logout, la siguiente identidad TEST no debe ver el estado privado de la anterior.

## Mensajes y permisos
- Si un recurso no está permitido, la APP no debe mostrar sus datos.
- Un error de permisos no debe resolverse cambiando manualmente la URL.
- Las acciones sensibles requieren las autorizaciones definidas en cada flujo.
- Nunca interpretar un `No disponible` como cero.

## Buen uso en PRE-PROD
- Usar solo datos sintéticos en pruebas.
- No copiar contraseñas, códigos OTP ni tokens a documentos o capturas compartidas.
- Informar de cualquier pantalla que conserve datos después del logout.
- No considerar un resultado de CAL-001 como dictamen financiero.

## Estado de Fase 1
La versión vigente cubre autenticación TEST, navegación por rol, shell compartido, perfil desde cabecera, calculadora, tema, módulos operativos canónicos, RBAC, preview de acciones sensibles y QA de navegador. La promoción a PROD y WordPress no forma parte de este manual hasta que se autorice expresamente.