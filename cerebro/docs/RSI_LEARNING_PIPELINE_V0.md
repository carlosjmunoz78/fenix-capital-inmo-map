# CEREBRO OS · RSI · LRN/PRV/KNW Learning Pipeline V0

Bloque D materializa:
event -> normalized_event -> outcome -> evidence -> candidate.

Propiedades:
- dedupe por company_id + engine_id + event_id + version;
- expectativa vs realidad explícita;
- provenance/evidence obligatoria;
- confidence 0..1;
- ningún candidato nace ACTIVE;
- correlación no se promociona como causalidad: un causal_claim exige experimento separado;
- repetición del mismo evento no duplica candidato/evidencia.
