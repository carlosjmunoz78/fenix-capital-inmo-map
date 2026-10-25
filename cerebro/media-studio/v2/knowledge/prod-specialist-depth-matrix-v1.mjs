import {materializeProdSpecialistEnrichment} from './prod-specialist-enrichment-v1.mjs';

const SECTIONS=Object.freeze(['professional_standards','canonical_workflows','tools_and_models','research_and_papers','case_studies','benchmarks','rights_and_licenses','failure_modes','quality_metrics','cost_latency_compute','interoperability','future_watch']);
const freeze=(v)=>Object.freeze(v);

function cell(role,section){
  const sources=role.verified_sources??[];
  const sourceUris=role.verified_source_uris??[];
  const knowledge=role.verified_knowledge_points??[];
  const reusable=role.reusable_cerebro_skills??[];
  const candidates=role.benchmark_candidate_skills??[];
  const held=role.held_or_reference_skills??[];
  const gaps=role.known_capability_gaps??[];
  let evidence=[];let status='RESEARCH_REQUIRED';let queries=[];
  switch(section){
    case 'professional_standards':
      evidence=[...sources];status=sources.length>=2?'SEEDED_VERIFIED':'RESEARCH_REQUIRED';
      queries=[`${role.role_name} current professional standards specifications recommended practice`];break;
    case 'canonical_workflows':
      evidence=knowledge.slice(0,12);status=knowledge.length>=6?'SEEDED_VERIFIED':'RESEARCH_REQUIRED';
      queries=[`${role.role_name} professional production workflow pipeline best practices`];break;
    case 'tools_and_models':
      evidence=[...reusable.map(x=>`${x.skill_id}:${x.status}`),...candidates.map(x=>`${x.skill_id}:${x.status}`),...held.map(x=>`${x.skill_id}:${x.status}`)];status=evidence.length?'SEEDED_MIXED_REVIEW_REQUIRED':'RESEARCH_REQUIRED';
      queries=[`${role.role_name} best open source tools models 2026 production benchmark`,`latest ${role.role_name} software release production pipeline`];break;
    case 'research_and_papers':
      evidence=[];status='ACTIVE_RESEARCH_REQUIRED';queries=[`${role.role_name} 2026 research paper state of the art`,`site:arxiv.org ${role.role_name} 2026`,`site:openaccess.thecvf.com ${role.role_name}`];break;
    case 'case_studies':
      evidence=[];status='ACTIVE_RESEARCH_REQUIRED';queries=[`${role.role_name} studio production case study postmortem making of`,`Hollywood ${role.role_name} technical case study`];break;
    case 'benchmarks':
      evidence=candidates.map(x=>`${x.skill_id}:${x.status}`);status=evidence.length?'BENCHMARK_QUEUE_ACTIVE':'ACTIVE_RESEARCH_REQUIRED';queries=[`${role.role_name} benchmark quality latency consistency evaluation`];break;
    case 'rights_and_licenses':
      evidence=[...sources.map(x=>`SOURCE:${x}`),...held.map(x=>`${x.skill_id}:${x.status}`)];status='LEGAL_LICENSE_REVIEW_CONTINUOUS';queries=[`${role.role_name} copyright licensing performer rights model license dataset license 2026`];break;
    case 'failure_modes':
      evidence=knowledge.filter(x=>/fail|avoid|quality|shadow|compression|mismatch|safety|diagnos|error|risk/i.test(x));status=evidence.length?'SEEDED_RESEARCH_CONTINUES':'ACTIVE_RESEARCH_REQUIRED';queries=[`${role.role_name} failure modes artifacts production incidents troubleshooting`];break;
    case 'quality_metrics':
      evidence=knowledge.filter(x=>/quality|metric|retention|similarity|contrast|loudness|intelligibility|consistency|accuracy|latency/i.test(x));status=evidence.length?'SEEDED_RESEARCH_CONTINUES':'ACTIVE_RESEARCH_REQUIRED';queries=[`${role.role_name} objective perceptual quality metrics professional acceptance criteria`];break;
    case 'cost_latency_compute':
      evidence=[...reusable.map(x=>`${x.skill_id}:reuse`),...candidates.map(x=>`${x.skill_id}:benchmark`),...gaps.map(x=>`${x.gap_id}:${x.status}`)];status='ZERO_COST_OPTIMIZATION_ACTIVE';queries=[`${role.role_name} local self hosted compute VRAM latency cost benchmark`];break;
    case 'interoperability':
      evidence=[...sources,...reusable.map(x=>x.skill_id)];status=evidence.length?'SEEDED_RESEARCH_CONTINUES':'ACTIVE_RESEARCH_REQUIRED';queries=[`${role.role_name} interchange standard file format API interoperability pipeline`];break;
    case 'future_watch':
      evidence=role.learning_horizons??[];status='CONTINUOUS_WATCH_ACTIVE';queries=[`${role.role_name} announced upcoming beta research frontier 2026 2027`];break;
    default: throw new Error(`UNKNOWN_SECTION:${section}`);
  }
  return freeze({
    cell_id:`${role.role_id}:${section}`,
    role_id:role.role_id,department_id:role.department_id,section,
    status,evidence:freeze(evidence),source_uris:freeze(sourceUris),queries:freeze(queries),
    required_pipeline:freeze(['discover','source_verify','rights_license_security','role_fit','benchmark_if_operational','OLD_vs_NEW','tribunal','knowledge_store']),
    auto_promote:false,prod_write_authorized:false,tool_execution_authorized:false,spend_authorized:false,additional_cost_eur:0
  });
}

export function materializeProdSpecialistDepthMatrix(){
  const roles=materializeProdSpecialistEnrichment();
  if(roles.length!==192)throw new Error(`EXPECTED_192_ENRICHED_SPECIALISTS_GOT_${roles.length}`);
  const cells=roles.flatMap(role=>SECTIONS.map(section=>cell(role,section)));
  if(cells.length!==2304)throw new Error(`EXPECTED_2304_KNOWLEDGE_CELLS_GOT_${cells.length}`);
  return freeze({
    schema_version:'1.0.0',state_type:'CEREBRO_UMS_PROD_SPECIALIST_DEPTH_MATRIX_V1',company_id:'GLOBAL',engine_id:'UMS-001',environment:'PROD_KNOWLEDGE_WITH_GOVERNED_RESEARCH',version:'1.0.0',
    specialists:192,sections_per_specialist:12,total_cells:cells.length,sections:SECTIONS,cells:freeze(cells),
    completed_mastery_cells:0,
    rule:'A seeded cell is useful knowledge, not mastery. Research continues until evidence, applicability and benchmark requirements for that cell are satisfied.',
    prod_knowledge_active:true,prod_execution_authorized:false,knowledge_auto_promotion:false,additional_cost_eur:0
  });
}

export function prodSpecialistDepthSummary(){
  const matrix=materializeProdSpecialistDepthMatrix();
  const counts={};for(const c of matrix.cells)counts[c.status]=(counts[c.status]??0)+1;
  return freeze({specialists:matrix.specialists,total_cells:matrix.total_cells,status_counts:freeze(counts),cells_with_evidence:matrix.cells.filter(c=>c.evidence.length>0).length,cells_with_active_queries:matrix.cells.filter(c=>c.queries.length>0).length,mastery_cells:matrix.completed_mastery_cells,additional_cost_eur:0});
}

if(process.argv[1]&&process.argv[1].endsWith('prod-specialist-depth-matrix-v1.mjs'))process.stdout.write(`${JSON.stringify(process.argv.includes('--summary')?prodSpecialistDepthSummary():materializeProdSpecialistDepthMatrix(),null,2)}\n`);
