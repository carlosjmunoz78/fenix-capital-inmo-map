# Platform engineering reference

Systems engineering for a shared PREPROD runtime on Linux/Windows and containers. The design uses a durable worker, bounded global and per-company concurrency, heartbeat, checkpoint/resume, bounded retry and fail-closed execution routing. Every change requires rollback plus rebuild/recovery evidence. No production execution, no Trading access and no paid dependency are authorized.
