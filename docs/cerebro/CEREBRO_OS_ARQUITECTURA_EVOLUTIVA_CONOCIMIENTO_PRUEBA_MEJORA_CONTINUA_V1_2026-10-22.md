# CEREBRO OS · Arquitectura Evolutiva, Conocimiento, Prueba y Mejora Continua
**Versión:** 1.0  
**Fecha:** 22-10-2026  
**Estado:** DEFINIDO · CANÓNICO CANDIDATO · NO PROMOVIDO A PROD  
**Ámbito:** CEREBRO OS multiempresa completo

## 1. Decisión maestra
CEREBRO debe comportarse como una organización empresarial evolutiva. No se crea un agente aislado por cada microtarea ni un único agente generalista para todo. La estructura objetivo es:

**CEREBRO → departamentos → directores → especialistas → skills/herramientas → familias de conocimiento → proyectos/empresas.**

Los especialistas son lógicos y comparten runtime, herramientas, memoria, evaluación y observabilidad. Solo se activan los necesarios para cada trabajo.

## 2. Nueva empresa = nuevo proyecto operativo
Cuando CEREBRO o la Dirección decidan crear una nueva empresa, debe crearse automáticamente un nuevo proyecto/tenant con `company_id`, sin copiar CEREBRO ni hacer forks innecesarios.

El flujo objetivo es:

1. Registrar la empresa y su objetivo de negocio.
2. Investigar sector, mercado, competencia, cliente, regulación, canales y tecnologías.
3. Buscar conocimiento externo útil: documentación, estudios, repositorios, librerías, scripts, APIs, MCPs, conectores, plantillas, benchmarks, herramientas open-source y capacidades ya contratadas.
4. Detectar qué departamentos y especialistas existentes sirven.
5. Detectar gaps reales de conocimiento/capacidad.
6. Ampliar especialistas existentes o crear nuevos especialistas lógicos cuando el gap sea real.
7. Crear o cargar la familia sectorial de conocimiento necesaria.
8. Crear marca e identidad cuando proceda.
9. Crear web/ecommerce/app según el negocio.
10. Crear y configurar redes sociales y canales necesarios.
11. Crear SEO, contenidos, funnels, email, comunicación, captación, ventas, soporte, analítica, seguridad, automatizaciones, documentación, operaciones y demás capacidades aplicables.
12. Probar en LAB/PREPROD.
13. Promover a PROD con evidencia, rollback y monitorización.
14. Entrar en mejora continua automática.

## 3. Granularidad correcta de especialistas
La granularidad se decide por diferencia real de disciplina, canal, producto o contexto.

### Redes sociales
Debe existir un Director Social/Marketing y especialistas por red cuando la plataforma sea materialmente distinta: Instagram, Facebook, LinkedIn, TikTok, YouTube y futuras redes relevantes. Cada especialista conoce algoritmos, formatos, audiencia, lenguaje, frecuencia, creatividades, métricas y técnicas propias de su plataforma.

### Web
Debe existir dirección Web/UX/Conversion compartida y perfiles/especialistas por empresa o familia web cuando el negocio, tecnología, público o modelo de conversión cambien de forma material. No se duplica conocimiento universal; se cargan perfiles de empresa y familia sectorial.

### SEO
Debe funcionar como equipo coordinado: dirección SEO + técnico + contenidos + arquitectura + keyword research + local SEO + enlazado + autoridad/digital PR + analítica + CRO + competencia, activando solo los perfiles necesarios.

### Ingeniería
Dirección de Ingeniería/Arquitectura + frontend + backend + web + Android + iOS + QA + seguridad + DevOps/release + performance + datos + UX/UI y especialidades futuras. No todos trabajan en todas las tareas.

### Ciberseguridad
Debe incluir defensa, hardening, observabilidad, respuesta a incidentes, threat modeling, red team y pruebas ofensivas únicamente sobre activos propios/autorizados, LAB o PREPROD. Ingeniería inversa se usa de forma legítima para interoperabilidad, diagnóstico, investigación defensiva, compatibilidad, análisis de malware autorizado o comprensión de sistemas propios; nunca para acceso no autorizado.

