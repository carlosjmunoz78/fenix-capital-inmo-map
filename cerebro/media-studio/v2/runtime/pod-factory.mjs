import crypto from 'node:crypto';
import { loadSourceRegistry } from '../registry/role-registry.mjs';
import { REVIEW_ROUTING, GLOBAL_GUARDIANS, requiredGuardiansForJob } from './topology.mjs';

const POD_DEPARTMENTS={
  PRODUCTION:['D01','D02','D04','D46','D47'],
  SEQUENCE:['D06','D07','D21','D22','D23','D33','D35'],
  SHOT:['D21','D22','D28','D33','D34','D38'],
  CHARACTER:['D07','D09','D10','D12','D26','D27'],
  IDENTITY:['D04','D09','D10','D11','D12','D46'],
  VOICE:['D04','D11','D33','D37'],
  MUSIC:['D04','D35','D36','D37'],
  ASSET:['D18','D19','D26','D31','D46'],
  VFX:['D22','D28','D31','D38'],
  XR_SPATIAL:['D16','D29','D41','D42','D45'],
  LIVE:['D13','D33','D37','D43'],
  DEVICE_OUTPUT:['D40','D41','D42','D45','D47'],
  VERSION_REVIEW:['D23','D38','D40','D46']
};

export function createPod({pod_type,company_id,production_id,environment='PROD',objective,capabilities=[],clone_job=null,department_ids=null}){
  if(!POD_DEPARTMENTS[pod_type]) throw new Error(`UNKNOWN_POD_TYPE:${pod_type}`);
  if(!company_id||!production_id||!objective) throw new Error('company_id, production_id and objective are required');
  const registry=loadSourceRegistry();
  const requested=department_ids||POD_DEPARTMENTS[pod_type];
  const departments=registry.departments.filter(d=>requested.includes(d.id));
  if(departments.length!==requested.length) throw new Error('POD_DEPARTMENT_MISSING');
  const roles=[registry.studio_brain.id];
  const supervisors=new Set(), tribunals=new Set();
  for(const dept of departments){
    roles.push(dept.id,...(dept.specialists||[]).map(s=>s.id));
    const routing=REVIEW_ROUTING[dept.id];
    for(const s of routing?.supervisors||[]) supervisors.add(s);
    for(const t of routing?.tribunals||[]) tribunals.add(t);
  }
  const guardians=new Set(clone_job?requiredGuardiansForJob(clone_job):GLOBAL_GUARDIANS);
  return {
    pod_id:`POD-${crypto.randomUUID()}`,pod_type,company_id,production_id,environment,objective,
    roles:[...new Set(roles)],capabilities:[...new Set(capabilities)],inputs:[],outputs:[],
    review:{supervisors:[...supervisors],tribunals:[...tribunals],guardians:[...guardians]},
    lifecycle:{ephemeral:true,destroy_when_complete:true,retain_audit:true}
  };
}

export function defaultDepartmentsForPod(pod_type){return [...(POD_DEPARTMENTS[pod_type]||[])];}
