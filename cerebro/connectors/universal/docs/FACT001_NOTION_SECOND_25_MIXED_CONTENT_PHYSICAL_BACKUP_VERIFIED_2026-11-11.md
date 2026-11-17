# FACT-001 · Lote 2 Notion · 24 páginas + 1 fuente · CONTENIDO CIFRADO VERIFICADO
Fecha de registro: 2026-11-11 · Rama `cerebro/fact001-cloudflare-universal-dual-lab-v0-20261109` · PR #44 DRAFT · LAB

## HECHO FÍSICO
- Manifiesto original: 6.632 objetos buscables (6.446 páginas y 186 fuentes), hash de IDs `205ca4905aafee82d1205c11b90685349b90e8c86062e4cca0dbb5edf4ca79ca`. La nueva planificación verificó el hash exacto tras 67 consultas; ningún cambio de inventario.
- Lote 2: posiciones 25–49, offset lógico siguiente 50. Batch_ref `f84ce878daf73f1a8567779b50d720937bd0876474861f71d40041af7ddfe787`. Composición 24 páginas y 1 fuente de datos. [Plan cifrado Drive](https://drive.google.com/file/d/1TNFhb9wTG9RTJEWxWXgK50MpeAn2r8_U/view?usp=drivesdk), ZIP SHA `bdc1fc75b32608d48d92f6bf44e9648c392b8a386c8ffdc1f1858e26cb918a22`.
- [Ejecución real GitHub Actions #42926660411](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42926660411) SUCCESS: 25/25 sobres AES-256-GCM autenticados y reconstruidos en memoria, 24 páginas recursivas + 1 data source con esquema, 68 registros y bloques de filas. **949 bloques** en total, **0 fallos**, **0 escrituras** Notion, **0 cambios de checkpoint durante ejecución**. 401 anónimo, 401 falso y 403 PROD: PASS.
- Artifact `13814845995`, ZIP 1.170.629 bytes; **SHA256 `d8e93417190470f1d9ed34ffdd40962ff33a869869378b5ee580b1fca1641026`**. 26 entradas ZIP (25 sobres distintos + proof), CRC PASS, 25 índices únicos y validación de estructura PASS.
- [Google Drive · ZIP cifrado segundo lote](https://drive.google.com/file/d/12UJyaeYukgOlFIHrLlebxLOgLTsdalcq/view?usp=drivesdk), carpeta privada preexistente `1xQe5jd-AIQLDUlfZDktVod2qSJkS4M1E`. Descarga independiente, SHA256 **idéntico** al ZIP GitHub. No se guarda texto claro en los artefactos.
- [Checkpoint inmutable de evidencia](../services/notion-content-export-v2-lab/checkpoints/second-25-mixed-content-readback.v1.json) 25→50, enlazado al checkpoint de primer lote 0→25. Es **checkpoint documental Git**, no CAS D1 desplegado.

## Estado acumulado de los dos primeros lotes
- **49 páginas con sus bloques y 1 fuente con 68 registros**, distribuidos en 50 sobres cifrados en dos ZIP independientes, todos con readback Drive verificado. Quedan al menos **6.397 páginas** y **185 fuentes de datos** del inventario accesible pendientes de contenido en estos lotes, sin sumar doblemente otros pilotos previos.
- Excluidos: archivos binarios descargables, comentarios, versiones borradas, permisos, URL firmadas caducadas y custodia independiente de clave. Restauración **física** Notion LAB aislada sigue pendiente. Global Notion **PARCIAL 6/11**.
- D1 CAS: esquema y 6 tests locales más CI verificaron reglas, pero **no se aplicó** a la D1 actual. Cloudflare D1 export nativo completó y obtuvo bookmark, pero respaldo SQL independiente nuevo **no descargado**. Gate de migración BLOQUEADO hasta copia independiente y rollback.
- LAB Edge Function nueva `cerebro-fact001-notion-content-export-v2-lab` v1 ACTIVE. Broker original `cerebro-fact001-headless-provider-lab` v33 permanece con hash `645ae3995fa0cf478d589871f00f029be2ee6bfe6228b2e1a8ef1645b98022ec`; exportador v1 y otros motores no modificados.
- App/CRM, DNS, main, Notion original y Cloudflare queue/cron sin cambios. Ninguna suscripción nueva; coste marginal de uso no comprobado en facturación.

## Próximos gates
Conservar evidencias, garantizar descifrado fuera del servicio ante pérdida de Vault mediante escrow separado, restaurar en un espacio Notion LAB aislado, extender binarios/comentarios, y solo después crear checkpoint transaccional D1 CAS sobre snapshot externo verificado. Nunca avanzar a PROD por esta evidencia parcial.
