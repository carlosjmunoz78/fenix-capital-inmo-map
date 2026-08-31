# UI MASTER LOCK · PRE-PROD

## Estado
**Inicio Dirección: CERRADO / PERFECTO / PATRÓN MAESTRO**

Baseline visual aprobado sobre `preprod-app-phase1` con referencia al estado alcanzado tras `fd961ae94f5e81d9eaaf766e492b162623e249a6`.

## Elementos globales bloqueados
Estos elementos deben mantenerse visual y funcionalmente iguales en todas las pantallas sucesivas, salvo cambio explícito posterior:

- Menú lateral completo: logo, FÉNIX CAPITAL, navegación, estados y proporciones.
- Parte superior / topbar: buscador avanzado, buscador, claro/oscuro, notificaciones, perfil y cierre de sesión.
- Bloque inferior izquierdo “¿Necesitas ayuda?” con Ana y acceso al chat.
- Accesos rápidos: mismo lenguaje visual, altura, iconografía, espaciado y comportamiento base.
- Calculadora flotante: misma posición/comportamiento, launcher naranja compacto y texto sin `PRO`; panel con título `Calculadora Hipotecaria`.
- Modo claro/oscuro y comportamiento responsive del shell maestro.

## Regla para nuevas pantallas
Al construir Expedientes y todas las pantallas posteriores:

1. No rediseñar ni reescalar estos bloques globales.
2. No duplicarlos con variantes locales.
3. Solo debe cambiar el contenido central específico de cada módulo y el estado activo del menú.
4. Cualquier modificación del patrón maestro requiere aprobación visual explícita antes de aplicarse globalmente.
5. No tocar `main`, PROD ni WordPress desde este trabajo PRE-PROD.

## Excepción pendiente
La Ana vertical del contenido de Inicio Dirección pertenece al contenido central de esa pantalla y no al shell global. Cualquier revisión futura de esa imagen debe hacerse sin alterar el patrón maestro bloqueado arriba.
