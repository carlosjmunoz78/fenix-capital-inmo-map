# SOC-001 · Puente universal genérico desplegado, IAM aún OFF

**Código exacto del Worker de LAB** guardado en `social-creative-bridge.generic-soc-engine.lab.worker.mjs`.

- La clase `SocialUniversalMediaRuntime` admite `capability(engineId='SOC-001')`, `requestPrivateImage(command,engineId='SOC-001')`, `privateReceipt(request_id,engineId='SOC-001')` y `privateJPEG(request_id,engineId='SOC-001')`. Para un nuevo `SOC-002` no requiere otro Worker, pero sí firma e identidad activa dentro del Vault FACT.
- El Gateway FACT verificará runtime SOCIAL-LAB, token privado de ese runtime, prefijo SOC- y la identidad firmada de cada motor, cuando el token esté instalado mediante vía autorizada.
- La ruta Social anterior `SOCIAL_CONTENT_REQUESTED` sigue en funcionamiento. No se modificó su flujo de publicación.
- ***NO SE HA ACTIVADO*** el nuevo IAM de Social: `SOCIAL_UNIVERSAL_IAM_ENABLED=false` y `UNIVERSAL_RUNTIME_IAM_ENABLED=false`, porque la creación de la credencial específica fue bloqueada por la capa de seguridad. No se deben reusar secretos de mayor privilegio ni saltar el control.
- Ninguna ruta pública nueva. No activar Instagram/Facebook AUTOQUAL o Buffer. `PROD` intacta.
- Snapshot anterior al cambio: `backups/social-creative-bridge-before-generic-engine-id-20261112.worker.mjs`.
- Para rollback: restaurar el snapshot anterior con bindings actuales preservados después de comparar OLD vs NEW; evitar tocar los consumidores de colas.
