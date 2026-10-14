# CEREBRO OS · Cloudflare main isolation probe

Purpose: harmless documentation-only verification that a normal `main` commit no longer acts as a Cloudflare production branch after production branch controls were moved to `deploy/cloudflare-prod`.

This file has no runtime, application, customer-data, Trading, payment, domain, route, secret, binding, or deployment logic.

Expected result: GitHub/CEREBRO CI may run; Cloudflare may create non-production preview/build activity according to its preview policy, but no active production deployment/version may be created from this `main` commit.
