import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import ts from 'typescript';

const orchestrator='supabase/functions/jarvis-orchestrator-v0/index.ts';
const work='supabase/functions/jarvis-work-gateway-v1/index.ts';
const git='supabase/functions/jarvis-git-gateway-v1/index.ts';

function body(path){return fs.readFileSync(path,'utf8');}
function actualPredicate(path,name){
  const source=body(path),ast=ts.createSourceFile(path,source,ts.ScriptTarget.Latest,true,ts.ScriptKind.TS);
  assert.equal(ast.parseDiagnostics.length,0,path+': parser must accept TypeScript source');
  const node=ast.statements.find(node=>ts.isFunctionDeclaration(node)&&node.name?.text===name);
  assert.ok(node,path+': real policy function '+name+' required');
  const sourceSnippet=node.getText(ast);
  const compiled=ts.transpileModule(sourceSnippet+'\nmodule.exports='+name+';', {compilerOptions:{target:ts.ScriptTarget.ES2022,module:ts.ModuleKind.CommonJS}}).outputText;
  const module={exports:null};
  vm.runInNewContext(compiled,{module}, {timeout:1000});
  assert.equal(typeof module.exports,'function');
  return module.exports;
}

test('DIR-TEST orchestrator permits only repository read intents',()=>{
  const check=actualPredicate(orchestrator,'testActorOrchestratorAllowed');
  for(const op of ['REPO_HEAD','REPO_LIST','REPO_FILE'])assert.equal(check(op),true,op);
  for(const op of ['SAVE_FILE','ROLLBACK_COMMIT','WORK_CANCEL','GIT_STATUS','GIT_DIFF','GIT_COMPARE','SEARCH_CODE','RUN_READONLY_CHECK','PROJECTS_LIST','WORK_STATUS','BROWSER_STATUS','BROWSER_PROFILES','BROWSER_HANDOFF'])
    assert.equal(check(op),false,op);
  assert.match(body(orchestrator),/authz\.actor==='DIR-TEST'&&!testActorOrchestratorAllowed\(intent\).*403/);
});

test('DIR-TEST direct work gateway permits only GET repo head/list/file',()=>{
  const check=actualPredicate(work,'testActorWorkAllowed');
  for(const p of ['head','list','file'])assert.equal(check('GET',['repo',p]),true,p);
  for(const [method,route] of [['POST',['repo','search']],['POST',['terminal']],['POST',['work','enqueue']],['POST',['work','123','cancel']],['PATCH',['projects','123']],['GET',['work','123']],['GET',['projects']],['GET',['health']],['POST',['repo','head']]])
    assert.equal(check(method,route),false,method+' '+route.join('/'));
  assert.match(body(work),/a\.actor==='DIR-TEST'&&!testActorWorkAllowed\(req\.method,r\).*403/);
});

test('DIR-TEST direct Git gateway denies all HTTP methods and mutations',()=>{
  const source=body(git);
  const auth=source.indexOf("if(!authz.ok)return out(req,403");
  const gate=source.indexOf("if(authz.actor==='DIR-TEST')return out(req,403");
  const routes=source.indexOf("const parts=new URL(req.url)");
  assert.ok(auth>=0&&gate>auth&&routes>gate,'test actor must be denied BEFORE routing');
  assert.match(source,/reason:'TEST_ACTOR_GIT_DENIED'/);
  assert.ok(source.includes("route[0]==='save'")&&source.includes("route[0]==='rollback'"));
});

test('No new privileged test identity is provisioned by this change',()=>{
  for(const path of [orchestrator,work,git]){
    const source=body(path);
    assert.match(source,/actor==='CARLOS-ADMIN'\|\|actor==='DIR-TEST'/);
    assert.doesNotMatch(source,/signUp\(|admin\.createUser\(|inviteUserByEmail\(/);
  }
  assert.ok(!fs.existsSync('supabase/migrations/20261109_jarvis_dir_test_new_actor.sql'));
});
