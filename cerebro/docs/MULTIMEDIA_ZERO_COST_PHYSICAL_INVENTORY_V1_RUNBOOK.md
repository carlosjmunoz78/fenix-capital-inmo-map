# CEREBRO · Multimedia Zero-Cost Physical Inventory V1

## Objetivo
Cerrar el siguiente bloque físico de `physical-adapter-audit-v1.json` sin instalar ni descargar herramientas/modelos y sin convertir una presencia en CI en autoridad de ejecución general.

## Alcance exacto
La prueba se ejecuta únicamente sobre `GITHUB_HOSTED_UBUNTU_CI_PREPROD`. Verifica metadatos de versión de primitivas locales ya presentes:
- FFmpeg
- FFprobe
- ImageMagick (`magick` o `convert`)
- SoX
- eSpeak NG

No se instala nada. No se descarga ningún modelo. No se llama a proveedores. No se usa información de clientes. No se escribe en PROD. No hay gasto.

## Qué demuestra
Si `ffmpeg` y `ffprobe` están presentes, queda demostrado un núcleo físico local/determinista de composición e inspección multimedia en ese runtime CI concreto. ImageMagick/SoX/eSpeak NG se registran como capacidades auxiliares opcionales si existen.

## Qué NO demuestra
- presencia en el PC de Carlos;
- presencia en un servidor futuro de CEREBRO;
- GPU disponible;
- ComfyUI/Z-Image/Qwen3-TTS/LTX/Open-Sora instalados;
- calidad real de generación multimedia;
- permiso para ejecutar procesos multimedia sobre datos reales;
- permiso para publicar, llamar proveedores o tocar PROD.

## Regla de causalidad
El resultado debe cambiar al mutar la presencia de FFmpeg: si `ffmpeg+ffprobe` pasan de presentes a ausentes, `VERIFIED_ZERO_COST_MEDIA_CORE_PREPROD` debe pasar a `PARTIAL_ZERO_COST_MEDIA_CORE_PREPROD`.

## Flujo
1. Partir de `main` vivo.
2. Ejecutar tests puros del evaluador.
3. Ejecutar probe read-only allowlisted (`--version` / `-version`).
4. Emitir JSON de evidencia.
5. Validar que no hubo install/download/provider/customer/PROD/spend.
6. Subir el JSON como artifact de CI.
7. Exigir exact-head targeted CI + Governed Main + RSI antes de merge.
8. Tras merge, exigir replay automático en `main`.
9. Solo entonces actualizar evidencia observada y estado, sin ampliar autoridad.

## Anti-loop
Un fallo de presencia no se corrige instalando paquetes. `NOT_PRESENT_IN_THIS_RUNTIME` es evidencia válida y mantiene el adapter en modo no físico hasta auditar otro runtime autorizado.

## Rollback
Revertir los archivos de este paquete. No existe migración, instalación, modelo, secreto ni side effect externo que revertir.

## Rebuild
Reejecutar el probe sobre el runtime autorizado y reconstruir el assessment desde el JSON vivo. No reutilizar versiones históricas como prueba de presencia actual.
