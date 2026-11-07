#!/usr/bin/env node
import fs from 'node:fs';
import {buildSeoOrg,saveSeoOrg} from './seo-org-v0.mjs';
const get=p=>JSON.parse(fs.readFileSync(new URL(p,import.meta.url),'utf8'));
const args=process.argv.slice(2),command=args[0];
function option(flag,fallback=null){const i=args.indexOf(flag);return i<0?fallback:args[i+1];}
try{
 if(!['validate','generate'].includes(command))throw Error('ORG_COMMAND');
 const plan=buildSeoOrg({
  company_id:option('--company-id','fenix'),
  organization:get('../seo-enterprise/v2/organization.manifest.json'),
  coverage:get('../seo-enterprise/v2/competency-coverage-and-board-v0.json'),
  policy:get('../governance/universal-excellence-owner-authority.v0.json'),
  seed:get('../registry/engine-registry.seed.json')
 });
 if(command==='validate')console.log(JSON.stringify({state:'VALID_SCAFFOLD_ONLY',files:plan.size,families:8,departments:32,real_agents:0,prod_authorized:false}));
 else {
  const out=option('--out');
  if(!out)throw Error('ORG_OUT_REQUIRED');
  console.log(JSON.stringify(saveSeoOrg(out,plan)));
 }
}catch(e){console.error(JSON.stringify({state:'BLOCKED',reason:e.message}));process.exitCode=2;}
