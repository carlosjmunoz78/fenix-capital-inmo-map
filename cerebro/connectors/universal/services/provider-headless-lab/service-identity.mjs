// FACT-001 independent service identities. Only fixed vendor identity probes;
// never use ChatGPT OAuth tokens or model-supplied URLs, headers, domains or secrets.
// Read-only. GitHub fine-grained PAT and Notion internal integration each require
// an explicit initial owner authorization and limited permissions.
export const SERVICE_IDENTITIES=Object.freeze({
  notion:Object.freeze({
    secret_name:'cerebro_notion_service_token_v1',
    url:'https://api.notion.com/v1/users/me',
    expected_type:'bot',
    intended_role:'FACT001_LIMITED_WORKSPACE',
    connection_kind:'notion_internal_integration'
  }),
  github:Object.freeze({
    secret_name:'cerebro_github_factory_pat_v1',
    url:'https://api.github.com/user',
    expected_login:'carlosjmunoz78',
    intended_role:'FACT001_SELECTED_REPOS_ADMIN',
    connection_kind:'fine_grained_pat_limited'
  })
});
export function assertIdentityProbeOrder(order){
 const base={company_id:'fenix-capital',engine_id:'FACT-001',environment:'LAB',version:'1.0.0',
   source:'owner_order',client_id:'cerebro',operation:'provider.service_identity.probe',
   request_id:'FACT001-INDEPENDENT-IDENTITIES-20261110'};
 if(!order||typeof order!=='object'||Array.isArray(order))throw Error('IDENTITY_ORDER_INVALID');
 const keys=Object.keys(base).concat(['provider']).sort();
 if(JSON.stringify(Object.keys(order).sort())!==JSON.stringify(keys))throw Error('IDENTITY_ORDER_FIELDS_DENIED');
 if(Object.entries(base).some(([k,v])=>order[k]!==v))throw Error('IDENTITY_ORDER_SCOPE_DENIED');
 if(!Object.hasOwn(SERVICE_IDENTITIES,order.provider))throw Error('IDENTITY_PROVIDER_DENIED');
 return order.provider;
}
export async function probeServiceIdentity({provider,token,http=fetch}={}){
 const spec=SERVICE_IDENTITIES[provider];
 if(!spec)throw Error('SERVICE_PROVIDER_DENIED');
 if(typeof token!=='string'||token.length<24||token.length>8192||/[\s\r\n]/.test(token))throw Error('SERVICE_TOKEN_INVALID');
 const headers={Authorization:'Bearer '+token,Accept:'application/json'};
 if(provider==='notion')headers['Notion-Version']='2026-03-11';
 if(provider==='github')headers['X-GitHub-Api-Version']='2026-03-10';
 const response=await http(spec.url,{method:'GET',headers,redirect:'error',signal:AbortSignal.timeout(12000)});
 if(response.status===401||response.status===403)throw Error('SERVICE_IDENTITY_PERMISSION_'+response.status);
 if(response.status!==200)throw Error('SERVICE_IDENTITY_HTTP_'+response.status);
 let body;
 try{body=await response.json()}catch{throw Error('SERVICE_IDENTITY_BAD_RESPONSE');}
 if(!body||typeof body!=='object'||Array.isArray(body))throw Error('SERVICE_IDENTITY_BAD_RESPONSE');
 if(provider==='notion'&&(body.object!=='user'||body.type!==spec.expected_type||!body.bot))
  throw Error('NOTION_INTEGRATION_NOT_PROVEN');
 if(provider==='github'&&(body.login!==spec.expected_login||body.type!=='User'))
  throw Error('GITHUB_SERVICE_OWNER_MISMATCH');
 // Neither identity read proves any create/update/delete permission.
 return {status:'SERVICE_IDENTITY_READ_VERIFIED',provider,
  integration_or_login:provider==='notion'?String(body.name||'notion-integration').slice(0,80):spec.expected_login,
  credential_exposed:false,admin_write_verified:false,independent_service:true,
  api_requests:1,mutations:0};
}
