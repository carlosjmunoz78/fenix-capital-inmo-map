# FACT001 Cloudflare Pages Headless LAB · adapter preprovisioned

Status **DEFINED + TESTS**, not deployed and not activated. Cloudflare does not currently have a CEREBRO Pages Write service token; existing `CEREBRO-FACT001-CF-WORKERS-LAB-V2` must remain Worker-only. API metadata confirms Pages Write is distinct, and no existing Cloudflare token exposes it.

Source `pages-adapter.mjs` uses only the Pages REST endpoints, fixed account and owned prefix, a separate `CF_PAGES_TOKEN` secret to be installed inside the same private CEREBRO operator, and dedicated D1 tables `fact001_cf_pages_jobs_v1`, `fact001_cf_pages_owned_v1`. Allowed operations: create empty project, change production branch, revert branch, delete empty project. No deployment, custom domain, DNS, content publication or interaction with `fenix-capital-inmo-map` Pages project. All mutations require physical provider readback and self-owned record, never a preexisting project.

**ONE manual bootstrap required by security rules:** create a Pages Write *account API token* only and enter its value directly into Cloudflare Worker Settings → Variables and Secrets as **Secret `CF_PAGES_TOKEN`**, never paste to chat, SQL, GitHub or another connector. Only then integrate the adapter as a second module by strict secret inheritance and run physical tests. This code does not bypass the previously blocked token transfer.

Full Cloudflare Pages requires further separate protected deployment and rollback gates; this first adapter covers only empty project settings lifecycle.