## 4. Arquitectura de conocimiento para TODOS los agentes/especialistas
Ningún especialista se considera completo solo por tener nombre, prompt o rol. Todos deben recibir y mantener:

1. **Conocimiento universal de CEREBRO:** políticas, seguridad, coste, evidencia, autonomía, multiempresa, rollback, human-by-exception.
2. **Conocimiento profesional:** disciplina concreta al máximo nivel posible.
3. **Conocimiento de canal/plataforma:** Instagram, Android, WordPress, LinkedIn, etc.
4. **Familia sectorial:** inmobiliario-financiero, SaaS/IA, ecommerce, mascotas, automoción, salud, hostelería u otras que se creen.
5. **Conocimiento de empresa:** marca, productos, clientes, procesos, objetivos, restricciones, sistemas, histórico y métricas.
6. **Conocimiento de proyecto/contexto:** campaña, app, web, producto, expediente o tarea actual.
7. **Aprendizaje por resultados:** qué se hizo, por qué, resultado, corrección, precedente y confianza.
8. **Conocimiento externo continuo:** nuevas técnicas, documentación, librerías, herramientas, repositorios, estándares y cambios de plataforma.

El conocimiento no se duplica innecesariamente. Se comparte por capas y se carga por contexto.

## 5. Búsqueda automática de capacidad y conocimiento
Ante un gap, CEREBRO debe buscar automáticamente, en este orden razonable:

- capacidad ya existente dentro de CEREBRO;
- documentación oficial y estándares;
- código propio reutilizable;
- librerías y frameworks open-source;
- repositorios y proyectos de referencia;
- scripts/CLI;
- APIs y conectores oficiales;
- MCPs autorizados;
- herramientas ya contratadas;
- free tiers y alternativas coste 0;
- construcción propia mediante FACT-001;
- servicio de pago solo si no existe ruta suficiente y el ROI/política lo autoriza.

Cada incorporación debe validar licencia, seguridad, privacidad, mantenimiento, coste, compatibilidad y reversibilidad.

## 6. Regla obligatoria de demostración
**NO KNOWLEDGE WITHOUT PROOF. NO IMPROVEMENT WITHOUT COMPARISON.**

Una capacidad nueva no se considera aprendida hasta demostrarla con un artefacto, test o ejecución real cuando sea técnicamente razonable.

Ejemplos:
- PDF → generar PDF real.
- Mejora de PDF → OLD vs NEW y comparación de calidad.
- Diseño → creatividad real evaluada.
- Web → página/feature funcional en PREPROD.
- App → build instalable y test físico cuando corresponda.
- Voz → muestra reproducible y evaluación.
- Automatización → ejecución idempotente con casos válidos y fallos controlados.
- SEO → cambio de prueba + medición correspondiente.
- Ciberseguridad → reproducción controlada en sandbox/autorizado + detección/mitigación + evidencia.

Debe existir un **Capability Proof Registry** con: capability_id, especialista/equipo, versión, fuente de conocimiento, prueba, artefacto, métricas, coste, resultado, OLD vs NEW, fecha, confianza, rollback y estado de promoción.

## 7. Mejora continua universal
Todo activo de CEREBRO entra en el ciclo:

**OBSERVAR → DETECTAR MEJORA → INVESTIGAR → PROPONER/CONSTRUIR → PROBAR → OLD vs NEW → TRIBUNAL/QA → PROMOVER → MEDIR → APRENDER → REPETIR.**

Aplica a:
- CEREBRO Console;
- app móvil CEREBRO;
- App Fénix Capital;
- fenixcapital.es;
- Instagram, Facebook y LinkedIn activos;
- futuras redes;
- webs y apps de nuevas empresas;
- SEO;
- diseño;
- voz y comunicación;
- ventas;
- soporte;
- automatizaciones;
- seguridad;
- documentos;
- datos;
- procesos;
- motores y agentes/especialistas.

