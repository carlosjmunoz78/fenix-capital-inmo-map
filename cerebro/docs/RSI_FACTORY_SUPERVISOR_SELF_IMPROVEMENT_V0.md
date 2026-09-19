# CEREBRO OS · RSI · Factory/Supervisor Self-Improvement V0

Factory mejora scaffolds solo cuando existe patrón repetido y evidencia multi-motor.
El cambio nace como Vnext, incluye contract test y fixtures, y no muta motores existentes automáticamente.

Supervisor mantiene ledger idempotente, máximo 3 intentos, backoff, evidence_ref, gate de rollback y anti-double-promotion.
Supervisor orquesta; no decide por sí solo que el candidato es bueno.
