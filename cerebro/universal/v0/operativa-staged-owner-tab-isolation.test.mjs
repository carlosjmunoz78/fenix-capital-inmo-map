import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createStagedOwnerAuthStorage} from '../../../src/stagedOwnerAuthStorage.ts';

const KEY='fenix-prod-auth-v1';
function store(){
 const map=new Map();
 return {getItem:k=>map.has(k)?map.get(k):null,setItem:(k,v)=>{map.set(k,String(v))},
  removeItem:k=>{map.delete(k)},has:k=>map.has(k)};
}
test('new unremembered tab never resumes or revokes a session in another tab',()=>{
 const local=store(),tabA=store(),tabB=store();
 local.setItem('fenix-remember-device','false');
 tabA.setItem('fenix-session-active','1');
 const a=createStagedOwnerAuthStorage(local,tabA,KEY);
 const b=createStagedOwnerAuthStorage(local,tabB,KEY);
 a.setItem(KEY,'TOKEN_A');
 assert.equal(a.getItem(KEY),'TOKEN_A');
 assert.equal(b.getItem(KEY),null);
 b.removeItem(KEY);
 assert.equal(a.getItem(KEY),'TOKEN_A');
 assert.equal(local.getItem('fenix-remember-device'),'false');
});
test('staged session not remembered never writes tokens to localStorage',()=>{
 const local=store(),tab=store();
 local.setItem('fenix-remember-device','false');
 tab.setItem('fenix-session-active','1');
 const s=createStagedOwnerAuthStorage(local,tab,KEY);
 s.setItem(KEY,'NON_REMEMBERED');
 assert.equal(local.getItem(KEY),null);
 assert.equal(tab.getItem(KEY),'NON_REMEMBERED');
 tab.removeItem('fenix-session-active');
 assert.equal(s.getItem(KEY),null);
});
test('remembered session is shared in localStorage and is cleared on logout',()=>{
 const local=store(),a=store(),b=store();
 local.setItem('fenix-remember-device','true');
 const A=createStagedOwnerAuthStorage(local,a,KEY);
 const B=createStagedOwnerAuthStorage(local,b,KEY);
 A.setItem(KEY,'REMEMBERED');
 assert.equal(B.getItem(KEY),'REMEMBERED');
 A.removeItem(KEY);
 assert.equal(B.getItem(KEY),null);
});
test('legacy staged session migrates only in previously authenticated tab',()=>{
 const local=store(),a=store(),b=store();
 local.setItem('fenix-remember-device','false');
 local.setItem(KEY,'OLDER_SESSION');
 a.setItem('fenix-session-active','1');
 const A=createStagedOwnerAuthStorage(local,a,KEY);
 const B=createStagedOwnerAuthStorage(local,b,KEY);
 assert.equal(B.getItem(KEY),null);
 assert.equal(local.getItem(KEY),'OLDER_SESSION');
 assert.equal(A.getItem(KEY),'OLDER_SESSION');
 assert.equal(local.getItem(KEY),null);
 assert.equal(a.getItem(KEY),'OLDER_SESSION');
 assert.equal(B.getItem(KEY),null);
});
test('unremembered tab cannot inherit residual tab token without active flag',()=>{
 const local=store(),tab=store();
 local.setItem('fenix-remember-device','false');
 tab.setItem(KEY,'OLD_TOKEN');
 const s=createStagedOwnerAuthStorage(local,tab,KEY);
 assert.equal(s.getItem(KEY),null);
});
test('nonstage app remains on legacy storage while staged owner context is server-only',()=>{
 const supabase=readFileSync(new URL('../../../src/supabase.ts',import.meta.url),'utf8');
 const app=readFileSync(new URL('../../../src/App.tsx',import.meta.url),'utf8');
 assert.match(supabase,/const authStorage=stagedOwnerHostname[\s\S]+?:legacyAuthStorage;/);
 assert.match(supabase,/!stagedOwnerHostname&&path==='\/session\/context'/);
 assert.match(supabase,/STAGED_OWNER_HOST=stagedOwnerHostname/);
 assert.match(app,/if\(STAGED_OWNER_HOST\)\{if\(mounted\)\{setSession\(null\);setAuthReady\(true\);\}return;\}/);
 assert.match(app,/previousRemember[\s\S]+?STAGED_OWNER_HOST[\s\S]+?signInWithPassword/);
 assert.match(app,/event!=='PASSWORD_RECOVERY'[\s\S]+?sessionStorage\.getItem\('fenix-session-active'\)/);
});