## 8. Política LAB/PREPROD/PROD
### LAB/PREPROD
Entorno de experimentación agresiva. Se puede modificar, probar, romper, reconstruir y comparar todo lo necesario dentro de seguridad, coste y aislamiento. El objetivo es aprender rápido.

### PROD
No se congela. También debe mejorar continuamente, pero mediante:

**candidato → backup → tests → OLD vs NEW → PREPROD → rollback probado → promoción gradual → monitorización → corrección/rollback si empeora.**

PREPROD no es destino final. Las mejoras demostradas deben acabar llegando a PROD.

## 9. Estado operativo que debe protegerse especialmente
A fecha de esta decisión, tratar con especial cuidado los activos ya operativos/reales:

- App de trabajo del equipo Fénix Capital.
- Web `fenixcapital.es`, actualmente en evolución.
- Publicación real en Instagram, Facebook y LinkedIn.

Esto no significa “no tocar”. Significa mejorar con gates y rollback superiores a los de LAB/PREPROD.

## 10. Componentes lógicos que deben quedar formalizados
Sin asumir que todos requieran motor nuevo, CEREBRO necesita cubrir explícitamente:

- Organization / Specialist Registry.
- Department & Director Orchestrator.
- Specialist Activation Planner.
- Knowledge Family Registry.
- Company Knowledge Overlay.
- Continuous Knowledge Scout/Ingestion.
- Capability Gap Detector.
- Skill/Repo/Library/Script/Tool Scout.
- Capability Proof Registry.
- Proof/Artifact Generator.
- OLD vs NEW Evaluator.
- Continuous Improvement Orchestrator.
- Project/Company Bootstrap Team Planner.
- Cross-project Learning Promoter.

FACT-001 debe ampliar motores existentes antes de crear uno nuevo si el contrato ya cabe dentro de ellos.

## 11. Paralelismo y coste
Puede haber cientos de especialistas lógicos disponibles sin ejecutar cientos de IAs a la vez. CEREBRO activa solo los necesarios, en paralelo cuando aporte velocidad, respetando recursos, prioridad, presupuesto y dependencias.

El orden de coste sigue siendo: lógica determinista → open-source/local → herramientas ya contratadas → free tier → servicio externo barato → IA de pago solo cuando aporte valor necesario.

## 12. NEXT_BLOCK · primero conocimiento de lo que ya tenemos
Antes de seguir creando nuevos especialistas a ciegas:

1. Inventariar **todos** los agentes, directores, especialistas, motores y equipos actuales.
2. Para cada uno registrar: misión, departamento, capacidades, herramientas, conocimiento actual, familia sectorial, empresas que atiende, autonomía, pruebas existentes y gaps.
3. Detectar agentes demasiado generales y dividirlos solo cuando exista especialización material (por red, plataforma, disciplina o producto).
4. Detectar duplicados y fusionar solo mediante OLD vs NEW; no borrar nada sin evidencia.
5. Construir el **Knowledge Baseline V1** de cada especialista actual.
6. Conectar fuentes externas y búsqueda autónoma de nuevo conocimiento.
7. Exigir una prueba real inicial de cada capacidad.
8. Activar el ciclo continuo de mejora y prueba.
9. Empezar por los activos que ya producen trabajo real: App Fénix, fenixcapital.es, Instagram, Facebook, LinkedIn; en paralelo Console y app móvil CEREBRO por estar en construcción y admitir iteración agresiva.

## 13. Regla de crecimiento
Cada nueva empresa, nueva skill o nuevo conocimiento debe aumentar el patrimonio intelectual reutilizable de CEREBRO. Una capacidad aprendida para una empresa queda disponible para futuras empresas cuando sea compatible, sin mezclar datos privados ni políticas específicas.

**Crecer sin perder: CONSERVAR → ENTENDER → ENVOLVER → PROBAR → MEJORAR → PROMOVER → APRENDER → REUTILIZAR.**
