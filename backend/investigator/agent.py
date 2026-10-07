import json
import requests
from typing import Tuple, List

from backend.contracts import Incident, Diagnosis, EvidenceItem
from backend.contracts.enums import Cause
import os
from backend.investigator.trace import AgentStep, AgentTrace
from backend.investigator.playbook import diagnose_from_playbook
from backend.investigator import tools
from backend.guardian.verifier import verify

TOOL_REGISTRY = {
    "compare_periods": tools.compare_periods,
    "funnel_breakdown": tools.funnel_breakdown,
    "creative_breakdown": tools.creative_breakdown,
    "inventory_status": tools.inventory_status,
    "price_and_discount_changes": tools.price_and_discount_changes,
    "platform_split": tools.platform_split,
    "tracking_health_check": tools.tracking_health_check,
    "recall_similar_incidents": tools.recall_similar_incidents
}

def load_cache():
    cache_path = os.path.join(os.path.dirname(__file__), "cache.json")
    if os.path.exists(cache_path):
        with open(cache_path, "r") as f:
            return json.load(f)
    return {}

def investigate(incident: Incident, max_steps: int = 4, ollama_url: str = "http://localhost:11434") -> Tuple[List[EvidenceItem], Diagnosis, List[AgentStep]]:
    cache = load_cache()
    if incident.id in cache:
        c = cache[incident.id]
        evidence = [EvidenceItem(**e) for e in c["evidence"]]
        diag_data = c["diagnosis"].copy()
        diag_data["cause"] = Cause[diag_data["cause"]]
        diag_data["source"] = "playbook"
        diag_data["incident_id"] = incident.id
        if "guardian" not in diag_data:
            diag_data["guardian"] = "PASS"
        diagnosis = Diagnosis(**diag_data)
        trace_steps = [AgentStep(**s) for s in c["trace"]]
        
        # Verify the cached diagnosis via Guardian
        verified_diagnosis = verify(diagnosis, evidence)
        return evidence, verified_diagnosis, trace_steps

    trace = AgentTrace()
    evidence_list = []
    
    system_prompt = (
        "You are an AI Investigator. You must output ONLY JSON in one of two formats:\n"
        "1. {\"action\": \"tool_call\", \"tool\": \"<tool_name>\", \"args\": {<kwargs>}}\n"
        "2. {\"action\": \"finish\", \"cause\": \"<CauseEnum>\", \"explanation\": \"<rationale>\", \"evidence_ids\": [\"...\"]}\n"
    )
    
    messages = [
        {"role": "system", "content": system_prompt},
        {"role": "user", "content": f"Investigate incident {incident.id} with metric {incident.metric}."}
    ]

    try:
        for step_idx in range(1, max_steps + 1):
            response = requests.post(
                f"{ollama_url}/api/chat",
                json={
                    "model": "qwen2.5:7b-instruct",
                    "messages": messages,
                    "stream": False,
                    "options": {"temperature": 0}
                },
                timeout=30
            )
            response.raise_for_status()
            
            data = response.json()
            message_content = data.get("message", {}).get("content", "")
            
            try:
                parsed = json.loads(message_content)
            except json.JSONDecodeError:
                raise ValueError("Malformed JSON from LLM")
            
            action = parsed.get("action")
            
            if action == "tool_call":
                tool_name = parsed.get("tool")
                args = parsed.get("args", {})
                
                if tool_name not in TOOL_REGISTRY:
                    raise ValueError(f"Unknown tool: {tool_name}")
                
                tool_fn = TOOL_REGISTRY[tool_name]
                new_evidence = tool_fn(**args)
                evidence_list.extend(new_evidence)
                
                result_summary = f"Generated {len(new_evidence)} evidence items."
                trace.add_step(step_idx, tool_name, args, result_summary)
                
                messages.append({"role": "assistant", "content": message_content})
                messages.append({"role": "user", "content": f"Tool returned {len(new_evidence)} items. IDs: {[e.id for e in new_evidence]}"})
                
            elif action == "finish":
                cause_str = parsed.get("cause", "UNKNOWN")
                try:
                    cause = Cause[cause_str]
                except KeyError:
                    cause = Cause.UNKNOWN
                    
                explanation = parsed.get("explanation", "")
                evidence_ids = parsed.get("evidence_ids", [])
                
                diagnosis = Diagnosis(
                    incident_id=incident.id,
                    cause=cause,
                    source="agent",
                    evidence_ids=evidence_ids,
                    explanation=explanation,
                    guardian="PASS"
                )
                verified_diagnosis = verify(diagnosis, evidence_list)
                return evidence_list, verified_diagnosis, trace.to_list()
            else:
                raise ValueError(f"Unknown action: {action}")
                
        # Max steps reached without finish
        trace.add_step(max_steps + 1, "synthesize", {}, "Max steps reached without finish")
        diagnosis = Diagnosis(
            incident_id=incident.id,
            cause=Cause.UNKNOWN,
            source="agent",
            evidence_ids=[e.id for e in evidence_list],
            explanation="Max steps reached without conclusive diagnosis.",
            guardian="PASS"
        )
        verified_diagnosis = verify(diagnosis, evidence_list)
        return evidence_list, verified_diagnosis, trace.to_list()
        
    except Exception as e:
        # Fallback to playbook
        trace.add_step(0, "playbook_fallback", {}, f"Delegated to deterministic playbook fallback due to LLM error/timeout: {e}")
        playbook_evidence, playbook_diagnosis = diagnose_from_playbook(incident)
        verified_diagnosis = verify(playbook_diagnosis, playbook_evidence)
        return playbook_evidence, verified_diagnosis, trace.to_list()
