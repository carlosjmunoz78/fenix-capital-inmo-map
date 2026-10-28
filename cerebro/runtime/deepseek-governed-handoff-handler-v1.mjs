import { decorateDeepSeekWorkPumpPayloadForHandoffV1 } from './governed-execution-handoff-router-v1.mjs';

export function createDeepSeekGovernedHandoffHandlerV1({ base_handler, handoff_router } = {}) {
  if (typeof base_handler !== 'function') throw new TypeError('base_handler required');
  if (!handoff_router || typeof handoff_router.handleOutcome !== 'function' || !Array.isArray(handoff_router.allowed_job_names)) {
    throw new TypeError('handoff_router required');
  }

  let handled = 0;
  let enqueued = 0;
  let duplicates = 0;
  let rejected = 0;
  let noHandoff = 0;

  const handler = async args => {
    const payload = decorateDeepSeekWorkPumpPayloadForHandoffV1(args?.payload, {
      allowed_job_names: handoff_router.allowed_job_names,
    });
    const result = await base_handler({ ...args, payload });
    let handoff = Object.freeze({ status: 'NO_HANDOFF', reason: 'RESULT_NOT_EXECUTABLE' });
    if (result?.status !== 'HUMAN_REQUIRED') {
      handoff = handoff_router.handleOutcome({
        outcome: {
          status: 'SUCCEEDED',
          job: {
            ...args.job,
            payload,
            result,
          },
        },
      });
      handled += 1;
      if (handoff.status === 'ENQUEUED') enqueued += 1;
      else if (handoff.status === 'DUPLICATE') duplicates += 1;
      else if (handoff.status === 'REJECTED') rejected += 1;
      else noHandoff += 1;
    }
    return {
      ...result,
      governed_execution_handoff: handoff,
    };
  };

  handler.snapshot = () => {
    const base = typeof base_handler.snapshot === 'function' ? base_handler.snapshot() : {};
    const router = typeof handoff_router.snapshot === 'function' ? handoff_router.snapshot() : null;
    return Object.freeze({
      ...base,
      governed_handoff_wrapper: 'V1',
      governed_execution_handoff_router: router,
      handoff_handled: handled,
      handoff_enqueued: enqueued,
      handoff_duplicates: duplicates,
      handoff_rejected: rejected,
      handoff_no_handoff: noHandoff,
      prod_authorized: false,
      prod_writes: false,
      trading_access: false,
    });
  };

  return handler;
}

export const DEEPSEEK_GOVERNED_HANDOFF_HANDLER_V1_CONTRACT = Object.freeze({
  capability: 'BOOST-001/JOB-001/deepseek-governed-handoff-handler-v1',
  environment: 'PREPROD',
  wraps_existing_deepseek_handler: true,
  preserves_base_telemetry_shape: true,
  same_durable_queue: true,
  second_daemon: false,
  target_allowlist_required: true,
  free_form_handoff_executes: false,
  prod_authorized: false,
  prod_writes: false,
  trading_access: false,
});