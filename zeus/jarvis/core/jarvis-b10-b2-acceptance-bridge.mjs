/** JARVIS B10 CUT02 — reuse canonical B2 cross-device acceptance gate.
 * This module is intentionally unable to authorize, activate, mutate or spend.
 */
import {evaluateB2OperationalAcceptance,B2_EVIDENCE_KEYS} from './jarvis-b2-acceptance-gate.mjs';
import {assessJarvisB10Certification,B10_PHASES} from './jarvis-b10-certification-matrix.mjs';
const denied=(reason,extra={})=>Object.freeze({
 status:'NO_GO',reason,operational:false,prodAuthorized:false,
 prodWriteAuthorized:false,canActivate:false,spentEuro:0,...extra
});
export function evaluateJarvisB10OwnerCrossDeviceAcceptance({
 companyId,targetStage='PERSISTENT_MISSIONS',controlSnapshot,
 certificationEvidence=[],b2Evidence=null,now,version='0.1.0'
}={}){
 const assessment=assessJarvisB10Certification({
  companyId,targetStage,controlSnapshot,evidence:certificationEvidence,now,version
 });
 const stageIndex=B10_PHASES.indexOf(targetStage);
 if(stageIndex<0)return denied('INVALID_STAGE',{b10:assessment});
 if(stageIndex<B10_PHASES.indexOf('PERSISTENT_MISSIONS'))
  return denied('CROSS_DEVICE_GATE_NOT_REQUESTED',{b10:assessment});
 let crossDevice;
 try{crossDevice=evaluateB2OperationalAcceptance({
  evidence:b2Evidence,environment:'PROD'
 });}
 catch{return denied('B2_PROD_OPERATION_EVIDENCE_MISSING',{b10:assessment,
  b2RequiredEvidenceKeys:B2_EVIDENCE_KEYS});}
 if(crossDevice.status!=='EVIDENCE_COMPLETE_PENDING_INDEPENDENT_REVIEW')
  return denied('B2_PROD_CROSS_DEVICE_NOT_VERIFIED',{b10:assessment,
   b2Missing:crossDevice.missing,b2Invalid:crossDevice.invalid});
 if(assessment.evidenceMetadataComplete!==true)
  return denied('B10_CERTIFICATION_MATRIX_INCOMPLETE',{b10:assessment,
   b2Status:crossDevice.status});
 // B2 evidence itself explicitly requires external independent review.
 return denied('INDEPENDENT_TWO_DEVICE_OWNER_TEST_REQUIRED',{b10:assessment,
  b2Status:crossDevice.status,nextGate:'EXTERNAL_OWNER_TWO_DEVICE_PHYSICAL_REVIEW'});
}
