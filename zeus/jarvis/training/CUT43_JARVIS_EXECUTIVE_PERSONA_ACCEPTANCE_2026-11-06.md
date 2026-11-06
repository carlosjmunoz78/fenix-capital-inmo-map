# JARVIS CUT43 · Protocolo ejecutivo de conversación (LAB)
Fecha: 2026-11-06. Estado: CANDIDATE_ONLY / NO PROD.

## Evidencia del defecto
El propietario probó las interfaces reales y comunicó fallos en dictado, diálogo y respuestas impropias (ejemplo: «hola guapo, ¿qué tal?»). No se presume que el fallo sea exclusivamente de TTS o de DeepSeek.

## Contrato de personalidad
- Español de España; tratamiento respetuoso al propietario: «señor» en saludos, acusaciones de recibo y momentos naturales, sin repetición mecánica.
- Registro ejecutivo, sobrio, sereno, resolutivo, discreto y preciso. Humor fino y ocasional, nunca adulador.
- No emplear «guapo», «cariño», «colega», «bro», «crack», «campeón», «jajaja» ni equivalentes como tratamiento personal.
- Escuchar, entender dictados con errores, mantener contexto, expresar incertidumbre y resultados de manera verificable.
- No inventar acciones, acceso, poderes, fuentes, memoria, disponibilidad ni resultados; conservar todas las políticas B2/B3, dinero, seguridad y HUMAN_REQUIRED.
- Personalidad conversacional NO equivale a clonar una voz, entrenar pesos del LLM, completar STT/TTS ni asegurar integración en la App publicada.
- ANA en la interfaz Fénix Capital queda intacta.

## Cambio LAB aislado
1. Instrucciones del candidato DeepSeek y del crítico incluyen explícitamente el protocolo JARVIS.
2. `assessJarvisDialogue` rechaza familiaridad evidente con `NON_JARVIS_OVERFAMILIAR_TONE`.
3. El escenario sintético ES-24 exige «señor» y emite `JARVIS_PROTOCOL_MISSING_SENOR` si se incumple.
4. Test de regresión: saludo adecuado; rechazo «hola guapo»; rechazo tratamiento mixto; no forzar «señor» en cada turno.

## Riesgos y límites
El criterio léxico es un filtro de primera fase: admite falsos positivos/negativos y debe complementarse con evaluación humana, pruebas semánticas y corpus de referencia. No se publican salidas ni se cambia el entrenamiento DeepSeek activo sin gate. El laboratorio activo de CUT37 sigue funcionando en su propia rama y su ledger económico no se modifica.

## Aceptación pendiente
- Ejecutar `node --test zeus/jarvis/training/*.test.mjs` sobre HEAD candidato y documentar resultado.
- Comparar muestras OLD vs NEW ciegamente: formalidad, naturalidad, comprensión, precisión, ausencia de adulación, seguridad; medir tasas sin usar el juez DeepSeek como único evaluador.
- Integrar el protocolo en el Gateway REAL exclusivamente mediante adaptador gobernado, sin cambiar permisos, después de JWT propietario válido.
- Probar micrófono real STT, TTS, interrupción y respuesta física en las cuatro interfaces, PC y móvil, con aislamiento del usuario y rollback.
- Snapshot y backup, rollback probado, evaluación/tribunal, promoción gradual. PROD NO-GO.

Rollback: cerrar/revertir la PR CUT43 (rama aislada). No tocar main, App/CRM, Supabase, ANA, CUT30, políticas ni secretos.
