# backend/tests/test_cbs.py
import unittest
from app.utils.grid import Grid
from app.core.cbs import CBSSolver

class TestCBS(unittest.TestCase):
    
    def validate_solution(self, paths):
        """Helper to verify no two agents are at the same place at same time"""
        max_t = max(len(p) for p in paths)
        for t in range(max_t):
            positions = []
            for path in paths:
                # If path ended, agent stays at last pos
                pos = path[t] if t < len(path) else path[-1]
                positions.append(pos)
            
            # Check for duplicates in positions list
            if len(positions) != len(set(positions)):
                return False, f"Collision detected at t={t}: {positions}"
        return True, "Valid"

    def test_simple_crossing(self):
        print("\n--- Test 1: Simple Crossing ---")
        grid = Grid(width=3, height=3) # 3x3 Empty Grid
        solver = CBSSolver(grid)

        # Agent 0: (0, 1) -> (2, 1) (Left to Right)
        # Agent 1: (1, 0) -> (1, 2) (Top to Bottom)
        starts = [(0, 1), (1, 0)]
        goals = [(2, 1), (1, 2)]

        paths = solver.solve(starts, goals)

        self.assertIsNotNone(paths, "Solver returned None")
        print(f"Agent 0 Path: {paths[0]}")
        print(f"Agent 1 Path: {paths[1]}")

        is_valid, msg = self.validate_solution(paths)
        self.assertTrue(is_valid, msg)

    def test_head_on_corridor(self):
        print("\n--- Test 2: Head-On in Corridor ---")
        # 3x1 Grid (Narrow corridor)
        # Agent 0: (0,0) -> (2,0)
        # Agent 1: (2,0) -> (0,0)
        # This is impossible without width to swap. 
        # But if we make it 3x3, they can side-step.
        
        grid = Grid(width=3, height=3)
        solver = CBSSolver(grid)
        
        starts = [(0, 1), (2, 1)]
        goals = [(2, 1), (0, 1)]
        
        paths = solver.solve(starts, goals)
        
        self.assertIsNotNone(paths, "Solver returned None")
        print(f"Agent 0 Path: {paths[0]}")
        print(f"Agent 1 Path: {paths[1]}")
        
        is_valid, msg = self.validate_solution(paths)
        self.assertTrue(is_valid, msg)

if __name__ == '__main__':
    unittest.main()