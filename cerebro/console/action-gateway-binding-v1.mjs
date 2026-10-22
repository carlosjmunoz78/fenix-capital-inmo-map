function requiredFunction(value, label) {
  if (typeof value !== 'function') throw new TypeError(`${label} must be a function`);
  return value;
}

export function bindConsoleToActionGatewayV1({ consoleGateway, actionGateway, command = 'action.execute' }) {
  if (!consoleGateway || typeof consoleGateway !== 'object') throw new TypeError('consoleGateway required');
  if (!actionGateway || typeof actionGateway !== 'object') throw new TypeError('actionGateway required');
  requiredFunction(consoleGateway.registerCommand?.bind(consoleGateway), 'consoleGateway.registerCommand');
  requiredFunction(actionGateway.execute?.bind(actionGateway), 'actionGateway.execute');

  consoleGateway.registerCommand(command, async ({ context, payload }) => {
    const gatewayContext = {
      company_id: context.company_id,
      engine_id: 'ACTGW-001',
      environment: context.environment,
      version: context.version
    };
    return actionGateway.execute({ ...payload, context: gatewayContext });
  });

  return Object.freeze({
    status: 'BOUND',
    command,
    console_environment: consoleGateway.environment,
    action_gateway_environment: actionGateway.contract().environment
  });
}
