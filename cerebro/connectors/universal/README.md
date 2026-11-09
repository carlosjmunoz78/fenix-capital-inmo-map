# CEREBRO OS · FACT-001 Universal Connector Factory V0 · Cloudflare scope ALL

**Status:** CHATGPT NORMAL → GITHUB ACTIONS → CLOUDFLARE: LAB READ-ONLY PHYSICAL E2E VERIFIED (2026-11-09); native ChatGPT MCP & CEREBRO Gateway E2E NOT VERIFIED; NO PROD CHANGES.

This is a **non-invasive additive extension** under `cerebro/connectors/universal`. Existing FACT-001, `ACTGW-001`, IAM-001, registry, app, CRM, DNS, and deployed workers are untouched. It extends *capabilities*, not the canonical engine ID count.

Architecture: ChatGPT private MCP (auth client A) and CEREBRO Gateway (auth client B) => adapters => common `UniversalConnectorCore` => IAM/policy, FinOps and durable idempotency => official Cloudflare API/Wrangler => verification + audit. Both entry points must use the SAME core and catalog; no password, token, or session is shared between principals.

Cloudflare account scope: all products in account `e39a57e1ac42650ca5a6d5307cf0ac8e`. Account-wide INVENTORY is the initial horizontal capability. D1/Workers/Pages/KV/R2/zones/DNS/WAF/Access/analytics are modular; not all write functions are implemented. Expand each product after a testable least-privilege contract. A tool appearing in `inventory()` is **not** proof that the account has permissions or that its plan supports it. Only `IMPLEMENTED_LAB` capabilities may be routed; live statuses depend on physical tests.

FB proof target: `cerebro-facebook-autoqual-lab` D1 with `jurisdiction=eu`, non-public Worker disabled. D1 list/create is real official API code but unexecuted without an authorized Cloudflare token and verified Free quota. Facebook-only D1 exists in EU (UUID `e8fe801d-4b01-4e34-ac12-26014b79adc1`), validated with read-only inventory on 2026-11-09. The Facebook Worker is not deployed; Facebook source remains in private repo `fenix-capital-cerebro-social` PR #9 DRAFT. FACT-001 has not modified Facebook Worker or any production resources.

The `makeChatGPTAdapter` and `makeCerebroAdapter` are transport-neutral adapters. They deliberately DO NOT expose an unauthenticated web server. Wiring MCP OAuth, safe hosting, client plugin registration, durable store and direct CEREBRO Gateway dispatch is still required before dual physical acceptance. Never call raw core from an LLM without trusted authenticated principal injection.

Run: `npm test` (Node >=20; no external dependencies); `npm run validate`.

Rollback: revert only the isolated additive commit(s)/branch. For eventual FB D1, leave OFF and snapshot/restore via approved procedure; **never delete existing D1** to simulate rollback. No routes, domain settings, training or public postings are changed here.

New connector scaffold: add a catalog of allowed capabilities, an adapter implementing `perform`, two independently authenticated client adapters invoking shared `execute`, policy/FinOps gates, fake-HTTP tests, recovery documentation. Default status `PLANNED_NOT_ENABLED` until evidence supports promotion.

## ChatGPT normal without Work — physical read-only LAB route (2026-11-09)

An alternative to native MCP is now **working**: ChatGPT authenticated GitHub connector → isolated PR #44 branch order JSON → GitHub Actions encrypted Cloudflare API token → fixed GET-only Cloudflare API calls → safe GitHub logs and redacted receipt → ChatGPT GitHub connector. This does **not** use Work.

