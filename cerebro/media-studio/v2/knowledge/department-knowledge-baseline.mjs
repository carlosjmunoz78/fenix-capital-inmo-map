import { loadSourceRegistry } from '../registry/role-registry.mjs';

const CRITICAL={
  D09:['identity registry','character canon','likeness consistency','wardrobe/hair/makeup continuity','identity versioning','rights provenance'],
  D10:['face reconstruction','body reconstruction','digital doubles','skin/hair appearance','age transformation','cross-shot consistency','digital human QC'],
  D11:['voice casting','authorized voice cloning','TTS','voice conversion','ADR/dubbing','prosody/emotion','pronunciation','multilingual speech','singing voice','voice consistency'],
  D12:['performance direction','pose/motion capture','motion transfer','gesture/mannerism','gait/body language','facial performance','eyeline/blocking','performance continuity'],
  D13:['camera systems','sensor/image pipeline','lenses/FOV','exposure','focus/DOF','high-speed capture','metadata/color science'],
  D14:['lighting design','grip/rigging','practicals','HDRI/light capture','reflection/shadow','stage calibration','lighting continuity'],
  D21:['directing','blocking','shot design','coverage','scene rhythm','visual storytelling','second unit','continuity'],
  D22:['cinematography','framing/composition','camera movement','virtual camera','lens language','shot matching'],
  D23:['picture editorial','continuity editing','pacing/rhythm','multicam','conform','versioning','editorial QC'],
  D28:['VFX supervision','pyro/smoke/fire','fluids','destruction/particles','keying','roto/paint','compositing','VFX QC'],
  D33:['production sound','dialogue capture','ADR','dialogue editing','noise cleanup','room tone','sync/timecode'],
  D34:['sound design','Foley','SFX libraries','procedural SFX','impacts/whooshes','creature/environment sound','sync to picture'],
  D35:['composition','songwriting','melody','harmony','arrangement','orchestration','leitmotif','score to picture'],
  D36:['singing voice','vocal performance','instrument/timbre','stem generation','music production','tempo/beat','music QC'],
  D37:['re-recording mix','music mix','dialogue mix','spatial audio','binaural/ambisonics','immersive adaptation','loudness','mastering'],
  D38:['color grading','ACES/OCIO','DI conform','HDR/SDR trim','looks/LUTs','film emulation','image finishing','color QC'],
  D40:['mastering','codec/container','DCP','IMF','OTT/broadcast','platform delivery','checksums','archive master'],
  D41:['OpenXR','VR scene','AR placement','MR interaction','spatial UI','stereo/6DoF','XR QC'],
  D42:['volumetric media','point-cloud delivery','light-field rendering','holographic/device adapters','display calibration','spatial QC'],
  D45:['pipeline TD','DCC integration','OpenUSD','OpenTimelineIO','MaterialX/OpenVDB','automation','environment/package interoperability'],
  D46:['asset management','version control','dailies/review','shot/task tracking','C2PA/provenance','metadata','archive','asset integrity'],
  D47:['render scheduling','capacity planning','GPU/CPU routing','storage/cache','network/egress','cloud/local broker','FinOps'],
  D48:['model/tool scouting','model routing','evaluation','dataset curation','personalization/adapters','synthetic media research','learning loop','capability promotion']
};

const COMMON=['professional terminology','professional workflow','quality gates','failure analysis','rights/licensing','provenance','cost/latency','interoperability','rebuild/rollback','current tools and research'];
const SOURCES=['OpenUSD','OpenTimelineIO','OpenColorIO','ACES','OpenEXR','MaterialX','OpenVDB','OpenCue','OpenXR','MPEG immersive formats','C2PA','MovieLabs OMC/CSAP','IMF/DCP','FFmpeg','Dolby professional guidance'];

export function departmentKnowledgeBaseline(department_id){
  const r=loadSourceRegistry(); const d=r.departments.find(x=>x.id===department_id);
  if(!d) throw new Error(`UNKNOWN_DEPARTMENT:${department_id}`);
  return {department_id,name:d.name,topics:[...(CRITICAL[department_id]||[]),...COMMON],source_families:[...SOURCES],quality_level:'PROFESSIONAL_STUDIO_BASELINE',daily_refresh_required:true,status:CRITICAL[department_id]?'SEEDED_CRITICAL_BASELINE':'GENERIC_BASELINE_REQUIRES_DEEPENING'};
}

export function allDepartmentKnowledgeBaselines(){return loadSourceRegistry().departments.map(d=>departmentKnowledgeBaseline(d.id));}
