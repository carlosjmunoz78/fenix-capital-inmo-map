# FÉNIX CAPITAL · STAGING V5 · DIAGNOSTIC TRIALS

## TRIAL-ELEMENTOR-001 · CEREBRO Pro-Free isolation

**Environment:** STAGING only  
**Purpose:** isolate repeated `elementorFrontendConfig is not defined` without changing code.  
**Variable changed:** `cerebro-pro-free-v014/cerebro-pro-free-v0.php` temporarily deactivated.  
**Pre-change backup:** plugin version `0.1.4-preprod`, SHA256 `f8207346163f79db572bc54bccf06dad6a42efc112cba9e4f9a487972d0a6ceb`.  
**Reason:** plugin contract explicitly provides Elementor-Pro-free header/footer compatibility; it is therefore a plausible source of unconditional Elementor frontend enqueue.  
**Test:** run the same read-only STAGING V5 responsive/JS acceptance matrix with no other causal change.  
**Rollback:** reactivate the same installed plugin immediately after obtaining the diagnostic result.  
**PROD:** untouched.
