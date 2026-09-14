# Contrato RBAC · original documental

Estado: DEFINIDO / AUDITADO EN BACKEND / NO PROMOCIONADO EN UI

## Cadena autorizada confirmada

1. `fenix_prod_document_get_server(actor, document_code)` valida ámbito de documento y devuelve el `upload_id` cuando el actor está autorizado.
2. `fenix_prod_document_extract_resolve_server(actor, upload_id)` vuelve a validar ámbito y resuelve el original asociado.
3. `fenix_prod_document_view_path_server(actor, document_code)` aplica `fenix_prod_document_access_server` y devuelve únicamente la versión autorizada con `storage_path`, MIME, tamaño y versión.

## Política de acceso objetivo

- Dirección: ALLOW cuando el contrato backend autoriza el documento.
- Financiero propietario del expediente/documento: ALLOW cuando el contrato backend confirma su ámbito.
- Financiero ajeno al expediente/documento: DENY.
- Navegador sin sesión válida: DENY.

El bucket `fenix-prod-documents` permanece privado. La App no debe construir rutas directas al bucket, publicar `storage_path`, usar `getPublicUrl`, ni generar una descarga cliente-side saltándose el backend.

## Ruta HTTP pendiente

La descarga visible en App deberá obtener una URL firmada de corta duración exclusivamente después de pasar el RBAC servidor. La URL firmada no se persiste como URL pública y no convierte el bucket en público.

## Criterio de promoción

No marcar descarga de original como HECHO hasta disponer de:

- capa HTTP autenticada sobre los contratos anteriores;
- test Dirección = ALLOW;
- test Financiero propietario = ALLOW;
- test Financiero ajeno = DENY;
- expiración de URL firmada verificada;
- comprobación de ausencia de ruta pública/directa al bucket `fenix-prod-documents`;
- rollback documentado.

Hasta entonces el estado de descarga del original es PARCIAL.
