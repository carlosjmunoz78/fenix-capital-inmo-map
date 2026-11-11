# FACT-001 · P4 Notion · Reconciliación incremental fail-closed · 2026-11-11

**Estado** `HECHO EN CÓDIGO / CI, NO DESPLEGADO`; Workspace y autonomía `PARCIAL`.

## Conservado
- Notion servicio independiente CEREBRO en Vault y E2E históricos CRUD de hijo sintético / restore+trash, sin repetirlos.
- Backup cifrado offsite **100 objetos** (96 páginas/4 fuentes), checkpoint D1 `100/v4`, sha y trazabilidad registrados en el traspaso previo. No ejecutar 0→100 otra vez.
- Runtime `cerebro-fact001-headless-provider-lab` v33 ACTIVE inalterado; candidato `notion-governed-operator.mjs` no está importado por `index.ts`.
- Cola Notion de LAB dedicada utiliza D1 existente Recovery UUID `1305f791-7c44-47f9-946b-f330a09c88aa`, configuración OFF, sin rutas públicas ni cron, sin Notion API writes. No crear D1 adicional.

## Cambio nuevo verificable
- `services/provider-headless-lab/notion-incremental-sync.mjs`: plan puro y determinista basado en hash validado + timestamps UTC; trabaja solamente con hijos sintéticos aprobados del parent LAB conocido, rechaza PROD, otros company_id, páginas fuera del alcance, duplicados, campos inesperados y tokens.
- Salidas de reconciliación: `UNCHANGED`, `LOCAL_CHANGE_REQUIRES_EXPLICIT_OWNER_ORDER`, `REMOTE_CHANGE_REQUIRES_SNAPSHOT_REVIEW`, `CONFLICT_HUMAN_REVIEW`. No ejecuta PATCH, POST, DELETE ni RESTORE.
- `tests/notion-incremental-sync.test.mjs`: seis nuevos tests de estado normal, remoto, local, divergencia/papelera y prohibiciones.
- **CI:** [FACT001 Headless Broker LAB Security CI 42991251014](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42991251014): headless group 156 PASS/0 fail, issuer 22 PASS, registry 5, onboarding 8, scaffold 4. No ejecución de Notion provider.
- Commit funcional: `603a61f6ae1e2a6b48939b22a6bbbe7bb003b934`.

## Lo que NO está cerrado
- Operador Notion persistente real bajo CEREBRO Gateway, con actor verificado, tabla de ownership materializada, D1 CAS de mutaciones, snapshots, política de conflictos y comprobación de rollback de contenido. 
- Backup integral 6.632 objetos, adjuntos, comentarios, permisos, escrow de clave, restitución física del contenido; por tanto no promoción global.
- Futura sync debe usar polling/webhook autorizado y reconciliation real sin sobrescribir página ajena; backup sigue en pipeline separado de la activación de conectores.

**next_block:** `NOTION_OWNER_PAGE_SCOPE_CAS_MUTATOR_AND_SYNC_E2E_LAB` solo después de las garantías antes de activar la cola. Coste nuevo 0 €, APP/CRM/PROD/Notion preexistentes intactos.
