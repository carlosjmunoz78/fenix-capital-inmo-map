# FACT-001 V1 · Non-breaking Engine Registry Extension Requests

This directory is the git-backed ingress for the versioned FACT-001 path that extends the immutable 177-engine V0 baseline without rewriting it.

V1 accepts only engines already present in `registry/engine-registry.v1.json`. The first 177 engine IDs must remain byte-order equivalent to the V0 seed list; V1 currently permits exactly two additions: `HCI-001` and `MOTION-001`.

Every request remains structural only: `environment=SCAFFOLD`, additional cost `0`, no PROD authorization, no PROD writes, no Trading access and no external code execution.

The V1 factory wraps the proven V0 factory for all 177 existing engines and creates only the two extension scaffolds in parallel. Existing V0 factory files and behavior are not replaced.

A green scaffold is not an autonomous engine. Behavioral implementation, independent evaluation, tribunal, PREPROD, backup/rollback proof and later promotion remain separate gates.
