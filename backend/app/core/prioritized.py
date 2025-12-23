# backend/app/core/prioritized.py
from typing import List, Tuple, Optional
from .low_level import space_time_astar
from .node import Constraint
from ..utils.grid import Grid

class PrioritizedPlanner:
    def __init__(self, grid: Grid):
        self.grid = grid

    def solve(self, starts: List[Tuple[int, int, int]], goals: List[Tuple[int, int]]) -> List[List[Tuple[int, int, int]]]:
        """
        Solves paths sequentially.
        Path 0 is planned.
        Path 1 is planned avoiding Path 0.
        Path 2 is planned avoiding Path 0 and Path 1.
        """
        paths = []
        # We need a global table of "reserved cells" (time, x, y) -> boolean
        reserved_table = set() 

        for i in range(len(starts)):
            # 1. Build Constraints from ALL previous paths
            constraints = []
            
            # This is a simplified implementation. 
            # In a full version, we'd optimize this lookup to not be O(N^2)
            # But for 20-50 agents, this is fine.
            for t, x, y in reserved_table:
                # Vertex Constraint: Don't be at (x,y) at time t
                constraints.append(Constraint(t, i, x, y, is_vertex=True))
                
                # We should also add edge constraints if we want to be perfect,
                # but for a "Fast Mode" demo, vertex collision avoidance is usually enough.

            # 2. Plan for current agent
            # We assume battery=100 for this mode
            result = space_time_astar(
                self.grid, 
                starts[i], 
                goals[i], 
                constraints, 
                i,
                current_battery=100,
                max_time=200 # Allow longer paths
            )

            if result:
                paths.append(result.path)
                # Reserve these cells for future agents
                for t, (x, y, dir) in enumerate(result.path):
                    reserved_table.add((t, x, y))
                    # Also reserve the goal for a while after arrival to prevent collisions
                    # (Simplified: reserve for 5 extra steps)
                    if t == len(result.path) - 1:
                         for wait_t in range(1, 10):
                             reserved_table.add((t + wait_t, x, y))
            else:
                # If no path found (e.g. boxed in), just stay put (fail safe)
                # or return empty path
                paths.append([(starts[i][0], starts[i][1], starts[i][2])])
                
        return paths