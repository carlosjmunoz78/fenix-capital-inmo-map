function requiredFunction(value, name) { if (typeof value !== 'function') throw new Error(`${name}_FUNCTION_REQUIRED`); return value; }

/**
 * Thin governed facade over the already-existing durable dispatcher/queue.
 * It deliberately does not create a second queue implementation.
 */
export function createMediaProductionQueue({ dispatch } = {}) {
  const call = requiredFunction(dispatch, 'DISPATCH');
  return Object.freeze({
    enqueue(order) { return call('enqueue', order); },
    lease() { return call('lease', {}); },
    complete(payload) { return call('complete', payload); },
    artifactTicket(payload) { return call('artifact-ticket', payload); },
  });
}

export const MEDIA_PRODUCTION_QUEUE_CONTRACT_V1 = Object.freeze({
  schema_version: '1.0.0',
  engine_id: 'UMS-001',
  environment: 'PREPROD',
  strategy: 'WRAP_EXISTING_DURABLE_DISPATCHER',
  second_queue_forbidden: true,
  heavy_render_inside_supabase_forbidden: true,
});
