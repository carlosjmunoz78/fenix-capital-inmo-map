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

## NEXT DIAGNOSTIC

`elementorFrontendConfig` is absent/late on a subset of page classes while Elementor `frontend.min.js` still loads. The next iteration must identify the enqueue/localization owner or lifecycle mismatch directly; do not disable another plugin speculatively. Compare failing pages against passing Elementor pages and inspect script/config order before changing a causal variable.
