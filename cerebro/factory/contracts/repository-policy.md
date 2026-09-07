# Repository Boundary Policy · CEREBRO

Objetivo: evitar repositorios duplicados, microservicios innecesarios y saturación operativa.

## Regla por defecto
No crear un repositorio nuevo si la capacidad puede vivir de forma segura dentro de un runtime/repo existente mediante módulo, paquete, configuración o namespace.

## Crear repositorio nuevo solo cuando exista al menos una frontera material
- aislamiento de seguridad/credenciales;
- ciclo de despliegue claramente independiente;
- dependencia tecnológica incompatible;
- volumen/artefactos que saturarían el repo existente;
- obligación legal/compliance;
- aislamiento LAB requerido (ej. Trading LAB);
- ownership/equipo independiente que justifique frontera operacional.

## Nunca usar un repo nuevo para
- una empresa nueva (usar `company_id`);
- un motor lógico pequeño;
- duplicar un endpoint existente;
- evitar entender dependencias;
- saltarse contratos o gates.

## Decisión actual FACT-001 V0
FACT-001 permanece en rama y directorio aislados dentro de `fenix-capital-inmo-map` durante V0 porque todavía no se ha demostrado una frontera que justifique un repo nuevo. Si en fases posteriores Factory adquiere ciclo de vida/runtime independiente, la migración se hará preservando historial, contratos, tests y rollback.