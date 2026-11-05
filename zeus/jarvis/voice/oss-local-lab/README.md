# CEREBRO · JARVIS V2 · Primer ensayo de voz local sin API de pago

## Estado
**LAB, no desplegado; generación de voz nueva no realizada todavía.** Es un piloto para ejecutar en el PC propietario; no usa vidIQ para hablar ni invoca APIs de síntesis de pago.

- Voz aprobada: JARVIS V2, «Más clara», velocidad 1,10×, +0,6 semitonos.
- La referencia que incluye el ZIP es una **copia inalterada** de 29,57 segundos. SHA256: `2db9951a7b334e93a8bcc2bd80ba360b5560f89b1795e2adef77ee41674bed28`.
- El motor local es **Chatterbox Multilingual V3 general** (`language_id=es`), que clona desde un audio de referencia. No es el clon de vidIQ ni el checkpoint especializado `es-es` todavía: el parecido **no se puede garantizar antes de escuchar la prueba**.
- Sin cuotas por frase ni suscripciones; sí necesita hardware suficiente y electricidad. Primer uso descarga pesos del modelo, **varios gigabytes**, desde Hugging Face. El diagnóstico recomienda al menos 12 GiB de RAM y 8 GiB libres (cuanto más margen, mejor).

## Windows · mínimo trabajo
1. Descomprime el ZIP en una carpeta de tu PC.
2. Haz doble clic en `JARVIS_DIAGNOSTICO_1_CLIC.cmd`. No instala nada. Se generará `output/JARVIS_DIAGNOSTICO_HARDWARE.json`.
3. Si el diagnóstico indica `READY_FOR_MODEL_INSTALL`, doble clic en `JARVIS_GENERAR_1_FRASE_GRATIS.cmd`. Crea un entorno Python aislado, instala dependencias abiertas y descarga el modelo. No cambia el sistema de CEREBRO, App Fénix ni ANA.
4. Cuando acabe, abre la nueva grabación `output/JARVIS_V2_LOCAL_NUEVA_FRASE_*.mp3`. Compara con el MP3 maestro y revisa la velocidad indicada en `output/JARVIS_LOCAL_OSS_EVIDENCIA_*.json`.

**El diagnóstico de un clic funciona con PowerShell de Windows, aunque aún no tengas Python ni FFmpeg. Si faltan Python 3.11 o FFmpeg con filtro rubberband, el informe indicará esos requisitos.** Se puede instalar sin suscripción, pero el instalador no modifica herramientas del sistema sin que lo decidas.

## Seguridad y calidad
- Este ZIP contiene una muestra de voz privada. No subirla a repositorios públicos ni servicios de demostración.
- Mantén el ZIP y sus ficheros en un lugar privado. Las contraseñas, tokens y texto sensible no deben introducirse en la prueba.
- El runtime funciona en modo offline por defecto; `--allow-model-download` solo habilita la descarga gratuita de pesos desde Hugging Face. No sube el audio de referencia a ningún servicio de síntesis.
- No modifica ni sustituye voz ANA ni configura el Gateway de producción.
- Si la calidad o latencia no es adecuada, se rechaza el candidato. Se evaluará alternativa gratuita antes de gastar dinero.
- Certificación de derechos/alcance comercial del actor: pendiente de validación documental antes de promoción pública.
- No considerar una API de `speechSynthesis` del navegador como JARVIS clonada.

## Pruebas técnicas reproducibles

```sh
python jarvis_local_voice.py probe
python -m unittest discover -s tests -v
# En un equipo adecuado con dependencias instaladas:
python jarvis_local_voice.py render --allow-model-download
```

## Reversión
Borrar `.venv-jarvis-oss/`, `output/` y este directorio. No existe otro despliegue. La V1 maestra y V2 en Drive no se han modificado.