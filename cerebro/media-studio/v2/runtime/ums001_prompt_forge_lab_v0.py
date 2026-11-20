#!/usr/bin/env python3
"""UMS-001 Prompt Factory V0: deterministic original photo prompts, no LLM API.
Design input = structured social brief, quality rules, and scored feedback.
Prompts are NOT an image quality guarantee. Model Router can later select an
optional trusted local OSS LLM or low-cost external API for creative improvement.
LAB only; NEVER publishes, writes credentials or submits Replicate predictions.
"""
from __future__ import annotations
from collections import Counter
from hashlib import sha256
from pathlib import Path
from typing import Any
import argparse
import json
import re
import unicodedata

FACTORY_VERSION="UMS001-PROMPT-FORGE-V0.2"
MODEL_ID="black-forest-labs/flux-1.1-pro-ultra"
VALID_FORMATS={"IMAGE","CAROUSEL","SEO_HERO"}
VALID_CHANNELS={"INSTAGRAM","FACEBOOK","LINKEDIN","SEO"}
LENSES=("35mm editorial lens","50mm full-frame cinema lens","85mm documentary portrait lens",
        "40mm fashion editorial lens","65mm natural-perspective lens","50mm high-end advertising lens")
ENVIRONMENTS=("sunlit whitewashed Andalusian courtyard","warm Spanish modern office with authentic sunlight",
 "working Cordoban artisan studio and pale limestone architecture","quiet contemporary Andalusian home interior",
 "luminous local neighborhood terrace in southern Spain","elegant professional consultation studio in Córdoba")
SURREAL_MOTIFS=("suspended translucent amber architectural ribbons",
 "glowing orange ceramic home sculptures balanced like a gallery installation",
 "copper-and-glass orbital arches forming an impossible home doorway",
 "luminous kinetic orange geometric installation with deep physical shadows",
 "intricate frozen-in-time glass and brass components forming a residential metaphor",
 "art-gallery sculptures made from bright orange polished glass and metal keys")
GAITS={
 "FACE_OCCLUSION":"Faces and all eyes completely unobstructed by every object, no visual effects crossing faces, subjects large in unobstructed foreground.",
 "ILLEGIBLE_TEXT":"No paper, documents, books, printed items, lettering surfaces, official identification graphics, labels or typographic elements anywhere in the generated image.",
 "DARK_MUDDY":"Clear warm daylight, bright premium contrast, rich orange highlights and clean Mediterranean whites, no dark muddy brown grading.",
 "REPEATED_SCENE":"Different art installation, lens, model and setting from every other frame of the campaign.",
 "PLASTIC_PEOPLE":"Documentary believable skin pores, fine hairs, naturally imperfect facial expressions, human hand anatomy, never 3D or heavily retouched faces.",
 "BRAND_FABRICATED":"No AI-generated logo or wordmark; composite the authenticated original branding separately after generation.",
 "OVERLAY_CONFLICT":"Keep the bottom 25 percent open and calm for a deterministic short headline; avoid faces or hero props under the overlay.",
 "HUMAN_MISSING":"MUST show real people as the clear primary subject: waist-up close-medium portrait, faces and shoulders clearly visible and taking over half the frame. Absolutely not an empty patio, still-life, architecture-only or product photo.",
 "SURREAL_WEAK":"Monumental, breathtaking art-gallery-scale surreal architecture behind the people, vibrant orange sculptural spectacle with plausible shadows; NEVER a small hanging keychain as the entire visual hook.",
 "SCENE_GENERIC":"Extraordinary, immediately striking premium Andalusian commercial advertising composition; no conventional catalog still-life or empty generic courtyard.",
}
def slug(x):
 return " ".join(re.findall(r"[a-z0-9]+",unicodedata.normalize("NFKD",str(x).lower()).encode("ascii","ignore").decode()))
def require_text(d,k,max_chars=230):
 v=d.get(k)
 if not isinstance(v,str) or len(v.strip())<5 or len(v)>max_chars:
  raise ValueError("PROMPT_FACTORY_INVALID_"+k)
 if re.search(r"https?://|r8_[a-z0-9]+|(?:password|api.?key|token)\\s*[:=]",v,re.I):
  raise ValueError("PROMPT_FACTORY_UNTRUSTED_"+k)
 return " ".join(v.strip().split())
