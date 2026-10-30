# CEREBRO Enterprise Portfolio Fair-Share V1

Estado: PREPROD

## Objetivo

Evitar que una campaña grande monopolice la capacidad GitHub Enterprise y mantener avance simultáneo entre NEURONAL y los frentes canónicos W00-W24.

## Reparto físico objetivo

- NEURONAL: máximo 50 jobs concurrentes.
- Portfolio W00-W24: 25 bloques x 5 shards = 125 jobs concurrentes.
- Reserva operativa: 5 slots para validación, planificación, aceptación y control.
- Cap vivo compartido: 180.

El reparto no crea una segunda cola, scheduler ni daemon. Reutiliza los workflows existentes y el pool físico compartido de GitHub Actions.

## Portfolio cubierto

W00 inventario/evidencia, W01 navegador, W02 extensión universal, W03 control PC, W04 JARVIS móvil, W05 notificaciones/eventos, W06 identidad/credenciales, W07-W08 Social, W09 SEO, W10 agentes/subagentes/conocimiento, W11 Skill Engine, W12 App Fénix, W13 Console/JARVIS, W14 identidad/voz, W15 memoria/conocimiento, W16 Model Router, W17 Learning/RSI, W18 procedimientos Browser, W19 seguridad/rollback, W20 E2E, W21 JARVIS View, W22 App Factory, W23-W24 ZEUS.

## Sharding

Cada bloque W00-W24 se divide en cinco shards deterministas de evidencia/repositorio. Los shards de un mismo bloque no comparten rutas seleccionadas dentro de una misma revisión, evitando repetir exactamente el mismo trabajo para inflar concurrencia.

## Gobernanza

- PREPROD.
- PROD write: false.
- Trading: false.
- DeepSeek: solo opt-in explícito y máximo 8.
- Sin nueva suscripción ni recarga automática.
- PRs ejecutan gates ligeros; el fanout pesado se reserva a ramas autorizadas/main/dispatch según workflow.

## Rollback

Revertir los cambios de `.github/workflows/cerebro-neuronal-superparallel-v1.yml`, `.github/workflows/cerebro-max-fanout-24h-v1.yml` y `cerebro/runtime/max-fanout-block-worker-v1.mjs` restaura el reparto anterior sin modificar datos transaccionales ni PROD.
