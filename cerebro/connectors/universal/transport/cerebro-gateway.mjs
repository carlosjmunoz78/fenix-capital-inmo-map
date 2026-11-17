// Intended to be bound behind an EXISTING authenticated CEREBRO Gateway command route.
// The existing CEREBRO runtime is not modified by importing this adapter.
export function createCerebroGatewayBridge({ cerebroAdapter, authenticatedGateway }) {
  if (typeof cerebroAdapter?.execute !== 'function') throw new Error('cerebro adapter required');
  if (typeof authenticatedGateway !== 'function') throw new Error('trusted gateway assertion verifier required');
  return {
    async dispatch(command, transportContext) {
      if (!command || typeof command !== 'object' || Array.isArray(command)) throw new TypeError('command required');
      const assertion = await authenticatedGateway(transportContext);
      if (assertion?.client_id !== 'cerebro' || !assertion?.actor_id || !assertion?.identity_ref) {
        return { status: 'HUMAN_REQUIRED', reason: 'POLICY_CONFLICT', detail: 'CEREBRO Gateway auth missing', executed: false };
      }
      return cerebroAdapter.execute(command, transportContext);
    }
  };
}
