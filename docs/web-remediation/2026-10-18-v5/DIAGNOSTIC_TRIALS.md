# FÉNIX CAPITAL · STAGING V5 · DIAGNOSTIC TRIALS

## TRIAL-ELEMENTOR-001 · CEREBRO Pro-Free isolation

**Environment:** STAGING only  
**Purpose:** isolate repeated `elementorFrontendConfig is not defined` without changing code.  
**Variable changed:** `cerebro-pro-free-v014/cerebro-pro-free-v0.php` temporarily deactivated.  
**Pre-change backup:** plugin version `0.1.4-preprod`, SHA256 `f8207346163f79db572bc54bccf06dad6a42efc112cba9e4f9a487972d0a6ceb`.  
**Reason:** plugin contract explicitly provides Elementor-Pro-free header/footer compatibility; it was therefore a plausible source of unconditional Elementor frontend enqueue.  
**Test:** same read-only STAGING V5 responsive/JS acceptance matrix, run `39113361406`, head `6994a3a43ef2ce4938e8968d9a99156ba34a66b2`.  
**Result:** REJECTED AS ROOT CAUSE. The repeated Elementor error remained on the same five representative page classes across all five viewports. QA summary remained `32 passed / 26 failed`; the 25 repeated failures were still `ReferenceError: elementorFrontendConfig is not defined`, plus the independent Complianz consent-ui failure.  
**Additional evidence:** run-3 Lighthouse for the failing Córdoba local landing no longer contained the `CerebroProF...` inline bootstrap in its script treemap while the Elementor exception still occurred. This demonstrates that the compatibility plugin had actually dropped out of the rendered runtime for the trial and the error persisted.  
**Rollback executed:** `cerebro-pro-free-v014/cerebro-pro-free-v0.php` reactivated immediately after evidence capture.  
**State:** CLOSED / NOT CAUSAL. Do not repeat this isolation unless new evidence changes the contract.  
**PROD:** untouched.

## TRIAL-ELEMENTOR-002 · Popup Builder isolation

**Environment:** STAGING only  
**Purpose:** test whether Popup Builder was rendering site-wide Elementor-dependent assets on non-builder pages.  
**Variable changed:** `popup-builder/popup-builder.php` temporarily deactivated.  
**Pre-change backup:** version `4.4.5`, SHA256 `b586ac25849a2557c358abdefabafa73805edd1faca79d135d63f021285ca61b`.  
**Test:** same read-only visual/JS acceptance job only; Lighthouse remained independently green.  
**Result:** REJECTED AS ROOT CAUSE. The matrix reproduced the same 25 `elementorFrontendConfig is not defined` failures plus the independent consent failure.  
**Rollback executed:** Popup Builder reactivated immediately and verified active.  
**State:** CLOSED / NOT CAUSAL.  
**PROD:** untouched.

## TRIAL-ELEMENTOR-003 · Code Snippets container isolation

**Environment:** STAGING only  
**Purpose:** rule in/out the complete Code Snippets family in one reversible trial instead of disabling CEREBRO Elementor/Governance snippets one by one.  
**Variable changed:** `code-snippets/code-snippets.php` temporarily deactivated.  
**Pre-change backup:** version `4.0.0`, SHA256 `a56c4cf6694075789c36216859a6c3021377d4dc974b6c270acfc3ee4301f878`.  
**Test:** run `39113766754`, rerun visual job `117640071956`, artifact `12132460940`, HEAD-under-test `6b1e52025e26c2a1561e25241351dc47d47e77cd`.  
**Result:** REJECTED AS ROOT CAUSE. Summary `75 total / 33 passed / 26 failed`; HOME, LOCAL_B2C_CORE, LOCAL_B2C_DUP_CLUSTER, LOCAL_B2B and BLOG still failed in every tested viewport with the same `ReferenceError: elementorFrontendConfig is not defined`. PROFILE, PRODUCT, PROCESS, RESOURCE, CONTACT and LEGAL remained green.  
**Rollback executed:** Code Snippets reactivated immediately after the run and verified active.  
**State:** CLOSED / NOT CAUSAL. Do not repeat per-snippet isolation unless new evidence points back into this container.  
**PROD:** untouched.

## CAUSAL MECHANISM CONFIRMED

On failing non-builder pages, `elementor-frontend-js` is present while `elementor-frontend-js-before` and `window.elementorFrontendConfig` are absent. On passing true Elementor-builder pages, the inline `elementor-frontend-js-before` payload exists before the runtime and defines the config. This is consistent with a third-party/custom layer pulling `elementor-frontend` as a dependency without Elementor's normal frontend initialization lifecycle.

Public Elementor/WordPress support reports the same mechanism for third-party add-ons: an add-on can enqueue a handle that depends on `elementor-frontend` while Elementor itself does not initialize the page, causing exactly `elementorFrontendConfig is not defined`. This external evidence is corroborative only; local STAGING evidence remains canonical.

## CURRENT DIAGNOSTIC

`TRIAL-ELEMENTOR-004 · Fénix CEREBRO Leads isolation` is in progress.  
Backup captured before deactivation: `fenix-cerebro-leads/fenix-cerebro-leads.php` version `1.3.5`, SHA256 `83ca8419a0062d1baf5a81a8bf3cf8a3f0fe197ee5aaed76dcc644893a4faf45`.  
Reason: failing HOME/local pages contain `[fenix_seo001_city_form ...]`, and a site-wide lead/form integration is a plausible dependency owner. This trial will be restored immediately after the result regardless of outcome.

## NEXT DIAGNOSTIC

If Leads is rejected, isolate the remaining custom Fénix SEO/runtime plugins in a small binary-search group, preserving backups and restoring after each trial. Do not patch `elementorFrontendConfig`; identify and remove/condition the incorrect dependency enqueue at its owner.
