/** Private, read-only CI acceptance for actual Vercel server source materialization.
 * Bundles the real API under Node after npm ci; no browser credentials.
 */
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join,resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {build} from 'esbuild';
const root=await mkdtemp(join(tmpdir(),'cerebro-agent-directory-lab-'));
try{
 const outfile=join(root,'api.mjs');
 await build({entryPoints:[resolve('api/cerebro-agent-directory.ts')],
  outfile,bundle:true,platform:'node',format:'esm',target:'node24',
  logLevel:'warning',write:true});
 const {buildCerebroAgentDirectoryV0,queryCerebroAgentDirectoryV0,validateCerebroAgentDirectoryQueryV0}=
  await import(pathToFileURL(outfile).href);
 const roles=buildCerebroAgentDirectoryV0();
 assert.equal(roles.length,1138,'11 canonical roles + 569 FB source roles + 529 UMS roles + 29 legacy templates');
 assert.equal(new Set(roles.map(x=>x.kind+':'+x.id)).size,1138);
 assert.equal(roles.filter(x=>x.kind==='SUBAGENT_ROLE').length,911);
 assert.equal(roles.filter(x=>x.family==='MEDIA_STUDIO').length,529);
 assert.equal(roles.filter(x=>x.family==='SOCIAL_FACEBOOK'&&x.kind==='AGENT_ROLE').length,42);
 assert.equal(roles.filter(x=>x.family==='SOCIAL_FACEBOOK'&&x.kind==='SUBAGENT_ROLE').length,527);
 assert.equal(roles.filter(x=>x.kind==='SUBAGENT_TEMPLATE').length,29);
 assert(roles.filter(x=>x.kind==='SUBAGENT_ROLE').every(x=>x.parent_id&&
  (x.parent_id.startsWith('UMS:')||x.parent_id.startsWith('FB-'))));
 assert(roles.every(x=>!x.runtime_verified&&x.purpose_plain&&x.source_url));
 const q=new URLSearchParams({company_id:'fenix',kind:'ALL',family:'ALL',offset:'0',limit:'100'});
 const req=validateCerebroAgentDirectoryQueryV0(q);
 assert.equal(req.limit,100);
 const page=queryCerebroAgentDirectoryV0(q);
 assert.equal(page.page.total,1138);
 assert.equal(page.records.length,100);
 assert.equal(page.page.next_offset,100);
 assert.equal(page.counts.media_studio_source_roles,529);
 assert.equal(page.counts.registered_logical_subagent_roles,911);
 assert.equal(page.counts.facebook_source_components,569);
 assert.equal(page.counts.total_runtime_instances,null);
 assert.equal(page.coverage,'PARTIAL_SOURCED_INVENTORY_NOT_ALL_AGENTS');
 const prod=queryCerebroAgentDirectoryV0(new URLSearchParams({company_id:'fenix',kind:'SUBAGENT_ROLE',family:'MEDIA_STUDIO',offset:'375',limit:'25'}));
 assert.equal(prod.page.total,384);
 assert.equal(prod.records.length,9);
 assert(prod.records.every(x=>x.family==='MEDIA_STUDIO'&&x.kind==='SUBAGENT_ROLE'));
 const engineering=queryCerebroAgentDirectoryV0(new URLSearchParams({company_id:'fenix',kind:'ALL',family:'ENGINEERING',limit:'100'}));
 assert.equal(engineering.page.total,10);
 for(const bad of [{company_id:'aion'},{company_id:'fenix',limit:'1000'},{company_id:'fenix',offset:'-1'},
  {company_id:'fenix',kind:'UNAUTHORIZED'},{company_id:'fenix',extra:'hello'}])
  assert.throws(()=>validateCerebroAgentDirectoryQueryV0(new URLSearchParams(bad)));
 console.log('CEREBRO directory runtime GREEN:',{total:1138,media:529,facebook:569,subagent_roles:911,
  social_roles:42,templates:29,pagination:'validated',scope:'owner-only runtime separate',prod:false});
}finally{await rm(root,{recursive:true,force:true})}
