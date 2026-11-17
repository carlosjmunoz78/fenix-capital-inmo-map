/**
 * CEREBRO NIA / ACTGW-001 — one-shot isolated LAB verification.
 * Imports the ORIGINAL ActionGatewayV1 and additive NIA binding, not a fork.
 * No HTTP exposure, cron, paid models, App/CRM/PROD access or Notion writes.
 * This queue handler is temporary and MUST be removed after the proof.
 */
import { ActionGatewayV1 } from './action-gateway-v1.mjs';
import { bindNiaDiscoveryToActionGatewayV0, NIA_CAPABILITY, NIA_SKILL_ID } from './nia-action-gateway-binding-v0.mjs';
import { createNiaPageReadProviderV0 } from './nia-notion-page-provider-v0.mjs';

const QUEUE = 'cerebro-nia-actgw-one-shot-lab';
const CONTEXT = Object.freeze({ company_id:'fenix', engine_id:'ACTGW-001', environment:'PREPROD', version:'0.1.1' });
const req = (key, payload={topic:'documentation'}, extra={}) => ({
  context:{...CONTEXT}, capability:NIA_CAPABILITY, idempotency_key:key,
  authorized:true, payload, risk:'LOW', estimated_additional_cost_eur:0, ...extra
});
function verify(label,ok) {
  console.log('NIA_ACTGW_'+label+'='+(ok?'PASS':'FAIL'));
  if(!ok) throw new Error('NIA_ACTGW_TEST_FAILED_'+label);
}
function allowedMessage(body) {
  const now=Date.now();
  return body?.type==='NIA_ACTGW_READONLY_ONE_SHOT_V1' &&
   body?.single_use===true && body?.skill_id===NIA_SKILL_ID &&
   Number.isSafeInteger(body.issued_at_ms) && Number.isSafeInteger(body.expires_at_ms) &&
   body.expires_at_ms>body.issued_at_ms &&
   body.expires_at_ms-body.issued_at_ms<=120000 &&
   now>=body.issued_at_ms && now<=body.expires_at_ms;
}
async function runProof(env) {
  let pageReads=0;
  const provider = createNiaPageReadProviderV0({
    token_provider:async()=>env.CEREBRO_NIA_NOTION_READ_TOKEN,
    fetch_impl:globalThis.fetch,
    timeout_ms:10000
  });
  const gw=new ActionGatewayV1({environment:'PREPROD'});
  const binding=bindNiaDiscoveryToActionGatewayV0({
    actionGateway:gw,
    notionProvider:{readSkillPage:async id=>{pageReads++;return provider.readSkillPage(id);}},
    expectedCompanyId:'fenix'
  });
  verify('BINDING',binding.status==='BOUND' && binding.capability===NIA_CAPABILITY && binding.ai_execution===false);
  verify('GATEWAY_CONTRACT',gw.contract().prod_writes===false && gw.contract().trading_access===false && gw.contract().idempotency_required===true);
  const first=await gw.execute(req('nia-lab-live-01'));
  verify('LIVE_NOTION',first.status==='ACTION_EXECUTED' &&
     first.result?.status==='NIA_DISCOVERED' &&
     first.result?.provider==='NOTION_PAGE_READONLY' &&
     first.result?.skill_id===NIA_SKILL_ID &&
     first.result?.ai_session_started===false && first.result?.skill_content_loaded===false &&
     pageReads===1);
  const replay=await gw.execute(req('nia-lab-live-01'));
  verify('IDEMPOTENCY',JSON.stringify(replay)===JSON.stringify(first) && pageReads===1 &&
    gw.auditLog().at(-1)?.type==='ACTION_REPLAYED');
  const checks=[
    ['UNAUTHORIZED',{authorized:false},'HUMAN_REQUIRED','POLICY_CONFLICT'],
    ['PAID',{estimated_additional_cost_eur:0.01},'HUMAN_REQUIRED','MONEY_LIMIT'],
    ['PROD_WRITE',{requires_prod_write:true},'HUMAN_REQUIRED','HIGH_RISK'],
    ['TRADING',{trading_access:true},'HUMAN_REQUIRED','POLICY_CONFLICT'],
    ['SIGNATURE',{signature_required:true},'HUMAN_REQUIRED','SIGNATURE_REQUIRED']
  ];
  for(const [label,extra,status,reason] of checks){
    const res=await gw.execute(req('nia-lab-'+label.toLowerCase(),{topic:'documentation'},extra));
    verify(label,res.status===status&&res.reason===reason&&res.executed===false&&pageReads===1);
  }
  const tenant=await gw.execute(req('nia-lab-tenant',{topic:'documentation'},{context:{...CONTEXT,company_id:'other_company'}}));
  verify('TENANT_ISOLATION',tenant.result?.status==='NIA_DENIED'&&tenant.result?.reason==='TENANT_OR_ENVIRONMENT_MISMATCH'&&pageReads===1);
  const wrongTopic=await gw.execute(req('nia-lab-topic',{topic:'social'}));
  verify('TOPIC_SCOPE',wrongTopic.result?.status==='NOOP'&&pageReads===1);
  const handled=await gw.execute(req('nia-lab-handled',{topic:'knowledge',already_handled:true}));
  verify('NO_DUPLICATION',handled.result?.status==='NOOP'&&pageReads===1);
  const badField=await gw.execute(req('nia-lab-badfield',{topic:'knowledge',credentials:'do-not-accept'}));
  verify('PAYLOAD_SCOPE',badField.result?.status==='NIA_DENIED'&&pageReads===1);
  let deniedEnv=false;
  try { await gw.execute(req('nia-lab-prod-env',{topic:'documentation'},{context:{...CONTEXT,environment:'PROD'}})); }
  catch { deniedEnv=true; }
  verify('PROD_ENV_DENIED',deniedEnv&&pageReads===1);
  const audit=gw.auditLog();
  verify('AUDIT',audit.length>=11 &&
    audit.some(x=>x.type==='ACTION_EXECUTED'&&x.capability===NIA_CAPABILITY) &&
    audit.some(x=>x.type==='HUMAN_REQUIRED'&&x.capability===NIA_CAPABILITY));
  verify('NO_SECRET_OR_CONTENT_IN_RESULTS',!JSON.stringify({first,audit}).includes(env.CEREBRO_NIA_NOTION_READ_TOKEN) &&
    first.result?.skill_content_loaded===false);
  console.log('NIA_ACTGW_PHYSICAL_GATE=PASS');
}
export default {
  async fetch(){
    return new Response('Not Found',{status:404,headers:{'Cache-Control':'no-store'}});
  },
  async scheduled(){
    console.log('NIA_ACTGW_SCHEDULED=OFF');
  },
  async queue(batch,env){
    for(const message of batch.messages){
      if(batch.queue!==QUEUE || !allowedMessage(message.body)){
        console.log('NIA_ACTGW_PRIVATE_MESSAGE=DENIED');
        message.ack();
        continue;
      }
      try { await runProof(env); }
      catch { console.log('NIA_ACTGW_PHYSICAL_GATE=BLOCKED'); }
      finally { message.ack(); }
    }
  }
};
