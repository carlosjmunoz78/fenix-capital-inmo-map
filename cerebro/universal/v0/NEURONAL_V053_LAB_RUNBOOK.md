# CEREBRO OS · NEURONAL V0.5.3 · LAB ONLY
Fecha: 2026-11-13
Base: PR #66 / cerebro/universal-control-plane-lab-v0-20261113 @ 8edb91becc20645a400193d32cda8be947b31ae7

## Contrato
Mapa interactivo con nodos exclusivamente respaldados por ejecuciones GitHub Actions recibidas. No atribuye funcionamiento real a JOB-001 ni aprendizaje acreditado a LRN-001. Estética: núcleo blanco-cian, halo volumétrico, fragmentos de arcos parciales y microdescarga. Animación ornamental, nunca telemetría.

## Reparaciones aisladas
- Corrección del alias del Preview estable en src/cerebroActivityApi.ts para no saltar inadvertidamente el gateway protegido.
- Un fallo de lectura elimina la muestra y muestra estado UNAVAILABLE, evitando ejecuciones fantasma.
- La captura CACHED queda marcada como histórica y no representa actividad vigente.
- Solo se habilitan enlaces que coincidan con el run_id y la ruta fija GitHub Actions del repositorio.
- Nodos exclusivamente de company_id=fenix y run_id válido, máximo 12; sin datos falsos.
- Animación pausada configurable, preferencia reduced-motion, botones accesibles, inspección y pantalla completa.

## Superficie
src/CerebroNeuralView.tsx; src/cerebro-neural-view.css; src/cerebroActivityApi.ts; cerebro/universal/v0/neuronal-v053-lab.test.mjs.

## Gates
- [x] Rama aislada sobre HEAD de PR #66; main, PR #66, App/CRM PROD y WordPress intactos.
- [x] No modifica backend, permisos, trabajos, staging ni servicios externos.
- [ ] CI Node tests + TypeScript/Vite build para el HEAD exacto.
- [ ] E2E propietario en Preview protegido y revisión visual responsive/teclado.
- [ ] OLD vs NEW y rollback físico de Preview.
- [ ] Producción: NO AUTORIZADA.

## Staging
staging.fenixcapital.es permanece SUSPENDED_BY_OWNER_UNTIL_FURTHER_NOTICE. El guard JOB-001/13 aplicado sigue siendo de alcance específico; otras rutas heredadas siguen POR AUDITAR. No sondear, modificar ni reactivar staging.

## Estado
Implementación en rama LAB, no declararla CONFIRMED_OPERATIONAL hasta evidencia de CI, E2E físico y rollback. Cero nuevas suscripciones creadas; coste de plataformas existentes no auditado.

next_block: verificar CI del nuevo HEAD; corregir fallos; abrir Preview privado aislado solo con canal seguro autorizado; validar visualización física y rollback sin alterar pestañas existentes.