**E2E:** [GitHub Actions run #42677693830](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42677693830) passed. The live account had 8 D1 databases; Facebook D1 exists. Scopes READ_OK: token, account, D1, Workers, Worker Domains, Worker Settings, KV, Pages, Access, zones, DNS, zone settings, WAF Rulesets, Worker Routes. PERMISSION_BLOCKED: R2 and Logpush. Zero Cloudflare writes. Earlier official MCP handshake received 403.

The bridge **only exposes** a fixed account_readonly_audit order. It does not enable arbitrary operations, administration, or changes to DNS/Workers. Production CEREBRO Gateway physical binding and ChatGPT native MCP remain NOT VERIFIED. For writes: separate least-privilege credentials, policy/IAM, contracts, dry runs, backup, rollback, audit and expense caps.

See `docs/CHATGPT_NORMAL_GITHUB_CLOUDFLARE_BRIDGE_LAB_V1.md`.

**CEREBRO E2E LAB VERIFIED (2026-11-09):** physical Console V0 -> ACTGW-001 -> FACT-001 -> Cloudflare GET tested twice, including full 77/77 universal suite + 9/9 Gateway tests [run #42680213195](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42680213195). D1=8; Workers=6; 0 writes. Supabase deployed Gateway v33 **not connected or changed**; separate live integration still gated. R2/Logpush read scopes remain blocked.

### CEREBRO deployed OIDC sidecar (2026-11-09)

**REAL LAB READ-ONLY VERIFIED:** new Supabase Edge Function `cerebro-fact001-cloudflare-lab` v1 ACTIVE, GitHub short-lived signed OIDC, owner-deny-by-default (anonymous/forged 401), existing Supabase Vault encrypted credential (1 record), real Cloudflare GET D1=8 / Workers=7 / writes=0. [Physical proof #42688149814](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42688149814). This is additive; Supabase `cerebro-console-gateway-v0` v33 is **NOT bound to it**, App/CRM unchanged. Scoped read-only token still needed before PROD autonomy. See `supabase/fact001-lab/README.md`.

### After-interruption acceptance checkpoint · 2026-11-09

[Physical command CFD-20261109-003](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42690609031) **SUCCESS**. Twelve OIDC/tenant security tests PASS. Anonymous and fake identity rejected (401), signed OIDC accepted (200); LAB deployed Supabase sidecar reused encrypted existing Vault credential without GitHub retransmitting Cloudflare API token; Cloudflare real GET returned D1=8, Workers=7, writes=0. Exactly one named Vault record; Supabase main CEREBRO Console v33 unchanged. **LAB read-only COMPLETE; main Console PROD connection and Cloudflare write administration NOT COMPLETE**. Full check and recovery procedure in `supabase/fact001-lab/README.md`.

## Cierre: Cloudflare directo ChatGPT y CEREBRO LAB · 2026-11-09

ChatGPT normal Cloudflare MCP *directamente conectado y comprobado*: cuenta autenticada, lectura real D1=8, Workers=7, Access apps=3 sin Work. CEREBRO servicio LAB desplegado: 4.ª orden OIDC/Vault GET verificada [#42691707204](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42691707204), 12/12 tests PASS, 0 writes. **NO** declarar integrada la Consola PROD ni administración autónoma total: OAuth Cloudflare rechaza gestión de tokens (403/9109), el JWT de pruebas owner caducó, falta token dedicado read-only. Informe completo `docs/FACT001_CLOUDFLARE_DUAL_REAL_ACCEPTANCE_2026-11-09.md`.

### REAL Cloudflare CRUD E2E with CEREBRO and normal ChatGPT · 2026-11-09

**HECHO LAB:** ChatGPT normal creó Workers KV EU nueva y probó PUT/GET/DELETE; CEREBRO creó función aislada `cerebro-fact001-cloudflare-kv-write-lab` v1, firmó órdenes GitHub OIDC, leyó Vault y superó dos pruebas físicas de escritura/lectura/rollback ([#42696938902](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42696938902), [#42697512937](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42697512937)); 21/21 tests cada vez. Cero keys residuales, cero cambios App/CRM/Gateway principal. **NO** declarar control universal de escrituras de PROD ni recursos anteriores. Matriz de permisos/estados y runbook en `docs/FACT001_CLOUDFLARE_FULL_CRUD_PHYSICAL_GATES_2026-11-09.md`.

### D1 EU CRUD both clients LAB 2026-11-09

**HECHO:** ChatGPT normal creó D1 europea efímera, hizo SQL CREATE TABLE / INSERT / SELECT y eliminó su base nueva. **HECHO:** CEREBRO nueva función aislada `cerebro-fact001-cloudflare-d1-write-lab` v1 hizo el mismo ciclo con OIDC firmado y Vault; 22/22 tests y [ejecución real #42700998048](https://github.com/carlosjmunoz78/fenix-capital-inmo-map/actions/runs/42700998048) SUCCESS. Cloudflare confirmó que quedan 8 D1 originales. Main CEREBRO Console v33 sigue sin enlace a estas funciones y PROD no admite escritura autónoma. Ver matriz `docs/FACT001_CLOUDFLARE_FULL_CRUD_PHYSICAL_GATES_2026-11-09.md`.
