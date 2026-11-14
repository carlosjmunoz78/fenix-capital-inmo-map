import {listSeoDepartments,compileSeoSpecialistMission,workforceStatus,getSeoDepartmentKnowledge} from './seo-specialist-workforce-v2.mjs';
const command=process.argv[2]||'status';
try{
 let value;
 if(command==='status') value=workforceStatus();
 else if(command==='list')value=listSeoDepartments();
 else if(command==='show')value=getSeoDepartmentKnowledge(process.argv[3]||'');
 else if(command==='plan'){
  const dep=process.argv[3];const p=getSeoDepartmentKnowledge(dep);
  value=compileSeoSpecialistMission({company_id:'fenix',environment:'LAB',department_id:dep,
  subagent_role_id:p.workforce.subagents[0].role_id,request_id:'SEO_DOCS_001',
  objective:'Preparar propuesta de competencia con las fuentes canónicas existentes',
  source_refs:['cerebro/seo-enterprise/v2/seo-existing-content-assets-source-registry-v1.json'],
  allow_writes:false,allow_paid_ai:false,budget_eur:0});
 }
 else throw Error('COMMAND_INVALID');
 process.stdout.write(JSON.stringify(value,null,2)+'\n');
}catch(err){process.stderr.write(String(err.message)+'\n');process.exitCode=1}
