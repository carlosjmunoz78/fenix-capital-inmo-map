// Transport-neutral MCP JSON-RPC bridge. This is NOT a network listener, OAuth provider, or hosted MCP endpoint.
// The eventual HTTPS router MUST authenticate and enforce request size/rate limits before forwarding here.
const PROTOCOL_VERSION = '2025-06-18';
const err = (id, code, message) => ({ jsonrpc: '2.0', id, error: { code, message } });
const reply = (id, result) => ({ jsonrpc: '2.0', id, result });
const isPlain = v => !!v && typeof v === 'object' && !Array.isArray(v) && Object.getPrototypeOf(v) === Object.prototype;

export function createMcpBridge({ chatgptAdapter, authenticate }) {
  if (typeof chatgptAdapter?.listTools !== 'function' || typeof chatgptAdapter?.callTool !== 'function') throw new Error('chatgpt adapter required');
  if (typeof authenticate !== 'function') throw new Error('OAuth resource-server verification required');

  return {
    async dispatch(request, authContext) {
      if (!isPlain(request) || request.jsonrpc !== '2.0' || typeof request.method !== 'string') return err(request?.id ?? null, -32600, 'Invalid MCP request');
      if (request.method === 'notifications/initialized' && request.id === undefined) return null;
      if (!('id' in request)) return null;
      // Never accept identity asserted by the model / tools/call parameters.
      const verified = await authenticate(authContext);
      if (!isPlain(verified) || verified.client_id !== 'chatgpt' || !verified.actor_id || !verified.identity_ref) return err(request.id, -32001, 'Authenticated ChatGPT principal required');
      switch (request.method) {
        case 'initialize':
          return reply(request.id, {
            protocolVersion: PROTOCOL_VERSION,
            capabilities: { tools: { listChanged: false } },
            serverInfo: { name: 'cerebro-cloudflare-dual-lab', version: '0.1.0' }
          });
        case 'ping': return reply(request.id, {});
        case 'tools/list':
          return reply(request.id, { tools: chatgptAdapter.listTools() });
        case 'tools/call': {
          const args = request.params;
          if (!isPlain(args) || typeof args.name !== 'string' || !isPlain(args.arguments ?? {})) return err(request.id, -32602, 'Invalid tool arguments');
          // authenticate() in adapter is independent and MUST verify the same authContext.
          const output = await chatgptAdapter.callTool({ name: args.name, arguments: args.arguments ?? {} }, authContext);
          return reply(request.id, {
            content: [{ type: 'text', text: JSON.stringify(output) }],
            isError: !['COMPLETED', 'ALREADY_EXISTS_VERIFIED'].includes(output?.status)
          });
        }
        default: return err(request.id, -32601, 'Method not found');
      }
    }
  };
}
