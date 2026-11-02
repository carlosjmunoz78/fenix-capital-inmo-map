export const HUMAN_EXCEPTION_CODES = Object.freeze([
  'LEGAL_REQUIRED','SIGNATURE_REQUIRED','LOW_CONFIDENCE','HIGH_RISK',
  'POLICY_CONFLICT','SECURITY_INCIDENT','MONEY_LIMIT','CUSTOMER_HUMAN_REQUEST'
]);

export const ALLOWED_NON_PROD_ENVIRONMENTS = Object.freeze(['LAB','PREPROD','SCAFFOLD','TEST']);

export function assertNonEmptyString(value, label) {
  if (typeof value !== 'string' || !value.trim()) throw new TypeError(`${label} must be a non-empty string`);
  return value.trim();
}

export function assertPlainObject(value, label='value') {
  if (!value || typeof value !== 'object' || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype) {
    throw new TypeError(`${label} must be a plain object`);
  }
  return value;
}

export function assertSafeNumber(value, label) {
  if (typeof value !== 'number' || !Number.isFinite(value)) throw new TypeError(`${label} must be finite`);
  return value;
}

export function assertNonNegativeNumber(value, label) {
  assertSafeNumber(value, label);
  if (value < 0) throw new RangeError(`${label} must be non-negative`);
  return value;
}

export function deepFreeze(value, seen=new WeakSet()) {
  if (!value || typeof value !== 'object' || seen.has(value)) return value;
  seen.add(value);
  for (const key of Reflect.ownKeys(value)) deepFreeze(value[key], seen);
  return Object.freeze(value);
}

export function clone(value) {
  return structuredClone(value);
}

export function assertLabContext(context) {
  assertPlainObject(context, 'context');
  const company_id = assertNonEmptyString(context.company_id, 'context.company_id');
  const environment = assertNonEmptyString(context.environment, 'context.environment').toUpperCase();
  if (!ALLOWED_NON_PROD_ENVIRONMENTS.includes(environment)) throw new Error(`environment ${environment} is outside LAB/PREPROD boundary`);
  const version = assertNonEmptyString(context.version ?? '0.1.0', 'context.version');
  return deepFreeze({ ...clone(context), company_id, environment, version });
}

export function result(engine_id, payload={}) {
  return deepFreeze({ engine_id, ...clone(payload) });
}
