# CEREBRO Human Dialogue + Knowledge Map + Clarification V1 · deploy marker

Date: 2026-10-01
Company: fenix
Additional recurring cost: 0 EUR

Owner requirements implemented:
- closer, more human spoken expressions such as Claro, Mira, Vale and Te cuento without forcing the same phrase every time;
- on greeting, address the owner as Carlos and use close variants including «guapo»;
- broad knowledge questions return a structured map of what CEREBRO knows instead of raw retrieval snippets;
- legal/inmobiliario broad questions expose arras/compraventa, Registro/cargas, Catastro, notaría/firma, herencias, donaciones, fiscalidad, property risk and AML/compliance;
- uncertain or poorly understood questions ask one natural clarification instead of guessing;
- full written detail remains available while speech stays concise and conversational;
- Local VAD verbal interruption and unlimited voice turns are preserved.

Evidence before promotion:
- PR #475 exact reviewed head: 1f930cf3ecc07f4496c63f4df6760d1f884c1b7f
- CEREBRO Session Context Regression Guard #148: SUCCESS
- App Restoration Build Gate #391: SUCCESS
- Human Dialogue + Knowledge Map + Clarification V1 corpus: GREEN
- merge: fac3ea1141715af2ba9059e5afaf34948fcdb7fa
- Gateway PROD deployed as ACTIVE V27
- Gateway artifact SHA256: cccc3dce290dbf9530f185501341ca837058defcece06a862ee6fd805123e485
- previous frontend rollback source: c12edfae5f65fdb95c1dbf6b6fcfd921509ca21e

Physical conversational acceptance remains required after frontend production deployment.
