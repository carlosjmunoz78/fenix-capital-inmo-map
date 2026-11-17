/** CEREBRO OS · Fénix LAB dependency policy, v2026-11-13.
 * Owner directive: staging.fenixcapital.es is unavailable until further notice.
 * This is an executable Gateway gate, not a claim of enforcement in legacy runtimes.
 * Never probe the suspended host from here.
 */
export const STAGING_POLICY_VERSION='STAGING_SUSPENSION_2026_11_13';
const safe=Object.freeze(['FACT_REGISTRY_READ','OWNER_REGISTRY_READ','JOB001_METADATA_READ','GITHUB_ACTIVITY_READ','FACT_DRYRUN_AUDITED']);
const stagingOps=Object.freeze(['WP_STAGING_PROBE','WP_STAGING_PUBLISH','WP_STAGING_WRITE','SEO_STAGING_BRIDGE','SEO_PUBLICATION_DEPENDENT_ON_STAGING']);
const frozen=(value)=>Object.freeze(value);
export function getLabDependencyStatusV0({company_id='fenix',environment='LAB'}={}){
 if(company_id!=='fenix'||environment!=='LAB')throw Error('DEPENDENCY_FENIX_LAB_ONLY');
 return frozen({
  status:'OK',source:'OWNER_DIRECTIVE_LAB_POLICY',policy_version:STAGING_POLICY_VERSION,
  company_id:'fenix',environment:'LAB',
  wordpress_staging:frozen({
   dependency_id:'wordpress_staging',host:'staging.fenixcapital.es',
   state:'SUSPENDED_BY_OWNER_UNTIL_FURTHER_NOTICE',
   can_probe:false,can_read:false,can_publish:false,can_modify:false,
   can_auto_resume:false,requires_explicit_owner_reactivation:true,
   current_health:'NOT_CHECKED_PER_OWNER_DIRECTIVE'
  }),
  independent_lab_operations:safe.slice(),
  blocked_operations:stagingOps.slice(),
  supported_execution:false,prod_execution_enabled:false,
  legacy_cron_enforcement:'NOT_VERIFIED_OUTSIDE_UNIVERSAL_GATEWAY',
  note:'GATEWAY_LAB_ONLY_NO_STAGING_NETWORK_ACCESS'
 });
}
export function assessLabOperationV0({company_id='fenix',environment='LAB',operation}={}){
 getLabDependencyStatusV0({company_id,environment});
 if(stagingOps.includes(operation))
  return frozen({status:'BLOCKED_DEPENDENCY',reason:'STAGING_SUSPENDED_BY_OWNER',
   operation,dependency_id:'wordpress_staging',policy_version:STAGING_POLICY_VERSION,
   can_execute:false,can_probe:false,prod_execution_enabled:false});
 if(safe.includes(operation))
  return frozen({status:'LAB_READ_OR_SIMULATION_ONLY',reason:'LAB_POLICY_ALLOWLIST',
   operation,policy_version:STAGING_POLICY_VERSION,
   can_execute:false,can_probe:false,prod_execution_enabled:false});
 return frozen({status:'DENIED_UNKNOWN_OPERATION',reason:'OPERATION_NOT_REGISTERED',
  policy_version:STAGING_POLICY_VERSION,can_execute:false,can_probe:false,prod_execution_enabled:false});
}
export function rejectSuspendedTargetV0(params){
 if(!params||typeof params!=='object'||Array.isArray(params))throw Error('DEPENDENCY_PARAMS_INVALID');
 // Deny ALL user-provided destination fields. There is no dynamic network
 // dispatch in this LAB API, regardless of URL encoding or redirect syntax.
 const destinationFields=['url','target_url','target_host','host','hostname','origin','endpoint',
  'dependency_id','dependency','webhook','webhook_url','destination','route','service_url'];
 if(destinationFields.some(key=>Object.prototype.hasOwnProperty.call(params,key)))
  throw Error('EXTERNAL_DESTINATION_DENIED');
 if(Object.prototype.hasOwnProperty.call(params,'operation')&&
    assessLabOperationV0({operation:params.operation}).status!=='LAB_READ_OR_SIMULATION_ONLY')
  throw Error('STAGING_SUSPENDED_OR_UNKNOWN_OPERATION');
 return true;
}
