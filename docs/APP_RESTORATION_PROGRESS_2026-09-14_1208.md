# APP Fénix · progreso restauración · 2026-09-14 12:08

Continuidad complementaria de `APP_RESTORATION_EXECUTION_MATRIX_2026-09-14.md`.

## G3 · Documentos / OCR / proyección

HECHO EN RAMA:
- Contexto documento→persona conservado hasta OCR mediante `comprador=<client_code>` y `origin_type=comprador`.
- Normalización semántica de sueldo/empresa/antigüedad para no perder datos entre extractor y ficha canónica.
- Nómina/contrato: detección de número de pagas, pagas extra prorrateadas/separadas cuando el texto lo permite, bruto/neto mensual y totales anuales cuando hay base suficiente.
- Regla de cálculo: nunca anualizar si no existe número de pagas fiable; si el documento trae total anual explícito, conservar ese valor como fuente primaria y no sustituirlo por un cálculo inferido.
- Build verde tras corrección TypeScript: commit `733620c089c2cb50807d0b040067bd6203ef4cf5`, run `34841143251`, success.

PENDIENTE:
- Extender el contrato canónico de la ficha de participante con `tipo_contrato`, `modalidad_contrato`, `fecha_inicio`, `fecha_fin`, `jornada`, `categoria_profesional`, `numero_pagas`, `pagas_extra_prorrateadas`, `salario_bruto_anual`, `salario_neto_anual` y otros hechos equivalentes sin reutilizar campos semánticamente incorrectos.
- E2E controlado con PDF digital, PDF escaneado y PDF compuesto por imágenes.

## G4 · Bancos

HECHO EN RAMA:
- Localizado que `ExpedienteBankRankingGuard` dependía de `fenix-bank-ranking-test`, endpoint no válido para la restauración PROD.
- Verificado contrato canónico del Gateway PROD: `/expedientes/{id}/bancos-candidatos`, `/expedientes/{id}/envios-banco`, `/expedientes/{id}/ofertas`.
- Verificado con lectura segura que existen 6 candidatos activos para un expediente real de referencia; no se modificaron datos.
- Añadido `ExpedienteBankRankingProdGuard` sobre contratos PROD canónicos.
- Ranking Top 3 recalculado con señales registradas de envíos, ofertas y resultados; sin histórico suficiente se indica como candidato activo y no como aprobación del banco.
- Montado en `DetailShellGate` junto al expediente.
- Build verde: commit `033ea595db068a64e86f4ead94f613201c6b075b`, run `34841753861`, success.

REGLAS CEREBRO APP FACTORY:
1. Los cálculos financieros deben distinguir valores extraídos, valores explícitos del documento y valores derivados.
2. Las pagas extra/prorrata forman parte del contrato financiero canónico porque afectan ingreso anual y capacidad de pago.
3. Un ranking bancario no puede depender de un endpoint TEST en PROD.
4. Sin evidencia histórica suficiente, un banco puede ser candidato pero no debe recibir una apariencia de aprobación o certeza artificial.
5. El ranking debe evolucionar con resultados observados y ser recalculable cuando cambien envíos/ofertas/resultados.
