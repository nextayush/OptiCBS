# backend/app/core/node.py
from dataclasses import dataclass, field
from typing import List, Dict, Tuple, Set

@dataclass(frozen=True, eq=True)
class Constraint:
    """
    Represents a restriction for a specific agent.
    If is_vertex is True: Agent cannot be at (x, y) at time t.
    If is_vertex is False: Agent cannot move from (x, y) to (next_x, next_y) at time t (Edge constraint).
    """
    time: int
    agent_id: int
    x: int
    y: int
    # For edge constraints:
    next_x: int = -1
    next_y: int = -1
    is_vertex: bool = True

@dataclass
class PathResult:
    path: List[Tuple[int, int]]  # The sequence of coordinates (x, y)
    cost: int