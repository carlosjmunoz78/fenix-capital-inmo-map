// PC-001 recovery launch policy. Design-time only; NOT deployed on any Windows PC.
// Never infer that a known SHA or --agent makes an old installer safe.
export function decidePcRecoveryStart(input = {}) {
  const { key = '', binaryName = '', port = 0, verifiedHash = false,
    backedUp = false, processInventoryHealthy = false, processAlreadyExists = false,
    universalLauncherAudited = false, sourceVersionContractVerified = false,
    prodAuthorized = false } = input;
  if (prodAuthorized) return { allowed: false, reason: 'PROD_DENIED' };
  if (key === 'CEREBRODeviceAgent' ||
      binaryName.toLowerCase() === 'cerebro-device-agent.exe')
    return { allowed: false, reason: 'LEGACY_INSTALLER_PATH_QUARANTINED_WINERROR32' };
  if (port !== 8766) return { allowed: false, reason: 'PORT_OUT_OF_SCOPE' };
  if (!verifiedHash || !backedUp || !processInventoryHealthy)
    return { allowed: false, reason: 'PREFLIGHT_INCOMPLETE' };
  if (processAlreadyExists) return { allowed: false, reason: 'PROCESS_PRESENT_NO_DUPLICATE' };
  if (!universalLauncherAudited || !sourceVersionContractVerified)
    return { allowed: false, reason: 'UNIVERSAL_LAUNCHER_NOT_AUDITED' };
  return { allowed: false, reason: 'PHYSICAL_ACCEPTANCE_REQUIRED' };
}
