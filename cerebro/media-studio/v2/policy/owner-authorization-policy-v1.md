# CEREBRO UMS Owner Authorization Policy V1

Status: DEFINED_AND_CI_ENFORCED
Company: fenix
Engine: CEREBRO_UMS

## Operating rule

For real-person identity operations, CEREBRO asks the configured owner/supervisor only when no valid decision exists for the subject, material, operation and environment.

- `APPROVED`: continue automatically inside the recorded scope.
- `DENIED`: fail closed without asking again for the same operation.
- `REVOKED`: fail closed for future operations without asking again.
- missing/expired/out-of-scope decision: `HUMAN_REQUIRED` with reason `LEGAL_REQUIRED` only when a new owner decision is actually required.

An owner decision is an operational authorization. It does not rewrite or override third-party dataset, software, model, checkpoint, publicity, privacy or copyright terms. Those are verified independently by deterministic gates.

## Evidence requirements

Each approval must preserve:

- authorization ID;
- company and engine;
- approving authority;
- timestamp;
- subject/material reference;
- modalities;
- actions;
- environments;
- evidence references;
- material hashes when available;
- revocation path.

## Benchmark test media

A real-human dataset carrying an explicit license that permits the intended benchmark use may be admitted with `authorization_basis=LICENSED_DATASET` when CEREBRO also records the owner's approval to run the benchmark under those license terms.

Non-commercial benchmark media may be used only for internal validation. Passing a benchmark with such media does not grant publication or commercial rights to that media and does not relax the commercial-license gate for the production runtime.

## Promotion boundary

Source admission never grants benchmark credit by itself and never promotes UMS to PROD. Only the benchmark tribunal and final UMS PROD readiness tribunal may do so.
