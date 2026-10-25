import { loadSourceRegistry } from '../registry/role-registry.mjs';

export const REVIEW_ROUTING = {
  D01:{supervisors:['SUP-01','SUP-02','SUP-03'],tribunals:['T12']},
  D02:{supervisors:['SUP-03'],tribunals:['T12']},
  D03:{supervisors:['SUP-02'],tribunals:['T12','T11']},
  D04:{supervisors:['SUP-04'],tribunals:['T10']},
  D05:{supervisors:['SUP-05'],tribunals:['T01','T10']},
  D06:{supervisors:['SUP-06'],tribunals:['T01']},
  D07:{supervisors:['SUP-07'],tribunals:['T01','T02']},
  D08:{supervisors:['SUP-08'],tribunals:['T04','T11']},
  D09:{supervisors:['SUP-09'],tribunals:['T02','T10']},
  D10:{supervisors:['SUP-10'],tribunals:['T02','T05','T10']},
  D11:{supervisors:['SUP-11'],tribunals:['T03','T10']},
  D12:{supervisors:['SUP-12'],tribunals:['T03','T06']},
  D13:{supervisors:['SUP-13'],tribunals:['T04','T09']},
  D14:{supervisors:['SUP-14'],tribunals:['T04']},
  D15:{supervisors:['SUP-15'],tribunals:['T05','T08']},
  D16:{supervisors:['SUP-16'],tribunals:['T08']},
  D17:{supervisors:['SUP-17'],tribunals:['T04','T11']},
  D18:{supervisors:['SUP-18'],tribunals:['T04','T11']},
  D19:{supervisors:['SUP-18'],tribunals:['T04','T11']},
  D20:{supervisors:['SUP-17'],tribunals:['T04','T05']},
  D21:{supervisors:['SUP-19'],tribunals:['T04','T06']},
  D22:{supervisors:['SUP-19'],tribunals:['T04','T06']},
  D23:{supervisors:['SUP-20'],tribunals:['T06','T09']},
  D24:{supervisors:['SUP-20'],tribunals:['T06','T12']},
  D25:{supervisors:['SUP-21'],tribunals:['T05']},
  D26:{supervisors:['SUP-21'],tribunals:['T05','T08']},
  D27:{supervisors:['SUP-21'],tribunals:['T03','T05']},
  D28:{supervisors:['SUP-22'],tribunals:['T05']},
  D29:{supervisors:['SUP-23'],tribunals:['T08','T09']},
  D30:{supervisors:['SUP-12','SUP-23'],tribunals:['T03','T08']},
  D31:{supervisors:['SUP-22','SUP-23'],tribunals:['T05','T08']},
  D32:{supervisors:['SUP-24'],tribunals:['T05','T10']},
  D33:{supervisors:['SUP-25'],tribunals:['T03','T07']},
  D34:{supervisors:['SUP-26'],tribunals:['T07']},
  D35:{supervisors:['SUP-27'],tribunals:['T03','T07']},
  D36:{supervisors:['SUP-27'],tribunals:['T03','T07','T10']},
  D37:{supervisors:['SUP-28'],tribunals:['T07','T09']},
  D38:{supervisors:['SUP-29'],tribunals:['T04','T09']},
  D39:{supervisors:['SUP-29'],tribunals:['T03','T09']},
  D40:{supervisors:['SUP-29'],tribunals:['T09','T12']},
  D41:{supervisors:['SUP-30'],tribunals:['T08','T09']},
  D42:{supervisors:['SUP-30'],tribunals:['T08','T09']},
  D43:{supervisors:['SUP-29','SUP-31'],tribunals:['T07','T09','T12']},
  D44:{supervisors:['SUP-30','SUP-31'],tribunals:['T01','T08','T12']},
  D45:{supervisors:['SUP-31'],tribunals:['T08','T09','T10']},
  D46:{supervisors:['SUP-31','SUP-32'],tribunals:['T09','T10']},
  D47:{supervisors:['SUP-31'],tribunals:['T09','T10']},
  D48:{supervisors:['SUP-32'],tribunals:['T10','T11']},
};

export const GLOBAL_GUARDIANS = ['GRD-04','GRD-05','GRD-06','GRD-09','GRD-10','GRD-11','GRD-12','GRD-13','GRD-14'];
export const REAL_IDENTITY_GUARDIANS = ['GRD-02','GRD-04'];
export const VOICE_IDENTITY_GUARDIANS = ['GRD-03','GRD-04'];

export function buildStaticEdges(){
  const d=loadSourceRegistry();
  const edges=[];
  for(const dept of d.departments){
    edges.push({from:d.studio_brain.id,to:dept.id,type:'ORCHESTRATES'});
    for(const specialist of dept.specialists||[]) edges.push({from:dept.id,to:specialist.id,type:'DELEGATES'});
    const review=REVIEW_ROUTING[dept.id];
    for(const supervisor of review.supervisors) edges.push({from:dept.id,to:supervisor,type:'SUPERVISED_BY'});
    for(const tribunal of review.tribunals) edges.push({from:dept.id,to:tribunal,type:'JUDGED_BY'});
    for(const guardian of GLOBAL_GUARDIANS) edges.push({from:dept.id,to:guardian,type:'GUARDED_BY'});
  }
  return edges;
}

export function requiredGuardiansForJob(job){
  const set=new Set(GLOBAL_GUARDIANS);
  const t=job?.clone_type||'';
  if(['FACE_IDENTITY_RECONSTRUCTION','BODY_IDENTITY_RECONSTRUCTION','VIDEO_TO_PERSISTENT_CHARACTER','DIGITAL_DOUBLE','MOTION_TRANSFER','PERFORMANCE_TRANSFER'].includes(t)) for(const id of REAL_IDENTITY_GUARDIANS)set.add(id);
  if(['VOICE_CLONE','VOICE_CONVERSION','SINGING_VOICE_CLONE'].includes(t)) for(const id of VOICE_IDENTITY_GUARDIANS)set.add(id);
  return [...set];
}
