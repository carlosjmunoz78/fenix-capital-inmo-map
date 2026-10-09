# CEREBRO · ROUTE001_REPEATABLE_AUTONOMOUS_PREPROD_CYCLES_V0

Date: 2026-10-09
Company: `fenix`
Engine: `ROUTE-001`
Environment: `PREPROD`
Incremental cost target: `0 EUR`

## Objective

Prove that the already-merged real-resource ROUTE-001 loop is not a one-off success. The gate requires both:

1. a bounded same-run resilience rehearsal that demonstrates primary execution, real fallback execution, restoration and quiet HOLD on total deterministic-resource loss; and
2. a persistent streak of distinct live workflow runs so repeated autonomy evidence cannot be manufactured by replaying one run ID.

## Preserve-first correction

The first safe loop executed its fixture in Node after ROUTE-001 selected a `DETERMINISTIC_LOCAL` resource. That was correct while `gha-node-runtime` was selected, but it was not sufficient proof that a future `gha-python-runtime` fallback would execute on Python.

This gate closes that ambiguity before certifying fallback.

The safe executor now binds execution to the selected resource ID:

- `gha-node-runtime` -> fixed in-process Node fixture;
- `gha-python-runtime` -> fixed Python subprocess invoked with `spawnSync`, argument array, `shell=false`, five-second timeout and no user-controlled script.

No arbitrary command, shell, path, customer payload or secret reaches the subprocess.

## Bounded resilience rehearsal

Each certified live cycle executes four bounded scenarios over current discovery evidence:

1. **PRIMARY_CURRENT_EVIDENCE** — current Node and Python evidence remains intact; Node must be selected and execute.
2. **CONTROLLED_PRIMARY_RESOURCE_LOSS** — only the Node candidate is marked unavailable in an in-memory rehearsal overlay; Python must be selected and the fixed Python fixture must really execute.
3. **CONTROLLED_PRIMARY_RESTORE** — original discovery is restored; Node must again be selected and execute.
4. **CONTROLLED_ALL_DETERMINISTIC_RESOURCE_LOSS** — Node and Python are marked unavailable; the result must be `HOLD_NO_SAFE_ROUTE`, with zero fixture execution and zero HUMAN_REQUIRED noise.

The rehearsal does not rewrite live availability observations. It is a deterministic failure-injection overlay used only for resilience evidence.

## Human-by-exception boundary

Recoverable or expected resource loss is not a human exception.

The controlled fallback and total deterministic-loss cases must not emit `LOW_CONFIDENCE`, `HIGH_RISK`, `MONEY_LIMIT` or any other HUMAN_REQUIRED reason. The full-loss case is a quiet HOLD because no legal, signature, policy, security, money or explicit-human condition exists.

## Persistent live streak

The physical ROUTE resource state tracks:

- `consecutive_live_green_cycles`;
- the recent distinct live GitHub run IDs;
- fallback rehearsal status;
- restore status;
- full-loss HOLD status;
- no-human-noise status;
- target `3` distinct live GREEN cycles.

A source run ID already present in the streak cannot be counted twice.

The live streak advances only if both the ordinary current-evidence loop and the bounded repeatability rehearsal are GREEN.

The first accepted live cycle already exists from run `37896315736` at main SHA `7c34dfb5e1e2827053e4534861c2b569214e1961`. Subsequent distinct live runs may increment the same physical state. This document does not pre-claim the target before the state physically reaches it.

## RSI/LRN feedback

The ordinary live loop continues to emit its three canonical events:

- `ENGINE_RESULT`
- `METRIC_OBSERVATION`
- `COST_OBSERVATION`

The resilience rehearsal adds one summarized `ENGINE_RESULT` event containing only bounded synthetic evidence about primary/fallback/restore/HOLD behavior.

All four signals are sent through the existing `cerebro_learning_signal` repository-dispatch ingress. No parallel learning channel is introduced.

## Safety envelope

- business execution: FALSE
- customer data: FALSE
- secret values: FALSE
- arbitrary shell execution: FALSE
- external AI call: FALSE for this gate
- browser call: FALSE for this gate
- automatic paid fallback: FALSE
- PROD authority: FALSE
- PROD write: FALSE
- general execution authority: FALSE
- Trading: FALSE
- MULTIEMPRESA continuation: FALSE
- incremental cost: 0 EUR

## Acceptance

The implementation portion is GREEN only when:

1. exact-head tests prove Node execution and actual Python fallback execution;
2. Python execution uses the fixed no-shell subprocess path;
3. the four-scenario rehearsal is GREEN;
4. full deterministic-resource loss produces quiet `HOLD_NO_SAFE_ROUTE`;
5. the rehearsal summary passes the existing universal-learning ingress contract;
6. duplicate source run IDs cannot advance the persistent streak;
7. state advances only after live loop + rehearsal are both GREEN;
8. post-merge live ROUTE workflow succeeds;
9. universal RSI ingress receives the four-signal batch;
10. PROD Runtime Smoke remains GREEN;
11. PROD Live Deploy is not activated by this block.

The **repeatability target** becomes HECHO only when the persisted state reaches at least `3` distinct consecutive live GREEN run IDs. Until then that sub-condition is PARCIAL even if the same-run fallback rehearsal is fully GREEN.

## Next gate after the target is physically reached

`FIRST_REAL_LOW_RISK_ENGINE_DOMAIN_TEMPLATE_V0`

That gate must select one existing low-risk domain from live inventory, wrap it with this pattern, and prove human-by-exception operation without granting global PROD authority.
