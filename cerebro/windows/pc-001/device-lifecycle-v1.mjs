// CEREBRO PC-001: pure, fail-closed device identity and sleep/wake policy.
// Neither calls Windows power APIs nor sends Wake-on-LAN packets.
// The central CEREBRO control plane is NEVER paused by these actions.
export const PC_ACTIONS = Object.freeze(['RENAME_PC', 'SUSPEND_PC', 'WAKE_PC', 'STATUS_PC']);
export const CHANNEL = 'PC-001';

export class PcActionError extends Error {
  constructor(code) { super(code); this.name = 'PcActionError'; this.code = code; }
}
function checkId(value, code='DEVICE_ID_MISSING') {
  if (typeof value !== 'string' || value.length < 6 || value.length > 160 || !/^[a-zA-Z0-9._:-]+$/.test(value)) throw new PcActionError(code);
  return value;
}
function checkName(value) {
  if (typeof value !== 'string') throw new PcActionError('INVALID_DISPLAY_NAME');
  const name = value.normalize('NFC').trim().replace(/\s+/gu, ' ');
  if (!name || name.length > 64 || /[\u0000-\u001f\u007f\u202a-\u202e\u2066-\u2069]/u.test(name)) throw new PcActionError('INVALID_DISPLAY_NAME');
  return name;
}
export function assignInitialPcName({canonical_device_id, windows_hostname}) {
  const deviceId = checkId(canonical_device_id);
  // Label is NOT an authorization, hostname, device id or Windows computer name.
  let label;
  try { label = checkName(`PC · ${windows_hostname}`); }
  catch { label = checkName(`PC CEREBRO ${deviceId.slice(-6)}`); }
  return Object.freeze({channel_id: CHANNEL, canonical_device_id:deviceId, display_name:label,
    display_name_revision:1, name_origin:'AUTO_LOCAL_HOSTNAME', cloud_enrollment:'REQUIRES_SCOPED_AUTH',
    device_id_immutable:true});
}
export function renamePc({device, proposed_name, expected_revision, principal}) {
  if (!device || device.channel_id !== CHANNEL) throw new PcActionError('NOT_A_PC');
  checkId(device.canonical_device_id);
  if (!principal?.authenticated || !principal?.authorized_device_ids?.includes(device.canonical_device_id))
    throw new PcActionError('DEVICE_OWNER_AUTH_REQUIRED');
  if (!Number.isSafeInteger(expected_revision) || expected_revision !== device.display_name_revision)
    throw new PcActionError('NAME_REVISION_CONFLICT');
  const newName = checkName(proposed_name);
  if (newName === device.display_name) return Object.freeze({device:Object.freeze({...device}), changed:false, audit_event:null});
  return Object.freeze({
    device:Object.freeze({...device, display_name:newName, display_name_revision:expected_revision+1}),
    changed:true,
    audit_event:Object.freeze({event:'PC_DISPLAY_NAME_CHANGED', device_id:device.canonical_device_id,
      previous_revision:expected_revision, next_revision:expected_revision+1,
      // Do not expose IDs, names, or secrets in remote telemetry by default.
      identity_preserved:true})
  });
}
const HOLD = code => Object.freeze({decision:'HOLD', reason:code, channel_id:CHANNEL, control_plane_paused:false});

export function evaluatePcPowerAction({action, target, principal, relay, command={}}) {
  if (!PC_ACTIONS.includes(action)) return HOLD('UNSUPPORTED_ACTION');
  if (action === 'RENAME_PC') return HOLD('USE_RENAME_CONTRACT');
  if (!target || target.channel_id !== CHANNEL) return HOLD('TARGET_NOT_PC');
  try { checkId(target.canonical_device_id); } catch { return HOLD('INVALID_DEVICE_ID'); }
  if (!principal?.authenticated || !principal?.authorized_device_ids?.includes(target.canonical_device_id)) return HOLD('DEVICE_OWNER_AUTH_REQUIRED');
  if (command.environment !== 'PREPROD' || command.prod_authorized === true || command.trading_access === true)
    return HOLD('ENVIRONMENT_DENIED');
  if (command.expires_at && Date.parse(command.expires_at) < Date.now()) return HOLD('EXPIRED_COMMAND');
  if (!command.idempotency_key || !command.request_id || !command.policy_id) return HOLD('COMMAND_SCOPE_MISSING');
  if (action === 'STATUS_PC') return Object.freeze({decision:'AUTHORIZED_PREPROD', route:'GATEWAY_STATUS', control_plane_paused:false});
  if (action === 'SUSPEND_PC') {
    if (target.power_state !== 'AWAKE' || !target.local_agent_healthy) return HOLD('PC_NOT_AWAKE');
    if (!target.wake_verified || !relay?.online || !relay?.authorized_for?.includes(target.canonical_device_id))
      return HOLD('NO_VERIFIED_WAKE_PATH');
    if (target.in_critical_operation || command.explicit_owner_intent !== true) return HOLD('SUSPEND_SAFETY_GATE');
    return Object.freeze({decision:'AUTHORIZED_PREPROD', route:'LOCAL_WINDOWS_POWER_API',
      target_power_state:'SLEEPING', resume_agent_on_wake:true, control_plane_paused:false,
      // Actual OS API call must retain wake events; perform readback before sleep.
      disable_wake_events:false});
  }
  if (action === 'WAKE_PC') {
    if (target.power_state === 'AWAKE') return Object.freeze({decision:'ALREADY_AWAKE', route:'NONE', control_plane_paused:false});
    if (target.power_state !== 'SLEEPING') return HOLD('SLEEP_STATE_NOT_CONFIRMED');
    if (!target.wake_verified || !target.wake_mechanism) return HOLD('WAKE_CAPABILITY_NOT_VERIFIED');
    if (!relay?.online || !relay?.authorized_for?.includes(target.canonical_device_id)) return HOLD('WAKE_RELAY_UNAVAILABLE');
    if (!['WOL_MAGIC_PACKET', 'OEM_POWER_CONTROLLER'].includes(target.wake_mechanism)) return HOLD('WAKE_MECHANISM_UNSUPPORTED');
    return Object.freeze({decision:'AUTHORIZED_PREPROD', route:'ALWAYS_ON_AUTHORIZED_RELAY',
      wake_mechanism:target.wake_mechanism, wait_for_authenticated_heartbeat:true,
      control_plane_paused:false});
  }
  return HOLD('UNSUPPORTED_ACTION');
}