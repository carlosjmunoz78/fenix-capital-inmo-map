# CEREBRO OS · SECURITY INCIDENT · Supabase publishable-key guard · 2026-09-16

Status: HUMAN_REQUIRED / FAIL_CLOSED

## Evidence

A PROD Live Deploy triggered from main after secret-reference reconciliation built successfully but GitHub push protection rejected publication of the generated gh-pages snapshot because the frontend bundle was classified as containing a Supabase Secret Key.

The secret value is intentionally not recorded here.

## Safety state

- The rejected push did not update gh-pages.
- The previous live PROD snapshot therefore remains the rollback/live baseline.
- Future deploys must fail before build/publication if the frontend credential is not a public Supabase publishable key.

## Required invariant

`VITE_SUPABASE_PUBLISHABLE_KEY` must match the public client-key class expected by the browser bundle (`sb_publishable_*`). A Supabase secret/service-role key must never be injected into Vite/browser assets.

## Human action

Replace the GitHub Actions repository secret `PROD_SUPABASE_PUBLISHABLE_KEY` with the correct public Supabase publishable key for PROD. Do not paste the value into issues, PRs, chat, logs, or source control.

After replacement, rerun the gated deploy and exact-SHA runtime smoke.
