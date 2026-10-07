import time
from dataclasses import dataclass
from typing import Dict, Any, List

@dataclass
class AgentStep:
    step: int
    tool: str
    args: Dict[str, Any]
    result_summary: str

class AgentTrace:
    def __init__(self):
        self.steps: List[AgentStep] = []
        self.start_time: float = time.time()

    def add_step(self, step: int, tool: str, args: Dict[str, Any], result_summary: str):
        self.steps.append(AgentStep(step=step, tool=tool, args=args, result_summary=result_summary))

    def to_list(self) -> List[AgentStep]:
        return self.steps

    def summary(self) -> str:
        duration = time.time() - self.start_time
        return f"Agent completed {len(self.steps)} steps in {duration:.2f} seconds."
