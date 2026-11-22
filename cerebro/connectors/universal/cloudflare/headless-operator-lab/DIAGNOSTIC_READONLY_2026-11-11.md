# FACT001 Cloudflare temporary read-only token diagnostic (2026-11-11)

Reason: a real independent scheduled LAB job ran once but marked `RECONCILE / UNEXPECTED_OPERATOR_ERROR` (no disposable Worker left). No blind retry.

We will deploy this diagnostic as a **parallel Worker VERSION** in the same already-isolated LAB script, inheriting the original `CF_WORKERS_TOKEN` and `RECOVERY_DB` bindings with Cloudflare strict inheritance. Versioned baseline and physical rollback required. It only performs one Cloudflare GET /workers/scripts from inside the Worker and records **HTTP status code only** to a new isolated D1 table, with no credential value ever logged or returned.

The existing original Worker job stays RECONCILE (attempts=1) and cannot be replayed. The one-time probe table has its own id and attempt count.

Pre-DDL recovery bookmark: `0000014f-00000008-00005120-f680c187ff225758cb284a8748134e65` (entire shared D1 must NOT be restored). After probe, restore original Worker version, confirm both bindings, no external resource changes.

Never turn on PROD, make Worker public, or widen token permissions. If GET is 401/403, ask user to replace the misconfigured/invalid token directly in Cloudflare, not in chat.
