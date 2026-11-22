# CEREBRO OS · CUT38 · JARVIS PRESENTE EN LA INTERFAZ

Fecha: 2026-11-06 · Repositorio carlosjmunoz78/fenix-capital-inmo-map
Entorno de implementación: rama aislada cerebro/jarvis-always-present-interface-lab-20261106 · PROD NO MODIFICADO

## Inventario de lo existente (observación física READ-ONLY)

En https://app.fenixcapital.es/cerebro, autenticado como propietario, la interfaz Jarvis ya exhibía los tres controles inferiores: textarea Mensaje para Jarvis, Dictar, Conversación por voz. El frontend de `src/CerebroJarvisWorkConsole.tsx` aloja `JarvisEmbeddedConsole.tsx`, que integra `CerebroConsoleShell.tsx` con `JarvisOperativaComposerPortal.tsx`. La comunicación actual pasa por `cerebroConsoleApi.ts` a un Gateway autenticado. El módulo de aprendizaje DeepSeek del CUT37 tiene un presupuesto y runtime separados; NO constituye por sí mismo el modelo del chat en PROD.

## Fallos encontrados

1. El estado de disponibilidad del compositor se infería de un texto visible traducible ('Transporte autenticado verificado'), no del textarea realmente habilitado por el Gateway.
2. El envío usaba manipulación de un formulario oculto de React y `requestSubmit()` temporizado; dependía del DOM y podía perder un mensaje si el evento no se sincronizaba.
3. Una caída en la única comprobación inicial de salud del Gateway dejaba el chat inutilizable hasta recargar toda la pantalla.
4. Cambiar del inicio a un proyecto desmontaba la conversación y hacía perder los turnos recientes.
5. El estado de JARVIS junto a escribir/dictar/hablar no estaba suficientemente claro; el compositor estaba inhabilitado incluso para redactar un borrador sin red.
6. Editar/Reconciliar proyectos introducía solicitudes en el formulario oculto, no en el campo que ve el propietario.

## Cambios de CUT38

- `jarvisComposerBridge.ts`: eventos UI locales tipados para enviar y precomponer comandos, aceptados únicamente si la consola de Gateway autenticada está montada y lista. NO crea un nuevo Gateway ni consulta modelos directamente.
- `JarvisOperativaComposerPortal.tsx`: indicador JARVIS activo/conectando/no disponible, textarea siempre editable, Dictar independiente de la disponibilidad de Gateway (si navegador soporta reconocimiento), Hablar habilitado solo cuando la sesión segura está lista, enviar solo tras interacción y aceptación.
- `CerebroConsoleShell.tsx`: mensajes transferidos sin formulario oculto; pruebas de salud al abrir y cada 30 s si la pestaña está visible, y tras volver la conexión o foco. Solo lectura; autorización `CARLOS-ADMIN` y flags safe existentes.
- `cerebroConsoleApi.ts`: timeout de 12 s para GET de salud/preferencias; ningún cambio de POST ni autenticación.
- `jarvisConversationMemory.ts`: hasta 24 turnos, memoria temporal de 4 h en la pestaña, asociada exclusivamente al UUID Supabase autenticado, borrada al salir de la cuenta y nunca guardada en localStorage o backend. NO conserva confirmaciones ni tokens pendientes.
- `CerebroJarvisWorkConsole.tsx`: comandos del proyecto se dirigen al compositor inferior visible; se conserva fallback OLD para compatibilidad.
- `jarvis-composer-presence.css`: estado visible y controles accesibles en móvil/escritorio sin sustituir el diseño existente.

## Condiciones de calidad y promoción

- Build TypeScript + Vite (`npm run build`), tests unitarios de aislamiento y contrato, browser E2E Playwright de escritorio y Android simulado con Gateway simulado. La transcripción se simula únicamente para las pruebas; NO se afirma que STT real funcione en todos los navegadores.
- Para considerar PROD: pruebas E2E con usuario real y Gateway, seguridad de logout, verificación de dictado real en el navegador de destino, voz TTS y reconexión, copia de seguridad, rollback de la publicación y OLD vs NEW. No usar App PREPROD cancelada; solo aislamiento en rama y gates antes de publicar.
- Respetar LIMITES: no modificar `main`, App/CRM PROD, Supabase PROD, DNS, CUT30, Trading; no añadir IA de pago ni suscripciones. No fusionar automáticamente.

## Estado de funcionalidad

EXISTENTE: interfaz de JARVIS con tres controles y Gateway seguro bajo propietario.
HECHO: implementación CUT38 en rama aislada y regresiones TypeScript/componentes.
POR AUDITAR: comportamiento real con micrófono y Gateway bajo sesión de usuario tras despliegue controlado.
BLOQUEADO PARA PROD: no promover sin gates físicos y rollback.

## Rollback

El cambio está exclusivamente en la rama indicada. Revertir la PR candidata o descartar la rama deja el estado de `main` intacto. No han cambiado valores de secretos, entidades de Supabase ni workers.
