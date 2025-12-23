# backend/app/api/routes.py
from fastapi import APIRouter, HTTPException
from typing import List, Tuple
from ..core.cbs import CBSSolver
from ..core.scheduler import WarehouseManager
from ..utils.grid import Grid
from .schemas import GridRequest, SolutionResponse, PathResponse
from ..core.prioritized import PrioritizedPlanner

router = APIRouter()

# Global Manager for the "Amazon Mode" (Lifelong MAPF)
MANAGER = None 

@router.post("/solve", response_model=SolutionResponse)
async def solve_mapf(request: GridRequest):
    grid = Grid(request.width, request.height, request.obstacles)
    starts_with_dir = [(s[0], s[1], 0) for s in request.starts]
    
    # --- AUTO-SWITCH LOGIC ---
    if len(request.starts) > 3: 
        print(f"Agents: {len(request.starts)} > 3. Using Prioritized Planning.")
        solver = PrioritizedPlanner(grid)
    else:
        # Use Optimal Solver for simple cases (1-3 agents)
        print(f"Agents: {len(request.starts)} <= 3. Using Optimal CBS.")
        solver = CBSSolver(grid)

    raw_paths = solver.solve(starts_with_dir, request.goals)
    
    if raw_paths is None:
        return SolutionResponse(paths=[], total_cost=0, status="Failed")
    
    # 5. Format Response
    formatted_paths = []
    total_cost = 0
    
    for i, path in enumerate(raw_paths):
        # Path comes back as [(x,y,dir), ...]. We send it all to frontend.
        cost = len(path) - 1
        total_cost += cost
        formatted_paths.append(PathResponse(agent_id=i, path=path, cost=cost))
        
    return SolutionResponse(
        paths=formatted_paths, 
        total_cost=total_cost, 
        status="Solved"
    )

# --- Advanced Endpoints (Tier 2/3) ---

@router.post("/initialize")
async def init_warehouse(req: GridRequest):
    global MANAGER
    # Auto-detect shelves (Top rows) and stations (Bottom rows) for demo
    shelves = [(x, y) for x in range(req.width) for y in range(req.height) if y < 2]
    stations = [(x, req.height-1) for x in range(req.width) if x % 2 == 0]
    chargers = [(0, req.height-1), (req.width-1, req.height-1)]
    
    MANAGER = WarehouseManager(req.width, req.height, shelves, stations, chargers)
    return {"status": "Initialized Amazon Mode"}

@router.post("/step")
async def simulation_step(req: GridRequest):
    global MANAGER
    if not MANAGER: 
        return {"error": "Call /initialize first"}
    
    current_starts = []
    current_goals = []
    
    # 1. Sync State
    # Note: In a real app, req.starts would come from the live simulation state
    for i, start_pose in enumerate(req.starts):
        # Ensure start_pose has direction, default to 0 if missing
        x, y = start_pose[0], start_pose[1]
        direction = start_pose[2] if len(start_pose) > 2 else 0
        
        r = MANAGER.update_robot(i, x, y, direction)
        
        # 2. Get Goal from Scheduler
        goal = MANAGER.get_next_goal(i)
        current_starts.append((r.x, r.y, r.direction))
        current_goals.append(goal)
        
    # 3. Solve (Windowed)
    grid = Grid(req.width, req.height, req.obstacles)
    solver = CBSSolver(grid)
    
    # Solve for next 10 steps (Windowed Search)
    # The solver logic needs to support a 'max_horizon' logic ideally, 
    # but standard CBS will just find the full path. We can slice it here.
    paths = solver.solve(current_starts, current_goals)
    
    formatted_paths = []
    if paths:
        for i, path in enumerate(paths):
            # Return full path, frontend handles interpolation
            formatted_paths.append({
                "agent_id": i,
                "path": path, 
                "battery": MANAGER.robots[i].battery,
                "state": MANAGER.robots[i].task_state
            })
    
    return {"paths": formatted_paths, "status": "Running"}