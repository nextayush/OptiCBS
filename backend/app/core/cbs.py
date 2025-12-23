# backend/app/core/cbs.py
import heapq
import copy
from typing import List, Tuple, Optional, Dict
from dataclasses import dataclass, field
from .node import Constraint, PathResult
from .conflict import detect_conflict, Conflict
from .low_level import space_time_astar
from ..utils.grid import Grid

@dataclass(order=True)
class CTNode:
    cost: int
    constraints: List[Constraint] = field(compare=False)
    paths: List[List[Tuple[int, int, int]]] = field(compare=False) # Updated to (x, y, dir)
    
    def __init__(self, constraints, paths):
        self.constraints = constraints
        self.paths = paths
        self.cost = sum(len(p) - 1 for p in paths) 

class CBSSolver:
    def __init__(self, grid: Grid):
        self.grid = grid

    def solve(self, starts: List[Tuple[int, int, int]], goals: List[Tuple[int, int]]) -> Optional[List[List[Tuple[int, int, int]]]]:
        num_agents = len(starts)
        
        # 1. Root Initialization
        root_paths = []
        for i in range(num_agents):
            # FIX: Added current_battery=100
            path_res = space_time_astar(
                self.grid, 
                starts[i], 
                goals[i], 
                [], 
                i, 
                current_battery=100 
            )
            if path_res is None:
                return None 
            root_paths.append(path_res.path)
            
        root = CTNode(constraints=[], paths=root_paths)
        
        open_list = []
        heapq.heappush(open_list, root)
        
        while open_list:
            curr_node = heapq.heappop(open_list)
            
            # 2. Conflict Validation
            conflict = detect_conflict(curr_node.paths)
            
            if not conflict:
                return curr_node.paths 
            
            # 3. Branching
            constraints_to_add = []
            
            if conflict.type == 'vertex':
                c1 = Constraint(conflict.time, conflict.agent_1, conflict.x, conflict.y, is_vertex=True)
                c2 = Constraint(conflict.time, conflict.agent_2, conflict.x, conflict.y, is_vertex=True)
                constraints_to_add = [c1, c2]
                
            elif conflict.type == 'edge':
                c1 = Constraint(conflict.time, conflict.agent_1, conflict.x, conflict.y, 
                                next_x=conflict.next_x, next_y=conflict.next_y, is_vertex=False)
                c2 = Constraint(conflict.time, conflict.agent_2, conflict.next_x, conflict.next_y,
                                next_x=conflict.x, next_y=conflict.y, is_vertex=False)
                constraints_to_add = [c1, c2]

            for constraint in constraints_to_add:
                new_constraints = curr_node.constraints + [constraint]
                new_paths = copy.deepcopy(curr_node.paths)
                agent_id = constraint.agent_id
                
                # FIX: Added current_battery=100 here as well
                path_res = space_time_astar(
                    self.grid, 
                    starts[agent_id], 
                    goals[agent_id], 
                    new_constraints, 
                    agent_id,
                    current_battery=100
                )
                
                if path_res:
                    new_paths[agent_id] = path_res.path
                    child_node = CTNode(new_constraints, new_paths)
                    heapq.heappush(open_list, child_node)
                    
        return None