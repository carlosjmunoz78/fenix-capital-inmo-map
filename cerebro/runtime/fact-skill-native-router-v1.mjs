import { FACT_SKILL_NATIVE_ROUTE, runFactSkillNative } from './fact-skill-native-v1.mjs';

export const FACT_SKILL_NATIVE_ROUTER = Object.freeze({
  router_id: 'ROUTE-001:FACT-SKILL-NATIVE:v1',
  capability_id: 'FACT-SKILL-NATIVE',
  owner_engine_id: 'FACT-001',
  environment: 'PREPROD',
  routes: Object.freeze([FACT_SKILL_NATIVE_ROUTE]),
  gateway_only: true,
  prod_authorized: false,
  prod_write_authorized: false,
  additional_cost_eur: 0
});

export function routeFactSkillNative({ route, payload, context } = {}) {
  if (route !== FACT_SKILL_NATIVE_ROUTE) throw new Error('FACT_SKILL_NATIVE_ROUTE_NOT_FOUND');
  if (!context || context.gateway_authorized !== true) throw new Error('GATEWAY_AUTHORIZATION_REQUIRED');
  if (context.environment !== 'PREPROD') throw new Error('PREPROD_ONLY');
  if (context.company_id !== payload?.company_id) throw new Error('CROSS_COMPANY_ROUTE_DENIED');
  if (context.engine_id !== 'FACT-001') throw new Error('FACT001_ROUTE_OWNERSHIP_REQUIRED');
  return runFactSkillNative(payload);
}
