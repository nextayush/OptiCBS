# backend/app/api/schemas.py
from pydantic import BaseModel
from typing import List, Tuple, Union, Optional

class GridRequest(BaseModel):
    width: int
    height: int
    obstacles: List[Tuple[int, int]] = []
    # Allow starts to be (x, y) OR (x, y, direction)
    starts: List[Union[Tuple[int, int, int], Tuple[int, int]]]
    goals: List[Tuple[int, int]]

class PathResponse(BaseModel):
    agent_id: int
    # CRITICAL FIX: Update path to expect 3 integers (x, y, dir)
    path: List[Tuple[int, int, int]] 
    cost: int

class SolutionResponse(BaseModel):
    paths: List[PathResponse]
    total_cost: int
    status: str