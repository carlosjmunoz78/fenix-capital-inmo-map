# CRONOS broker read port LAB V1

The JOB-001 evidence intake can use the existing CRONOS.EVIDENCE.READ broker through a host-owned machine transport. The port allows the fixed historical LIVE005 source and GET path, passes cancellation, rejects redirects and non-200 responses, and uses the existing size-limited Cloudflare response normalizer. The intake continues to verify the pinned historical receipt hashes. The transport contract owns authentication and signing. No account-wide token is required by this port or passed to a job.

Baseline 3111f6c686b2240fd4f13f3c99bc3df2cfcd6140. Verification: four new tests and ten regressions pass. A local replay of the response read over the official Cloudflare API verified all three historical receipts through the new port. The replay did not traverse Windows, Access, or the broker. No new inference was run.

The candidate has no host transport registration. Before activation, obtain a governed physical Office acceptance run with the existing dedicated identity and verify positive and negative responses. Stage the existing JOB-001 intake in a parallel supervisor with an isolated journal, then test ownership, compatibility and rollback. Preserve the historical classification of LAB evidence. Rollback of this candidate is selecting the baseline; no service activation or data migration is included.