def hashtext(t):return sha256(t.encode("utf-8")).hexdigest()
def build_prompt_batch(brief:dict, feedback:dict|None=None)->dict:
 if not isinstance(brief,dict) or not isinstance(feedback or {},dict):
  raise ValueError("PROMPT_FACTORY_INVALID_INPUT")
 expected_scope=("fenix","UMS-001","LAB")
 if (brief.get("company_id"),brief.get("engine_id"),brief.get("environment"))!=expected_scope:
  raise ValueError("PROMPT_FACTORY_SCOPE_DENIED")
 if brief.get("platform") not in VALID_CHANNELS or brief.get("asset_type") not in VALID_FORMATS:
  raise ValueError("PROMPT_FACTORY_CHANNEL_DENIED")
 if brief["platform"]=="SEO" and brief["asset_type"]!="SEO_HERO":
  raise ValueError("PROMPT_FACTORY_SEO_FORMAT_DENIED")
 if brief["platform"]!="SEO" and brief["asset_type"]=="SEO_HERO":
  raise ValueError("PROMPT_FACTORY_SOCIAL_FORMAT_DENIED")
 if brief.get("publish_enabled") is not False or brief.get("max_additional_cost_eur")!=0:
  raise ValueError("PROMPT_FACTORY_CANNOT_PUBLISH_OR_SPEND")
 request_id=require_text(brief,"request_id",120)
 content_id=require_text(brief,"content_id",100)
 intent=require_text(brief,"topic",230)
 audience=require_text(brief,"audience",200)
 panels=brief.get("panels")
 if not isinstance(panels,list) or not 1<=len(panels)<=10:
  raise ValueError("PROMPT_FACTORY_PANELS_COUNT")
 if brief["asset_type"]=="CAROUSEL" and len(panels)<2:raise ValueError("PROMPT_FACTORY_CAROUSEL_TOO_SHORT")
 lessons=set(feedback.get("quality_defects",[]))
 if any(x not in GAITS for x in lessons):
  raise ValueError("PROMPT_FACTORY_UNKNOWN_QA_SIGNAL")
 if feedback and (feedback.get("company_id"),feedback.get("engine_id"))!=("fenix","UMS-001"):
  raise ValueError("PROMPT_FACTORY_QA_SCOPE_DENIED")
 if feedback and feedback.get("content_id")!=content_id:
  raise ValueError("PROMPT_FACTORY_QA_CONTENT_MISMATCH")
 seen_ids=set();signatures=set();out=[]
 for i,part in enumerate(panels):
  if not isinstance(part,dict):raise ValueError("PROMPT_FACTORY_BAD_PANEL")
  panel_id=require_text(part,"panel_id",100)
  human_role=require_text(part,"subject_profession",160)
  action=require_text(part,"human_action",160)
  setting=require_text(part,"scene_context",180)
  surreal=require_text(part,"surreal_symbolism",170)
  specific_message=require_text(part,"educational_focus",190)
  expression=require_text(part,"mood",95)
  combo=(slug(human_role),slug(setting),slug(surreal))
  if panel_id in seen_ids or combo in signatures:
   raise ValueError("PROMPT_FACTORY_DUPLICATE_PANEL")
  seen_ids.add(panel_id);signatures.add(combo)
  seed=int(hashtext(request_id+":"+panel_id)[:8],16)
  lens=LENSES[(seed+i)%len(LENSES)]
  motif=SURREAL_MOTIFS[(seed//13+i)%len(SURREAL_MOTIFS)]
  location=ENVIRONMENTS[(seed//31+i)%len(ENVIRONMENTS)]
  visual=[
    "CRITICAL CAST AND LAYOUT: The MAIN SUBJECT is the HUMAN. Show clearly visible authentic adult people in the LEFT/CENTER foreground in a waist-up medium portrait; faces and natural expressions occupy at least half the image height. Human eyes and hands clearly visible, no still-life, NO empty scene, NO house-only product photo.",
    "CRITICAL SPECTACLE: Behind and around the people construct a vast astonishing physical surreal cinematic art installation. The human remains more visually important than the sculpture; spectacular orange kinetic architecture and dramatic natural light.",
    f"Visual story for: {intent}. Intended audience: {audience}.",
    f"Single original {brief['platform'].title()} {brief['asset_type'].lower()} visual, shot as expensive, real editorial PHOTOGRAPH, not a 3D illustration.",
    f"Authentic human protagonist: an adult Spanish professional working in Andalusia, specifically {human_role}, {action}; expression and emotional tone: {expression}.",
    f"Original location and story: {setting}. Contextual environment, where suitable: {location}.",
    f"Purposeful SURREAL symbolic artwork: {surreal}. Frame as {motif}, detailed contemporary art gallery craft, surprising yet physically coherent.",
    f"Meaning and visual narrative: {specific_message}; convey it with objects and human emotion, not with written captions in the image.",
    f"Art direction: bright natural Mediterranean lighting, vivid original Fénix-inspired orange #FF5F00 as dominant CAMPAIGN ACCENT, warm yellow-gold #FFB71B highlights, cream and charcoal, minimal additional purple.",
    f"Camera: {lens}, high-end cinematic film color grading, grounded shadows, elegant visual depth, professional advertising composition.",
    "Real skin microtextures and plausible hands, natural asymmetry. Large, immediately recognizable human faces with eyes visible and no object blocking their view.",
    "Image-model output must contain ZERO typography, ZERO fake lettering, ZERO watermarks, ZERO fabricated Fénix logos, no UI buttons, no official seals or identifiable legal documents.",
    "The exact original Mr Bogart Fénix brand mark will be SHA-verified and composited afterward by a deterministic graphic pipeline. Never generate or recolor a logo.",
    "No guarantee of mortgage approval, no misleading financial claim, no fake bank endorsements.",
  ]
  if brief["asset_type"]!="SEO_HERO":
   visual.append("Reserve a low-detail zone in the bottom 25 percent for one legible short curiosity hook, added by the compositor later.")
  else:
   visual.append("SEO hero photo must have no lettering and no logos in the final pixels. Alt text and title belong in HTML, outside this image.")
  for signal in sorted(lessons):
   visual.append("Learned correction ("+signal+"): "+GAITS[signal])
  prompt=" ".join(visual)
  if not 900<=len(prompt)<=4800:raise ValueError("PROMPT_FACTORY_PROMPT_LENGTH_OUT_OF_RANGE")
  out.append({"concept_id":panel_id,"model_id":MODEL_ID,"text":prompt,
     "prompt_sha256":hashtext(prompt),"rendered_by":"CEREBRO_DETERMINISTIC_RULE_ENGINE",
     "camera":lens,"art_motif":motif,"qa_defects_addressed":sorted(lessons),
     "safety":{"no_model_logo":True,"no_model_text":True,"social_publish":False},
     "evaluation":"INDEPENDENT_VISUAL_QA_PENDING"})
 if len(set(x["prompt_sha256"] for x in out))!=len(out):
  raise ValueError("PROMPT_FACTORY_COLLISION")
 return {"schema_version":1,"engine_id":"UMS-001","company_id":"fenix","environment":"LAB",
    "request_id":request_id,"content_id":content_id,"platform":brief["platform"],"asset_type":brief["asset_type"],
    "generator":FACTORY_VERSION,"model_router":"DETERMINISTIC_RULE_ENGINE",
    "deepseek_api_called":False,"llm_api_calls":0,"replicate_api_calls":0,"estimated_additional_cost_eur":0,
    "creative_quality_guaranteed":False,"learning_signals_applied":sorted(lessons),
    "reference_policy":"Use only approved, CLEAN, SHA-checked visual sources; never use images with fake documents/lettering as guidance.",
    "prompt_count":len(out),"prompts":out,"publish_enabled":False,
    "next_gate":"Independent review, then FINOPS, secure Replicate prediction and brand postcomposition."}

def main():
 p=argparse.ArgumentParser()
 p.add_argument("--brief",required=True);p.add_argument("--feedback",required=True);p.add_argument("--out",required=True)
 a=p.parse_args()
 doc=build_prompt_batch(json.loads(Path(a.brief).read_text()),json.loads(Path(a.feedback).read_text()))
 dest=Path(a.out);dest.parent.mkdir(parents=True,exist_ok=True)
 dest.write_text(json.dumps(doc,ensure_ascii=False,indent=2)+"\n")
 print("UMS001_PROMPT_FORGE_GENERATED="+str(doc["prompt_count"]))
 print("UMS001_PROMPT_FORGE_API_SPEND_EUR=0")
 print("UMS001_PROMPT_FORGE_QA_PENDING=true")
if __name__=="__main__":main()
