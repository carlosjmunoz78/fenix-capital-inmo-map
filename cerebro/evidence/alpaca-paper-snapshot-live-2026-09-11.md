# Alpaca Paper Snapshot — Live Read-Only Evidence

Date: 2026-09-11
Environment: LAB/PREPROD
Mode: ALPACA_PAPER_SNAPSHOT

## Result
- status: GREEN
- paper_only: true
- read_only: true
- live_endpoint_blocked: true
- order_mutation_forbidden: true
- resources: account, positions, clock, orders

## Sanitized account evidence
- account_status: ACTIVE
- currency: USD
- cash: 99999.97
- equity: 99999.97
- buying_power: 399999.88
- trading_blocked: false
- account_blocked: false

## Snapshot observations
- positions: empty at capture time
- market clock: closed at capture time
- historical Paper orders present
- no secret payloads recorded
- no account number recorded
- no write/order mutation performed by this snapshot

## Boundaries
This evidence validates authenticated read-only access to Alpaca Paper only. It does not authorize or prove Live trading, autonomous Paper order execution, continuous scheduling, or PROD operation.

Captured-at evidence supplied from the isolated Cloud Shell runtime: 2026-09-11T11:01:51.307Z.
