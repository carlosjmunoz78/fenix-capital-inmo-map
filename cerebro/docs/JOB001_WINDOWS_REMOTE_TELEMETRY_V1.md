# JOB-001 Windows Remote Telemetry V1

Status: **PREPROD · CODED / PHYSICAL ACTIVATION PENDING LIVE CANARY**

## Purpose

Expose a minimal, sanitized view of the existing Windows CEREBRO Continuous Supervisor so remote coordinators can prove useful JOB-001 occupancy and request governed refill without inferring internal lanes from GitHub Actions or UI processes.

This capability **does not create** another queue, scheduler, daemon or worker runtime.

## Existing components reused

- `DurableJobRuntimeV1` and its existing `jobs.v8journal`.
- `CEREBRO Continuous Supervisor` and `heartbeat.json`.
- `AdaptiveHierarchicalAgentWorkPumpV3` for refill through the already existing JOB-001 control plane.
- Existing CEREBRO Device Gateway / Browser Transport for the physical PC↔cloud hop when the fixed capability is activated.

## Canonical Windows state

Default state directory:

`%USERPROFILE%\AppData\Local\CEREBRO\SupervisorRuntime`

Required files for status:

- `heartbeat.json`
- `jobs.v8journal`

The status reader is fail-closed when the heartbeat is missing, stale, non-PREPROD, cross-company or Trading-enabled.

## Exposed fields

`CEREBRO_JOB001_HOST_STATUS_V1` exposes only:

- status, company, engine, environment, version, timestamp and heartbeat age;
- useful queued/running/total, target 48, target headroom and starvation;
- canonical `BOOST-001` lane counts: runnable/running/useful/blocked/done;
- DeepSeek provider maximum from the dynamic concurrency policy;
- global/company/repo-write limits and policy decision;
- explicit governance flags.

It does **not** expose:

- job payloads;
- prompts;
- raw job records;
- raw journal bytes;
- API keys, tokens, cookies, credentials or auth state;
- arbitrary nested heartbeat fields.

Repo-write instantaneous occupancy is intentionally reported as `running: null` until a physical counter exists; only the policy maximum is exposed. This prevents a false `1/1` claim.

## DeepSeek physical count

The supervisor defines the canonical MODEL context as:

`fenix | BOOST-001 | PREPROD | work-pump-v3-adaptive`

and enforces its scheduling route as `pool=MODEL`, `provider_id=deepseek` whenever the DeepSeek Work Pump is enabled. Therefore the `model_lane.running` count is a physical count of current DeepSeek JOB-001 work for that canonical context, not a GitHub Actions proxy.

## Limits preserved

- useful target: 48
- global max: 64
- company max: 48
- DeepSeek max: 8
- repo-write max: 1
- additional cost target: 0 EUR
- PROD authority: false
- Trading access: false

## Physical transport evidence before activation

On 2026-10-28 the enrolled Fénix Windows Browser Transport `1.4.1` was observed paired and online with kill switch enabled and cloud transport ONLINE. A live `ACCESSBOOT_CAPABILITY_SNAPSHOT` command completed through the existing Device Gateway, proving current cloud→PC→cloud roundtrip.

The existing Fénix Browser Transport deliberately ignores unsupported actions and does not support the legacy AION FILE `LIST/READ/WRITE` capability. Therefore this V1 must be activated as a **fixed, allowlisted `JOB001_SUPERVISOR_STATUS` capability**; generic remote shell/file execution is forbidden.

## Activation gate

Do not overwrite the currently working LAB device identity or reuse the revoked/cross-company AION updater.

Physical activation requires all of the following:

1. backup/snapshot of the current Browser Transport and its credential/config files;
2. fixed allowlisted `JOB001_SUPERVISOR_STATUS` handler only;
3. source state must remain PREPROD and company-bound to `fenix`;
4. handler executes the canonical Node status reader, never an arbitrary command supplied by the remote payload;
5. unsupported actions must terminate safely instead of looping leases;
6. local supervisor continues when cloud transport is unavailable;
7. live canary returns a sanitized host status with no secrets;
8. OLD vs NEW comparison confirms all existing Browser Bridge actions still behave identically;
9. rollback to the exact prior transport is physically tested.

Until the live canary passes, status remains **CODED / PHYSICAL ACTIVATION PENDING**, not operational.

## Rollback

The change is additive. Rollback removes the fixed `JOB001_SUPERVISOR_STATUS` dispatch path and restores the snapshotted Browser Transport files/config. The existing supervisor, durable ledger and Work Pump are not replaced or migrated.
