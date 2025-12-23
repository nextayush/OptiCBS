# backend/app/core/low_level.py
import heapq
from typing import List, Tuple, Optional
from .node import Constraint, PathResult
from ..utils.grid import Grid

# Directions: 0: East, 1: South, 2: West, 3: North
# Deltas match the directions indices
DELTAS = [(1, 0), (0, 1), (-1, 0), (0, -1)]

class State:
    def __init__(self, time: int, x: int, y: int, direction: int, g: int, h: int, parent=None, battery: int = 100):
        self.time = time
        self.x = x
        self.y = y
        self.direction = direction # 0-3
        self.g = g
        self.h = h
        self.parent = parent
        self.battery = battery

    @property
    def f(self):
        return self.g + self.h

    def __lt__(self, other):
        if self.f == other.f:
            return self.g > other.g # Tie-breaker: prefer depth
        return self.f < other.f
    
    def to_pose(self) -> Tuple[int, int, int]:
        return (self.x, self.y, self.direction)

def manhattan_distance(x1, y1, x2, y2):
    return abs(x1 - x2) + abs(y1 - y2)

def is_constrained(curr_x, curr_y, next_x, next_y, next_time, constraints):
    for c in constraints:
        if c.time != next_time:
            continue
        # Vertex Constraint
        if c.is_vertex and c.x == next_x and c.y == next_y:
            return True
        # Edge Constraint (Swapping)
        if not c.is_vertex and c.x == curr_x and c.y == curr_y and c.next_x == next_x and c.next_y == next_y:
            return True
    return False

def space_time_astar(grid: Grid, 
                     start_pose: Tuple[int, int, int], 
                     goal: Tuple[int, int], 
                     constraints: List[Constraint],
                     agent_id: int,
                     current_battery: int,
                     min_battery: int = 10,
                     max_time: int = 300) -> Optional[PathResult]: # <--- CHANGED FROM 100 TO 300
    
    agent_constraints = [c for c in constraints if c.agent_id == agent_id]
    
    open_list = []
    closed_set = set()
    
    start_x, start_y, start_dir = start_pose
    start_h = manhattan_distance(start_x, start_y, goal[0], goal[1])
    
    start_node = State(0, start_x, start_y, start_dir, 0, start_h, battery=current_battery)
    heapq.heappush(open_list, start_node)
    
    best_solution = None

    while open_list:
        curr = heapq.heappop(open_list)
        
        state_key = (curr.time, curr.x, curr.y, curr.direction)
        if state_key in closed_set:
            continue
        closed_set.add(state_key)
        
        # --- Goal Check ---
        # Note: We don't care about final direction at the goal, usually.
        if (curr.x, curr.y) == goal:
            # Check if staying at goal is safe for at least 1 step
            # Real implementation needs 'Safe Interval' check
            return reconstruct_path(curr)

        if curr.time >= max_time or curr.battery <= 0:
            continue

        next_time = curr.time + 1
        next_battery = curr.battery - 1 # Simple drain model

        # --- Generate Actions ---
        
        # 1. WAIT (Cost 1)
        if not is_constrained(curr.x, curr.y, curr.x, curr.y, next_time, agent_constraints):
            heapq.heappush(open_list, State(
                next_time, curr.x, curr.y, curr.direction, 
                curr.g + 1, curr.h, curr, next_battery
            ))

        # 2. ROTATE Left (Cost 1)
        new_dir = (curr.direction - 1) % 4
        if not is_constrained(curr.x, curr.y, curr.x, curr.y, next_time, agent_constraints):
            heapq.heappush(open_list, State(
                next_time, curr.x, curr.y, new_dir, 
                curr.g + 1, curr.h, curr, next_battery
            ))

        # 3. ROTATE Right (Cost 1)
        new_dir = (curr.direction + 1) % 4
        if not is_constrained(curr.x, curr.y, curr.x, curr.y, next_time, agent_constraints):
            heapq.heappush(open_list, State(
                next_time, curr.x, curr.y, new_dir, 
                curr.g + 1, curr.h, curr, next_battery
            ))

        # 4. MOVE FORWARD (Cost 1)
        dx, dy = DELTAS[curr.direction]
        nx, ny = curr.x + dx, curr.y + dy
        
        if grid.in_bounds(nx, ny) and not grid.is_blocked(nx, ny):
            if not is_constrained(curr.x, curr.y, nx, ny, next_time, agent_constraints):
                new_h = manhattan_distance(nx, ny, goal[0], goal[1])
                heapq.heappush(open_list, State(
                    next_time, nx, ny, curr.direction, 
                    curr.g + 1, new_h, curr, next_battery
                ))

    return None

def reconstruct_path(node: State) -> PathResult:
    path = []
    curr = node
    while curr:
        # We now store direction in the path for the frontend!
        path.append((curr.x, curr.y, curr.direction))
        curr = curr.parent
    path.reverse()
    return PathResult(path=path, cost=node.g)