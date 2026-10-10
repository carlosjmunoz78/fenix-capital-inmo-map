# VOICE-001 · Reference Capture + QA Corpus · es-ES V0

Purpose: obtain clean, authorized Spanish-from-Spain references and test every candidate voice with the same corpus.

## Reference recording

Target for first benchmark: 45–90 seconds of clean natural speech. This is an evaluation target, not a model requirement guarantee.

Recording conditions:

- quiet room;
- one speaker only;
- no music/reverb/effects;
- natural conversational rhythm;
- microphone 15–30 cm from speaker;
- avoid clipping and aggressive noise reduction;
- WAV preferred for the V0 registration path;
- record the consent/provenance reference separately in metadata; do not embed private identity data in filenames.

Suggested reference text:

> Hola. Esta es una muestra de mi voz para CEREBRO. Hablo con un ritmo natural, claro y cercano. En Córdoba hoy podemos revisar una hipoteca, un expediente, una tasación y una firma. El cliente compra una vivienda de ciento ochenta y cinco mil euros y solicita el noventa y cinco por ciento de financiación. La reunión es el miércoles, diecisiete de junio, a las diez y media. Después comprobaremos documentación, banco, notaría y próximos pasos. Quiero que la voz mantenga una pronunciación española natural, sin exagerar la entonación y sin sonar como una locución artificial.

Do not force an accent. The speaker should speak normally.

## Fixed QA corpus

Every candidate voice must synthesize the same blocks so OLD vs NEW remains comparable.

### Q1 · Conversational

`Hola, Carlos. He revisado lo que tenemos y hay dos cosas importantes. La primera está resuelta. La segunda necesita una comprobación antes de continuar.`

### Q2 · Mortgage vocabulary

`El expediente solicita el cien por cien de financiación. Antes de enviarlo al banco comprobaremos ingresos líquidos, ratio de endeudamiento, ahorro, tasación y documentación.`

### Q3 · Numbers and money

`El precio es de 185.750 euros. La aportación disponible es de 12.400 euros y la cuota estimada es de 742,35 euros al mes.`

### Q4 · Dates and time

`La firma está prevista para el miércoles 17 de junio de 2026 a las diez y media de la mañana.`

### Q5 · Córdoba geography

`Córdoba, Lucena, Montilla, Cabra, Puente Genil, Priego de Córdoba, Valdeolleros, Fuensanta y Arroyo del Moro.`

### Q6 · Proper nouns / systems

`Fénix Capital utiliza CEREBRO, Supabase, Notion, GitHub y WordPress dentro de sus flujos autorizados.`

### Q7 · Questions

`¿Quieres que lo revise ahora? ¿Prefieres la opción más rápida o la que ofrece mejores condiciones?`

### Q8 · Prosody

`Perfecto. Esto sí está bien. Ahora viene lo importante: no vamos a tocar producción hasta que la prueba sea verde.`

### Q9 · Short commands

`Para. Continúa. Repite. Abre el expediente. No envíes nada todavía.`

### Q10 · Long-form stability

`Cuando una operación depende de varias personas, CEREBRO debe mantener el contexto, comprobar qué parte está bloqueada, informar sin saturar y continuar automáticamente con todo lo que pueda ejecutar de forma segura mientras espera la acción que realmente requiere intervención humana.`

## Acceptance fields per voice

Record:

- `accent_es_es`: PASS / FAIL / REVIEW;
- `intelligibility`: 0–5;
- `naturalness`: 0–5;
- `speaker_similarity`: 0–5 when cloned;
- `prosody`: 0–5;
- `numbers_dates`: PASS / FAIL;
- `proper_nouns`: PASS / FAIL;
- `hallucination_count`;
- `repetition_count`;
- `truncation_count`;
- `latency_ms_first_audio` when measurable;
- `generation_ms_total`;
- `audio_seconds`;
- `cpu_peak_pct`;
- `ram_peak_mb`;
- `gpu_vram_peak_mb` when applicable;
- backend/model/version/reference SHA.

No provider label can substitute for physical `accent_es_es` acceptance.
