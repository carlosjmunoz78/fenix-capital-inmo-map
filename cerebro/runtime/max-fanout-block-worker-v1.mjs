import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { DeepSeekProviderV0 } from './deepseek-provider-v0.mjs';
import { DeepSeekBudgetGuardV0 } from './deepseek-budget-guard-v0.mjs';
import { DeepSeekLiveBalanceGuardV0 } from './deepseek-live-balance-guard-v0.mjs';

export const FANOUT_BLOCKS = Object.freeze([
  ['W00','Live-state freeze and evidence inventory'],
  ['W01','CEREBRO Browser primary web operating surface'],
  ['W02','Universal browser extension'],
  ['W03','Universal PC control plane'],
  ['W04','Universal Mobile Jarvis'],
  ['W05','Notification and event fabric'],
  ['W06','Identity multi-account credential control'],
  ['W07','Social Department reference architecture'],
  ['W08','Clone social pattern to relevant networks'],
  ['W09','SEO department restructuring'],
  ['W10','Agent and subagent knowledge bootstrap'],
  ['W11','Agent Skill Engine catalogue reconciliation'],
  ['W12','App Fenix integration audit and repair'],
  ['W13','CEREBRO Console Jarvis interface'],
  ['W14','Jarvis identity personality voice'],
  ['W15','Context memory knowledge continuity'],
  ['W16','Model Execution Router with DeepSeek'],
  ['W17','Learning RSI Factory closure'],
  ['W18','Cross-system Browser procedures'],
  ['W19','Security audit rollback kill switches'],
  ['W20','E2E acceptance matrix'],
  ['W21','CEREBRO interface completion JARVIS View 0'],
  ['W22','APPFACT-001 autonomous app factory'],
  ['W23','ZEUS Control Map route registry'],
  ['W24','ZEUS Living Project'],
].map(([id,title], index) => Object.freeze({ id, title, index })));

const KEYWORDS = Object.freeze({
  W00:['inventory','state','evidence','registry'], W01:['browser','bridge','session'], W02:['extension','chromium'], W03:['pc','computer','device'],
  W04:['mobile','android','ios'], W05:['notification','event','outbox'], W06:['iam','vault','credential','identity'], W07:['social','facebook'],
  W08:['instagram','linkedin','tiktok','youtube','pinterest'], W09:['seo','search-console'], W10:['knowledge','agent','subagent'], W11:['registry','skill','engine','capability'],
  W12:['app','fenix','crm'], W13:['console','jarvis','gateway'], W14:['voice','tts','stt','persona'], W15:['memory','context','knowledge'],
  W16:['router','deepseek','model'], W17:['learning','rsi','factory','tribunal'], W18:['procedure','browser'], W19:['security','rollback','kill','audit'],
  W20:['e2e','acceptance','playwright'], W21:['jarvis','console','neural','work'], W22:['appfact','digital-build','factory'], W23:['zeus','map','route','resolver'], W24:['zeus','living','project','timeline'],
});

const BOOST_DIR = path.resolve('cerebro/jarvis/boost-001');
const OUT_ROOT = path.resolve(process.env.CEREBRO_FANOUT_OUT_DIR || 'artifacts/max-fanout-v1');

export function blocksForShard(shard, shards = 8) {
  if (!Number.isInteger(shard) || !Number.isInteger(shards) || shard < 0 || shards < 1 || shard >= shards) throw new Error('invalid shard');
  return FANOUT_BLOCKS.filter(block => block.index % shards === shard);
}

function validateShard(shard, shards) {
  if (!Number.isInteger(shard) || !Number.isInteger(shards) || shard < 0 || shards < 1 || shard >= shards) throw new Error('invalid evidence shard');
}

function blockById(blockId) {
  const block = FANOUT_BLOCKS.find(x => x.id === blockId);
  if (!block) throw new Error(`unknown block ${blockId}`);
  return block;
}

function gitFiles() {
  const text = execFileSync('git', ['ls-files'], { encoding:'utf8' });
  return text.split(/\r?\n/).filter(Boolean);
}

export function evidenceForBlockShard(blockId, shard = 0, shards = 1) {
  validateShard(shard, shards);
  const block = blockById(blockId);
  const terms = KEYWORDS[block.id] || [block.id.toLowerCase()];
  const files = gitFiles();
  const allHits = files.filter(file => {
    const lower = file.toLowerCase();
    return terms.some(term => lower.includes(term));
  });
  const hits = allHits.filter((_, index) => index % shards === shard).slice(0,120);
  return {
    schema_version:'1.1',
    block_id:block.id,
    title:block.title,
    shard,
    shards,
    environment:'PREPROD',
    prod_authorized:false,
    trading_access:false,
    generated_at:new Date().toISOString(),
    git_sha:process.env.GITHUB_SHA || null,
    keyword_terms:terms,
    matching_paths:hits,
    matching_path_count:hits.length,
    matching_path_total:allHits.length,
    shard_key:`${block.id}:${shard}/${shards}`,
  };
}

function evidenceFor(block) {
  return evidenceForBlockShard(block.id,0,1);
}

function readText(file) {
  try { return fs.readFileSync(file,'utf8'); } catch { return ''; }
}

