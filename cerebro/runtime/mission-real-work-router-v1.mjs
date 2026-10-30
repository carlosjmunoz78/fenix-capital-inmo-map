import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { selectMissionUnit, executeMissionDerivedWork } from './mission-derived-useful-work-v1.mjs';
import { fact001TargetsForMission, runMissionFact001ScaffoldV1 } from './mission-fact001-scaffold-bridge-v1.mjs';

const PREPROD = 'PREPROD';

export function routeMissionRealWorkV1({ lane, cycle, fallback=true } = {}) {
  if ((process.env.CEREBRO_SUPERVISOR_ENV || PREPROD) !== PREPROD) throw new Error('MISSION_REAL_WORK_PREPROD_ONLY');
  if (process.env.CEREBRO_PROD_WRITE === 'true') throw new Error('MISSION_REAL_WORK_PROD_WRITE_DENIED');
  if (process.env.CEREBRO_TRADING_ACCESS === 'true') throw new Error('MISSION_REAL_WORK_TRADING_DENIED');
  if (process.env.CEREBRO_ALLOW_PAID_FANOUT === 'YES') throw new Error('MISSION_REAL_WORK_PAID_AI_DENIED');

  const selected = selectMissionUnit(Number(lane), Number(cycle));
  const unit = selected.unit;
  const parts = unit.work_unit_id.split('.');
  const phase = parts[1] || 'root';
  const atom = parts[2] || null;
  const base = executeMissionDerivedWork({ lane:Number(lane), cycle:Number(cycle), fallback });
  let physical = null;

  if (phase === 'implement' && atom === 'scaffold' && fact001TargetsForMission(unit.mission_id).length > 0) {
    const root = process.env.CEREBRO_MISSION_FACT001_OUT_DIR || 'artifacts/mission-fact001-scaffold-v1';
    physical = runMissionFact001ScaffoldV1({ mission_id:unit.mission_id, company_id:unit.company_id, out_root:root });
  }

  const executionState = physical?.status === 'FACT001_SCAFFOLDS_GENERATED'
    ? 'FACT001_SCAFFOLD_GENERATED'
    : base.execution_state;

  return Object.freeze({
    ok:true,
    lane:base.lane,
    cycle:base.cycle,
    work_unit_id:base.work_unit.work_unit_id,
    mission_id:base.work_unit.mission_id,
    mission_title:base.mission_scope.title,
    phase:base.phase,
    atom:base.atom,
    state:executionState,
    base_state:base.execution_state,
    physical_execution:physical,
    physical_execution_used:Boolean(physical),
    physical_target_engines:physical?.target_engines || [],
    generated_file_count:physical?.generated_file_count || 0,
    scope_hydrated:base.scope_hydrated,
    scope_hydration_required:base.scope_hydration_required,
    fallback:base.fallback?.used || false,
    paid_ai_used:false,
    additional_subscription_eur:0,
    prod_authorized:false,
    prod_write_authorized:false,
    trading_access:false
  });
}

async function main() {
  const args = Object.fromEntries(process.argv.slice(2).map(arg => {
    const [k,v='true'] = arg.replace(/^--/,'').split('='); return [k,v];
  }));
  const result = routeMissionRealWorkV1({ lane:args.lane, cycle:args.cycle, fallback:args.fallback !== 'false' });
  console.log(JSON.stringify(result));
}

const self = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (self) main().catch(error => { console.error(String(error?.stack || error)); process.exitCode=1; });
