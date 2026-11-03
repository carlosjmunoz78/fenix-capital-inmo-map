from __future__ import annotations
import hashlib, json, os, re, subprocess, tempfile
from dataclasses import dataclass, asdict
from pathlib import Path
from typing import Any

ALLOWED_ENVIRONMENTS={"LAB","PREPROD"}
REQUIRED_SCOPE=("company_id","engine_id","environment","version")


def _scope(meta:dict[str,Any])->dict[str,str]:
    out={k:str(meta.get(k,"" )).strip() for k in REQUIRED_SCOPE}
    if any(not v for v in out.values()): raise ValueError("DOC_SCOPE_REQUIRED")
    if out["environment"] not in ALLOWED_ENVIRONMENTS: raise ValueError("DOC_PROD_WRITE_DENIED")
    return out

def sha256_file(path:Path)->str:
    h=hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda:f.read(1024*1024),b""): h.update(chunk)
    return h.hexdigest()

@dataclass(frozen=True)
class QualityResult:
    readable:bool
    page_count:int
    image_width:int|None
    image_height:int|None
    blur_variance:float|None
    needs_recovery:bool
    reasons:list[str]

class Doc003QualityGate:
    def inspect_image(self,path:Path)->QualityResult:
        from PIL import Image
        import cv2, numpy as np
        img=Image.open(path).convert("L")
        arr=np.array(img)
        blur=float(cv2.Laplacian(arr,cv2.CV_64F).var())
        reasons=[]
        if img.width<300 or img.height<300: reasons.append("LOW_RESOLUTION")
        if blur<20: reasons.append("POSSIBLE_BLUR")
        return QualityResult(not reasons,1,img.width,img.height,blur,bool(reasons),reasons)
    def inspect_pdf(self,path:Path)->QualityResult:
        from pypdf import PdfReader
        reader=PdfReader(str(path));reasons=[]
        if len(reader.pages)==0: reasons.append("NO_PAGES")
        return QualityResult(not reasons,len(reader.pages),None,None,None,bool(reasons),reasons)
    def recover_pdf_ocr(self,source:Path,target:Path)->dict[str,Any]:
        cmd=["ocrmypdf","--skip-text","--deskew","--clean-final","--output-type","pdf",str(source),str(target)]
        p=subprocess.run(cmd,capture_output=True,text=True,timeout=120)
        return {"ok":p.returncode==0,"returncode":p.returncode,"stderr_tail":p.stderr[-1000:],"source_sha256":sha256_file(source),"target_sha256":sha256_file(target) if target.exists() else None,"non_destructive":source.exists()}

class Doc001Pipeline:
    FAMILY_RULES={
      "IDENTITY":re.compile(r"\b(dni|nie|pasaporte|identity)\b",re.I),
      "INCOME":re.compile(r"\b(nomina|nómina|payroll|salary|ingresos)\b",re.I),
      "BANK":re.compile(r"\b(banco|bank|iban|extracto)\b",re.I),
      "PROPERTY":re.compile(r"\b(nota simple|registro|property|vivienda)\b",re.I),
    }
    def __init__(self): self.quality=Doc003QualityGate()
    def extract_pdf_text(self,path:Path)->str:
        from pypdf import PdfReader
        return "\n".join((p.extract_text() or "") for p in PdfReader(str(path)).pages).strip()
    def classify(self,text:str)->dict[str,Any]:
        matches=[name for name,rx in self.FAMILY_RULES.items() if rx.search(text or "")]
        return {"family":matches[0] if len(matches)==1 else ("AMBIGUOUS" if len(matches)>1 else "UNKNOWN"),"matches":matches,"confidence":1.0 if len(matches)==1 else (0.5 if matches else 0.0)}
    def process(self,path:Path,meta:dict[str,Any])->dict[str,Any]:
        scope=_scope(meta);source_hash=sha256_file(path);quality=self.quality.inspect_pdf(path) if path.suffix.lower()==".pdf" else self.quality.inspect_image(path)
        text="";fallback=None
        if path.suffix.lower()==".pdf": text=self.extract_pdf_text(path)
        if not text and path.suffix.lower()==".pdf":
            with tempfile.TemporaryDirectory() as td:
                recovered=Path(td)/"recovered.pdf";fallback=self.quality.recover_pdf_ocr(path,recovered)
                if fallback["ok"]: text=self.extract_pdf_text(recovered)
        classification=self.classify(text)
        return {**scope,"document_sha256":source_hash,"quality":asdict(quality),"text":text,"classification":classification,"fallback":fallback,"safe_fallback":True,"source_modified":False,"prod_write_authorized":False,"additional_cost_eur":0}

class Doc002PendingLifecycle:
    VALID={"MISSING","REQUESTED","REMINDER_DUE","RECEIVED","CLASSIFIED","VALIDATED","CLOSED"}
    NEXT={"MISSING":{"REQUESTED"},"REQUESTED":{"REMINDER_DUE","RECEIVED"},"REMINDER_DUE":{"RECEIVED","REMINDER_DUE"},"RECEIVED":{"CLASSIFIED"},"CLASSIFIED":{"VALIDATED"},"VALIDATED":{"CLOSED"},"CLOSED":set()}
    def __init__(self,company_id:str,document_key:str): self.company_id=company_id;self.document_key=document_key;self.state="MISSING";self.events=[]
    def move(self,new_state:str,evidence:str):
        if new_state not in self.VALID or new_state not in self.NEXT[self.state]: raise ValueError(f"DOC002_INVALID_TRANSITION:{self.state}->{new_state}")
        if not str(evidence).strip(): raise ValueError("DOC002_EVIDENCE_REQUIRED")
        self.events.append({"from":self.state,"to":new_state,"evidence":evidence});self.state=new_state;return self.state

class Doc004AnomalyEngine:
    def score(self,current:dict[str,Any],known_hashes:set[str]|None=None)->dict[str,Any]:
        known_hashes=known_hashes or set();score=0;signals=[]
        if current.get("document_sha256") in known_hashes: score+=30;signals.append("DUPLICATE_HASH")
        q=current.get("quality") or {}
        if q.get("needs_recovery"): score+=15;signals.append("QUALITY_RECOVERY_USED_OR_NEEDED")
        cls=current.get("classification") or {}
        if cls.get("family") in {"UNKNOWN","AMBIGUOUS"}: score+=10;signals.append("CLASSIFICATION_UNCERTAIN")
        text=current.get("text") or ""
        if re.search(r"\b(editado|modified|photoshop)\b",text,re.I): score+=25;signals.append("ALTERATION_TERM_HEURISTIC")
        level="HIGH" if score>=50 else ("MEDIUM" if score>=20 else "LOW")
        return {"score":score,"risk_level":level,"signals":signals,"accusation":False,"human_exception":"HIGH_RISK" if level=="HIGH" else None,"evidence_only":True}

CONTRACT={
 "DOC-001":{"local_first":True,"classification":True,"extraction":True,"metadata":True,"family_contracts":True,"safe_fallback":True},
 "DOC-002":{"lifecycle":["MISSING","REQUESTED","REMINDER_DUE","RECEIVED","CLASSIFIED","VALIDATED","CLOSED"],"deterministic_rules":True},
 "DOC-003":{"opencv":True,"pillow":True,"ocrmypdf":True,"non_destructive_recovery":True},
 "DOC-004":{"deterministic_anomaly_checks":True,"evidence_scoring":True,"automatic_accusation":False,"high_risk_escalation":True},
 "prod_write_authorized":False,"trading_access":False,"additional_cost_eur":0
}