function scopeFor(block) {
  const docs = [
    'MASTER_SCOPE_2026-10-27.md',
    'ADDENDUM_W21_W22_JARVIS_VIEW0_APPFACT_2026-10-27.md',
    'ADDENDUM_W23_ZEUS_CONTROL_MAP_2026-10-27.md',
    'ADDENDUM_W24_ZEUS_LIVING_PROJECT_2026-10-27.md',
  ].map(name => readText(path.join(BOOST_DIR,name))).join('\n\n');
  const marker = block.id.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
  const match = docs.match(new RegExp(`(?:^|\\n)#{1,3}\\s+${marker}\\b[\\s\\S]*?(?=\\n#{1,3}\\s+W\\d{2}\\b|$)`,'m'));
  return (match?.[0] || `${block.id} · ${block.title}`).slice(0,12000);
}

function writeJson(file,value) {
  fs.mkdirSync(path.dirname(file),{recursive:true});
  fs.writeFileSync(file,`${JSON.stringify(value,null,2)}\n`,'utf8');
}

export async function runEvidence(blockId, shard = 0, shards = 1) {
  const packet = evidenceForBlockShard(blockId,shard,shards);
  const target = shards === 1
    ? path.join(OUT_ROOT,packet.block_id,'evidence.json')
    : path.join(OUT_ROOT,packet.block_id,`shard-${shard}-of-${shards}`,'evidence.json');
  writeJson(target,packet);
  return packet;
}

export function buildDeepSeekBlockInput(blockId) {
  const block = blockById(blockId);
  const evidence = evidenceFor(block);
  const input = [
    `BLOCK ${block.id}: ${block.title}`,
    scopeFor(block),
    `REPO_EVIDENCE=${JSON.stringify(evidence).slice(0,12000)}`,
    'Work as one bounded CEREBRO agent. Return a compact JSON object only with: status_assessment, confirmed_evidence, independent_subtasks, dependency_edges, ready_now, missing_gates, implementation_targets, concrete_work_product, tests_required, learning_candidates, prod_blockers. Split independent work so sibling subtasks can execute in parallel. Never claim PROD without live evidence. Never expose secrets. Preserve existing systems. Trading stays isolated.',
  ].join('\n\n').slice(0,28000);
  return { block,evidence,input };
}

export async function runDeepSeekBlock(blockId) {
  if (process.env.CEREBRO_ALLOW_PAID_FANOUT !== 'YES') throw new Error('paid fanout not authorized by runtime flag');
  if (!process.env.DEEPSEEK_API_KEY) throw new Error('DEEPSEEK_API_KEY missing');
  const projectedCostEur = Number(process.env.CEREBRO_FANOUT_PROJECTED_EUR_PER_BLOCK || '0.05');
  const projectedCostUsd = Number(process.env.CEREBRO_FANOUT_PROJECTED_USD_PER_BLOCK || '0.05');
  const spentEur = Number(process.env.CEREBRO_FANOUT_SPENT_EUR || '0');
  const budgetGuard = new DeepSeekBudgetGuardV0({ initialHardCapEur:200, autoRecharge:false });
  const budgetAuthorization = budgetGuard.authorize({ phase:'bootstrap',spentEur,projectedCostEur });
  if (!budgetAuthorization.allowed) throw new Error('HUMAN_REQUIRED:MONEY_LIMIT');
  const liveGuard = new DeepSeekLiveBalanceGuardV0({ baselineUsd:100, autoRecharge:false });
  const liveAuthorization = await liveGuard.authorize({ apiKey:process.env.DEEPSEEK_API_KEY, projectedCostUsd });
  if (!liveAuthorization.allowed) throw new Error(`HUMAN_REQUIRED:MONEY_LIMIT:${liveAuthorization.reason}`);
  const provider = new DeepSeekProviderV0();
  const { block,evidence,input } = buildDeepSeekBlockInput(blockId);
  const response = await provider.respond({
    model:'deepseek-flash',
    instructions:'You are a bounded CEREBRO execution-planning agent. Produce concrete work product and a hierarchical dependency graph. Deterministic tests and Tribunal, not you, decide promotion.',
    input,
    maxOutputTokens:1024,
  }, { requestId:`max-fanout-${block.id}-${process.env.GITHUB_RUN_ID || 'local'}` });
  const record = {
    schema_version:'1.2',block_id:block.id,title:block.title,evidence,usage:response.usage,output_text:response.output_text,
    authorization:{budget:budgetAuthorization,live_balance:liveAuthorization},governance_state:'CANDIDATE_ONLY',prod_authorized:false,auto_recharge:false,
  };
  writeJson(path.join(OUT_ROOT,block.id,'deepseek-agent.json'),record);
  return record;
}

export async function runDeepSeekShard(shard, shards = 8) {
  const blocks = blocksForShard(shard,shards);
  const results=[];
  for (const block of blocks) results.push(await runDeepSeekBlock(block.id));
  return results;
}

async function main() {
  const args=Object.fromEntries(process.argv.slice(2).map(arg=>{const[k,v='true']=arg.replace(/^--/,'').split('=');return[k,v];}));
  if (args.mode === 'evidence') await runEvidence(args.block,Number(args.shard || 0),Number(args.shards || 1));
  else if (args.mode === 'deepseek-block') await runDeepSeekBlock(args.block);
  else if (args.mode === 'deepseek') await runDeepSeekShard(Number(args.shard),Number(args.shards || 8));
  else throw new Error('use --mode=evidence --block=Wxx [--shard=N --shards=N] OR --mode=deepseek-block --block=Wxx OR --mode=deepseek --shard=N --shards=8');
}

const self=process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url);
if(self)main().catch(error=>{console.error(String(error?.message||error));process.exitCode=1;});
