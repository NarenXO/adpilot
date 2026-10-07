import json
import requests
from typing import Tuple, List

from backend.contracts import Incident, Diagnosis, EvidenceItem
from backend.contracts.enums import Cause
from backend.investigator.trace import AgentStep, AgentTrace
from backend.investigator.playbook import diagnose_from_playbook
from backend.investigator import tools

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

def investigate(incident: Incident, max_steps: int = 4, ollama_url: str = "http://localhost:11434") -> Tuple[List[EvidenceItem], Diagnosis, List[AgentStep]]:
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
                    cause=cause,
                    source="agent",
                    evidence_ids=evidence_ids,
                    explanation=explanation
                )
                # Guardian logic isn't defined in our mock Diagnosis, wait, let's see, no guardian field.
                # If guardian is needed we can add it, but our mock Diagnosis doesn't have it.
                return evidence_list, diagnosis, trace.to_list()
            else:
                raise ValueError(f"Unknown action: {action}")
                
        # Max steps reached without finish
        trace.add_step(max_steps + 1, "synthesize", {}, "Max steps reached without finish")
        diagnosis = Diagnosis(
            cause=Cause.UNKNOWN,
            source="agent",
            evidence_ids=[e.id for e in evidence_list],
            explanation="Max steps reached without conclusive diagnosis."
        )
        return evidence_list, diagnosis, trace.to_list()
        
    except Exception as e:
        # Fallback to playbook
        trace.add_step(0, "playbook_fallback", {}, f"Delegated to deterministic playbook fallback due to LLM error/timeout: {e}")
        playbook_evidence, playbook_diagnosis = diagnose_from_playbook(incident)
        return playbook_evidence, playbook_diagnosis, trace.to_list()
