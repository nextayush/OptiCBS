# backend/app/core/conflict.py
from dataclasses import dataclass
from typing import List, Tuple, Optional

@dataclass
class Conflict:
    time: int
    type: str  # 'vertex' or 'edge'
    agent_1: int
    agent_2: int
    x: int
    y: int
    # For edge conflicts:
    next_x: int = -1
    next_y: int = -1

def detect_conflict(paths: List[List[Tuple[int, int]]]) -> Optional[Conflict]:
    """
    Scans the paths of all agents to find the FIRST occurring conflict.
    paths[i] is the path for agent i, which is a list of (x,y) tuples.
    """
    # Determine the maximum path length to iterate through time
    max_t = max(len(p) for p in paths)
    
    # Check for conflicts at every time step t
    for t in range(max_t):
        # 1. Check Vertex Conflicts (Overlaps)
        # We create a map of position -> agent_id for the current time t
        positions = {}
        
        for agent_id, path in enumerate(paths):
            # If agent has finished, it stays at its last position
            pos_t = path[t] if t < len(path) else path[-1]
            
            if pos_t in positions:
                # Conflict Found!
                other_agent = positions[pos_t]
                return Conflict(
                    time=t,
                    type='vertex',
                    agent_1=other_agent,
                    agent_2=agent_id,
                    x=pos_t[0],
                    y=pos_t[1]
                )
            positions[pos_t] = agent_id

        # 2. Check Edge Conflicts (Swapping)
        # Only relevant if t > 0
        if t > 0:
            for agent_i, path_i in enumerate(paths):
                for agent_j, path_j in enumerate(paths):
                    if agent_i >= agent_j: continue # Avoid duplicate checks
                    
                    # Get positions at t-1 and t
                    prev_i = path_i[t-1] if t-1 < len(path_i) else path_i[-1]
                    curr_i = path_i[t]   if t < len(path_i)   else path_i[-1]
                    
                    prev_j = path_j[t-1] if t-1 < len(path_j) else path_j[-1]
                    curr_j = path_j[t]   if t < len(path_j)   else path_j[-1]
                    
                    # Check for swap: i moves u->v, j moves v->u
                    if prev_i == curr_j and curr_i == prev_j:
                        return Conflict(
                            time=t,
                            type='edge',
                            agent_1=agent_i,
                            agent_2=agent_j,
                            x=prev_i[0], y=prev_i[1],      # u
                            next_x=curr_i[0], next_y=curr_i[1] # v
                        )
    
    return None # No conflicts found