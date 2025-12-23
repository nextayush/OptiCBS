# backend/app/utils/grid.py
from typing import List, Tuple

class Grid:
    def __init__(self, width: int, height: int, obstacles: List[Tuple[int, int]] = None):
        self.width = width
        self.height = height
        # Obstacles is a set of (x, y) tuples for O(1) lookup
        self.obstacles = set(obstacles) if obstacles else set()

    def in_bounds(self, x: int, y: int) -> bool:
        return 0 <= x < self.width and 0 <= y < self.height

    def is_blocked(self, x: int, y: int) -> bool:
        return (x, y) in self.obstacles
    
    def get_neighbors(self, x: int, y: int) -> List[Tuple[int, int]]:
        """Returns valid static neighbors (Up, Down, Left, Right, Wait)."""
        moves = [(0, 1), (0, -1), (1, 0), (-1, 0), (0, 0)] # (0,0) is 'Wait'
        neighbors = []
        
        for dx, dy in moves:
            nx, ny = x + dx, y + dy
            if self.in_bounds(nx, ny) and not self.is_blocked(nx, ny):
                neighbors.append((nx, ny))
        return neighbors