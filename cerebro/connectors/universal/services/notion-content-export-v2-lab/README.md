# FACT-001 · Second 25 mixed Notion content export, LAB v2 candidate

**Input:** real encrypted 25→50 batch plan, GitHub artifact `13812694087` (ZIP SHA256 `bdc1fc75b32608d48d92f6bf44e9648c392b8a386c8ffdc1f1858e26cb918a22`, JSON SHA256 `1a83d12baa5f9d8dc340706e3ba555f7d4df3eff29b4f303cf30632fd3877c71`). 24 pages, 1 data source, from unchanged complete index of 6632 searchable objects.

- Independently deployed, not replacing the original broker v33, original page exporter v1, or existing planner. A GitHub OIDC signed one-off owner operation pins the branch, workflow, account, index SHA and batch_ref.
- Each page GET retrieves a recursive cursor-paginated block tree and compares last_edited_time before/after. Each data source GET retrieves its schema; POST query returns row property pages, followed by recursive block trees for all rows. Property overflows or incomplete pagination stop the run; no partial item is declared sealed. Max 125 API calls and 3.2 MB plaintext per item, source not mutated.
- AES-256-GCM per item with random IV and AAD, verified independently in-memory by the service. The GitHub runner sees only ciphertext, counts, hashes, fixed indices. Zero Notion writes, no cron/queue and no D1 checkpoint advancement. Partial results are saved with a red fail-closed proof for future reconciliation.
- **Exclusions:** downloadable binary attachments, external signed URLs, comments, permissions, deleted versions and independent key escrow. Those gates remain pending, as does physical Notion LAB restoration and D1 CAS deployment.

**Status:** defined and local CI tested, not active until actual test/deployment/push. When the batch completes and its external Drive readback SHA is verified, record Git checkpoint 25→50; do not mark D1 CAS committed.

**Rollback:** no previously deployed services changed; stop only the new LAB function, leave ZIP and proof immutable. Cost: no new subscription; metered usage must be checked separately.