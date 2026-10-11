#!/usr/bin/env node
import fs from 'node:fs';
import crypto from 'node:crypto';

function arg(name){const i=process.argv.indexOf(name);return i>=0?process.argv[i+1]:null}
function req(v,l){if(typeof v!=='string'||!v.trim())throw new Error(`${l} required`);return v.trim()}
const hash=s=>crypto.createHash('sha256').update(s).digest('hex');

export function applyAppAuthShellRoleMain(source){
  const from='<div className="auth-shell">';
  const to='<div className="auth-shell" role="main">';
  const pending=(source.match(new RegExp(from.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))??[]).length;
  const applied=(source.match(new RegExp(to.replace(/[.*+?^${}()|[\]\\]/g,'\\$&'),'g'))??[]).length;
  if(pending===0&&applied===2)return {status:'ALREADY_APPLIED',content:source,replacements:0,before_sha256:hash(source),after_sha256:hash(source)};
  if(pending!==2||applied!==0)throw new Error(`UNSAFE_AUTH_SHELL_SHAPE pending=${pending} applied=${applied}`);
  const content=source.split(from).join(to);
  return {status:'PATCH_APPLIED',content,replacements:2,before_sha256:hash(source),after_sha256:hash(content)};
}

if(import.meta.url===`file://${process.argv[1]}`){
  const file=req(arg('--file'),'--file');const evidence=req(arg('--evidence'),'--evidence');
  const before=fs.readFileSync(file,'utf8');const result=applyAppAuthShellRoleMain(before);
  if(result.status==='PATCH_APPLIED')fs.writeFileSync(file,result.content);
  fs.writeFileSync(evidence,JSON.stringify({transform_id:'APP_AUTH_SHELL_ROLE_MAIN_V0',file,status:result.status,replacements:result.replacements,before_sha256:result.before_sha256,after_sha256:result.after_sha256,prod_write_authorized:false,additional_cost_eur:0},null,2)+'\n');
  console.log(JSON.stringify({status:result.status,replacements:result.replacements,file}));
}
