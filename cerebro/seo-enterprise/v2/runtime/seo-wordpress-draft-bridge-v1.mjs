/**
 * SEO-001 · WordPress official DRAFT-ONLY capability contract.
 * The Cowboy_MCP_web wp_create_post dry_run was explicitly verified.
 * No WordPress tool is called by this module; PROD mutation is blocked.
 */
import crypto from 'node:crypto';
const sha=x=>crypto.createHash('sha256').update(x).digest('hex');
function html(s){
 return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;')
 .replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}
function valid(d){
 return d?.schema_version==='1.0.0'&&d?.status==='UNPUBLISHED_EDITORIAL_PROPOSAL'&&
 d.company_id==='fenix'&&d.engine_id==='SEO-001'&&d.environment==='LAB'&&
 Number.isSafeInteger(d.existing_post_id)&&d.existing_post_id>0&&
 typeof d.existing_url==='string'&&d.existing_url.startsWith('https://fenixcapital.es/')&&
 /^[a-f0-9]{64}$/.test(d.source_copy_sha256||'')&&
 /^[a-f0-9]{64}$/.test(d.source_snapshot_digest||'')&&
 d.can_publish===false&&d.can_change_existing_url===false;
}
export function planOfficialWordPressDraftDryRun({draft}={}){
 if(!valid(draft))throw Error('SEO_WP_BRIDGE_UNAPPROVED_DRAFT');
 const title='Propuesta interna SEO: '+String(draft.existing_title||'').slice(0,90);
 const content=[
  '<!-- CEREBRO SEO V2: BORRADOR INTERNO / NO PUBLICAR -->',
  '<h2>Propuesta de revisión SEO, sin editar la URL existente</h2>',
  '<p>URL original: '+html(draft.existing_url)+'</p>',
  '<p>Meta actual: '+html(draft.original_meta_description||'SIN_DATOS_EN_SNAPSHOT')+'</p>',
  '<p>Meta propuesta: '+html(draft.proposed_meta_description)+'</p>',
  '<p>CTA propuesto: '+html(draft.suggested_cta)+'</p>',
  '<p>Texto sugerido: '+html(draft.suggested_passage)+'</p>',
  '<p>Revisión obligatoria: D13 contenido, D16 YMYL, D26 licencias, D31 QA, tribunal y backup.</p>',
  '<p>No crear URL pública, no publicar ni cambiar la página original.</p>'
 ].join('\n');
 return {schema_version:'1.0.0',
  company_id:'fenix',engine_id:'SEO-001',environment:'LAB',
  bridge_provider:'Cowboy_MCP_web',bridge_tool:'wp_create_post',
  scope:'WP_CREATE_NEW_DRAFT_DRY_RUN_ONLY',
  snapshot_source_copy_sha256:draft.source_copy_sha256,
  original_url:draft.existing_url,
  operation_id:'wp-draft-plan-'+draft.existing_post_id+'-'+sha(content).slice(0,16),
  tool_arguments:{title,content,status:'draft',post_type:'post',dry_run:true},
  operation_mutates_wordpress:false,
  live_action_authorized:false,publish_capability:false,
  page_update_capability:false,
  requires_backup_and_rollback_before_live_create:true,
  requires_facts_legal_image_qa:true,
  requires_independent_tribunal:true,
  real_cms_role_iam_verified:false,
  next_gate:'WORDPRESS_DRAFT_CREATE_IAM_AND_BACKUP_PHYSICAL_EVIDENCE'};
}
export function rejectUnauthorizedWordPressCommit({plan,iam,backup,qa,tribunal}={}){
 // This is a circuit breaker, not a production writer. No caller may set dry_run=false here.
 if(!plan||plan.bridge_tool!=='wp_create_post'||plan.tool_arguments?.status!=='draft'||
   plan.tool_arguments?.dry_run!==true||plan.operation_mutates_wordpress!==false)
  throw Error('SEO_WP_BRIDGE_INVALID_PLAN');
 return {
  status:'HUMAN_REQUIRED',
  reason:!iam?.verified?'POLICY_CONFLICT':
         !backup?.physical_restore_verified?'HIGH_RISK':
         !qa?.ymyl_editorial_approved?'HIGH_RISK':
         !tribunal?.independent_approved?'HIGH_RISK':'POLICY_CONFLICT',
  detail:'Actual WordPress draft creation is not enabled in this adapter; write runtime and actor IAM still require independent authorization.',
  executed:false,wordpress_posts_created:0,
  scope:'DRY_RUN_ONLY',next_phase:'PILOT_CREATE_DRAFT_AFTER_ALL_GATES'
 };
}
export function denyWordPressPublish(){throw Error('SEO_WP_PUBLISH_IS_NOT_AUTHORIZED');}
export function denyWordPressExistingPageUpdate(){throw Error('SEO_WP_PUBLISHED_PAGE_UPDATE_IS_NOT_AUTHORIZED');}
