import {createGovernedInternalWrapper} from './governed-wrapper-factory-v1.mjs';

const PIN='6edcf94159d9f46b0759d2e1b59dd545cfaca254';
const CANDIDATE='repo:9a0225a6e15ebccefb2b18c38eaf';

function baseline(){return [
  'Prefer reproducible infrastructure-as-code over console-only configuration',
  'Use least-privilege instance roles instead of long-lived credentials on hosts',
  'Keep public exposure minimal and explicit',
  'Encrypt storage and define backup/restore evidence',
  'Collect health logs metrics and cost signals before optimization',
  'Define patching replacement rollback and recovery procedures'
];}

const tasks={
  INSTANCE_ARCHITECTURE_PLAN:({goal,request,cleanText})=>({
    summary:`EC2 architecture plan${goal?` for: ${goal}`:''}`,
    workload_profile:cleanText(request?.options?.workload_profile,300),
    architecture_layers:['Network boundary and subnets','Security groups / ingress-egress policy','Compute instance or autoscaling group','Instance role and metadata controls','Block/object storage contract','Load balancing / health checks when needed','Monitoring backup and recovery'],
    baseline_controls:baseline(),
    decision_points:['Steady vs bursty workload','CPU memory storage and network profile','Single instance vs replacement/autoscaling','Stateful vs stateless workload','Availability target','Recovery point / recovery time targets','Regional and architecture compatibility'],
    external_changes_executed:[]
  }),
  SECURITY_GROUP_REVIEW:({request,cleanStringList})=>({
    summary:'Fail-closed EC2 network exposure review from declared rules',
    declared_rules:cleanStringList(request?.options?.rules,{maxItems:40,maxLength:220}),
    checks:['Every ingress rule has a business owner and purpose','Administrative ports are not globally exposed','Egress is deliberate for sensitive workloads','Security groups reference stable trust boundaries where possible','IPv4 and IPv6 exposure are reviewed together','Temporary rules have expiry/removal procedure'],
    verdict:'REVIEW_REQUIRED_AGAINST_REAL_RULESET',
    external_changes_executed:[]
  }),
  COST_OPTIMIZATION_PLAN:({request,cleanText})=>({
    summary:'EC2 cost optimization plan with zero-spend execution authority',
    utilization_summary:cleanText(request?.options?.utilization_summary,500),
    sequence:['Measure CPU memory network disk and idle windows','Remove or schedule demonstrably idle noncritical capacity','Right-size from evidence rather than guesses','Evaluate commitment models only after stable demand is proven','Use autoscaling or scale-to-zero alternatives when workload supports them','Track storage snapshots data transfer and orphaned resources separately'],
    guardrails:['No purchase or commitment is executed','No instance is stopped terminated resized or migrated','Savings claims require measured baseline'],
    external_changes_executed:[]
  }),
  BACKUP_RECOVERY_PLAN:({request,cleanText})=>({
    summary:'EC2 backup and recovery contract',
    recovery_target:cleanText(request?.options?.recovery_target,300),
    controls:['Identify state that must survive instance replacement','Define backup scope retention encryption and ownership','Test restore into isolated environment','Document DNS/load-balancer/database dependencies','Measure RPO and RTO from restore evidence','Keep rollback independent from the failed runtime where practical'],
    external_changes_executed:[]
  }),
  AUTO_SCALING_PLAN:({request,cleanText})=>({
    summary:'Autoscaling design plan without changing cloud resources',
    demand_pattern:cleanText(request?.options?.demand_pattern,300),
    plan:['Choose immutable/rebuildable launch contract','Define health check and warm-up semantics','Select scaling signal tied to actual bottleneck','Set minimum maximum and cooldown bounds','Prove graceful termination/draining','Load-test in isolated environment','Add cost and quota alarms before wider rollout'],
    external_changes_executed:[]
  })
};

export const executeAwsEc2InternalCapability=createGovernedInternalWrapper({
  wrapper_id:'skillwrap:aws-ec2-internal-v1',
  candidate_id:CANDIDATE,
  technical_name:'aws-ec2',
  source_license:'Apache-2.0',
  pinned_sha:PIN,
  default_engine:'SEC-001',
  default_task:'INSTANCE_ARCHITECTURE_PLAN',
  tasks
});
