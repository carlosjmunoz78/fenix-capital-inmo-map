import crypto from 'node:crypto';

export const CMD001_CONTRACT_V1 = Object.freeze({
  engine_id:'CMD-001', name:'Command Router', layer:'L9', version:'1.0.0',
  environment:'LAB_PREPROD', company_scope:'MULTI_COMPANY', additional_cost_eur:0,
  objective:'classify console intent rules-first and delegate without executing actions',
  intents:['QUERY','ANALYSIS','ACTION','RULE_CHANGE','NAVIGATION','STATUS','COMPANY_CREATE'],
  delegates_to:'ORCH-001', executes_actions:false, prod_write_authorized:false, trading_access:false
});

const RULES = [
  ['COMPANY_CREATE', /\b(nueva empresa|crear empresa|alta empresa|onboard(?:ing)? company|new company)\b/i, 0.99],
  ['RULE_CHANGE', /\b(cambia(?:r)? regla|modifica(?:r)? pol[ií]tica|policy change|nueva regla|permiso permanente)\b/i, 0.98],
  ['STATUS', /\b(estado|status|health|c[oó]mo va|progreso|gates?)\b/i, 0.96],
  ['NAVIGATION', /\b(abre|ve a|navega|mostrar pantalla|ir a|open page|navigate)\b/i, 0.95],
  ['ANALYSIS', /\b(analiza|compara|audita|diagn[oó]stica|eval[uú]a|investiga|review|compare|audit)\b/i, 0.94],
  ['ACTION', /\b(ejecuta|crea|actualiza|publica|env[ií]a|borra|elimina|despliega|run|execute|deploy|send|publish)\b/i, 0.93],
  ['QUERY', /\b(qu[eé]|cu[aá]l|cu[aá]nto|dime|consulta|busca|find|show|explain)\b/i, 0.90]
];
const hash=v=>crypto.createHash('sha256').update(JSON.stringify(v)).digest('hex');
function assertContext(c){for(const k of ['company_id','engine_id','environment','version'])if(!c?.[k])throw new Error(`INVALID_CONTEXT:${k}`);if(c.environment==='PROD')throw new Error('PROD_ROUTE_DENIED');}

export function classifyCmd001({message,context,user_id,permissions=[]}){
  assertContext(context);
  if(typeof message!=='string'||!message.trim())throw new Error('EMPTY_COMMAND');
  if(!user_id)throw new Error('USER_REQUIRED');
  if(!Array.isArray(permissions))throw new Error('INVALID_PERMISSIONS');
  const matches=RULES.filter(([,re])=>re.test(message));
  const best=matches[0];
  const intent=best?.[0]??'QUERY';
  const confidence=best?.[2]??0.55;
  const low_confidence=confidence<0.7;
  const envelope={
    schema_version:'1.0.0',engine_id:'CMD-001',company_id:context.company_id,environment:context.environment,version:context.version,
    user_id,intent,confidence,route_target:'ORCH-001',execute:false,permissions:[...permissions].sort(),
    human_required:low_confidence?'LOW_CONFIDENCE':null,
    requires_policy_check:['ACTION','RULE_CHANGE','COMPANY_CREATE'].includes(intent),
    original_message:message.trim()
  };
  return {...envelope,correlation_id:`cmd-${hash(envelope).slice(0,24)}`};
}

export class Cmd001CommandRouterV1 {
  route(input){return classifyCmd001(input);}
}
