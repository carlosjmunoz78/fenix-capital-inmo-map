# FACT-001 · Cloudflare v2 · Cierre físico del emisor y broker LAB · 11/11/2026

## Resultado y alcance
**HECHO:** `CF-TOKEN-ISSUER-001_P0_SCOPE_CORRECTION_AND_LAB_BROKER` para credencial v2 y ciclo de vida de token hijo D1 Read, con autenticación CEREBRO independiente y retirada de la prueba. **PARCIAL:** conector Cloudflare Universal completo y CEREBRO Gateway operativo autónomo.

### Evidencias independientes
| Prueba | Resultado | Evidencia |
|---|---|---|
| ChatGPT Cloudflare OAuth GET token | Existencia de v1/v2 y ámbitos exactos | Comprobación física 11/11/2026, sin valor token |
| ChatGPT Cloudflare OAuth PUT v2 | Reducción `Write+Read` → `Write`; GET posterior exacto | Cambio 09:10:59 UTC; cuenta Fénix |
| CEREBRO servicio firmado OIDC+Vault | READ v2 desde Vault y scope real | [Actions #42993618913](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42993618913) |
| Emisión de hijo exclusivamente D1 Read | POST HTTP200, credencial cifrada dentro de Vault | [Actions #42994346869](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42994346869) |
| Privilegio efectivo de hijo | GET D1 HTTP200; admin tokens denegado HTTP401/403 | Mismo run físico, tras propagación |
| Revocación real | DELETE HTTP200, GET D1 401/403 y ausencia de hijo | Mismo run, sin registros de token en texto |
| Limpieza | Eliminados dos Vault secretos efímeros y token hijo revocado | Revalidación Cloudflare + Vault 11/11 |
| Cutover servicio LAB read-only | `cerebro-fact001-cf-issuer-lab` v10 ACTIVE, OIDC anónimo/falso 401, firmado 200; rutas mutantes 404 | [Actions #42995197342](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42995197342) |
| Regresión | 164 headless + 29 issuer + 5 registry + 8 onboarding + 4 scaffold, 0 fallos | [Actions #42995006897](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42995006897) |

### Contrato operativo
`scope=(fenix-capital,FACT-001,LAB,1.0.0)`; `identity=owner GitHub OIDC signed`; `source=owner_order` exclusivamente emisor firmado del workflow autorizado. `active_routes={GET health, POST verify-scoped-issuer-v2}`. La respuesta contiene solo estado, IDs no secretos y permisos; nunca valores. `max_new_subscriptions_eur=0`, no cron ni endpoint público de escritura.

### Entidades preservadas y recuperación
- Supabase Vault v2 intacto y sin exponer; v1 sigue activo para no romper dependencias sin mapa completo.
- Cuenta Cloudflare, 10/10 D1 originales, Workers/DNS/Access y servicios existentes intactos.
- Sidecar versiones v6→v9 como evidencia de implementación paralela; v10 safe baseline físico con firma. Backup de código exacto en PR DRAFT, rollback de bundle posible tras gate y aprobación de restituir rutas mutantes, **no probado en reversión física**.
- El test E2E fue auto-limpiado: token hijo revocado; los dos secretos de prueba borrados de Vault; ninguno afecta credenciales del propietario.

### Límites y próximo bloque sin falsas garantías
- **NO afirmar 5/5 FULL**: Cloudflare Pages/Workers arbitrary update/rollback, colas, Access, DNS/WAF/SSL/Large Logs y PROD no están certificados con la credencial v2.
- ChatGPT OAuth y CEREBRO service OIDC **sí** probados separadamente en token management LAB; no existe E2E real del Gateway Console/owner JWT ni de automatización durable.
- V1 sobreprivilegiado aún activo. Para retirarlo: inventario de consumidores, verificación de sustitutos, backup de contratos, test de fallos y rollback controlado, nunca revocación a ciegas.
- Próximo: `CF-GATEWAY-SIGNED-OWNER-DUAL-E2E-QUEUE-LAB`, bajo nuevo permiso de mutación específica si hiciera falta. Opera último.

**Costo adicional contratado 0 €**; sin D1/Workers/proyectos nuevos ni nuevas suscripciones. PR #44 DRAFT, main no tocado.
