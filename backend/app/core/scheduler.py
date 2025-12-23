# backend/app/core/scheduler.py
from typing import List, Tuple, Dict
import random

# Enum for Lifecycle
TASK_IDLE = "IDLE"
TASK_TO_SHELF = "TO_SHELF"
TASK_PICKUP = "PICKING_UP" # The 2s wait
TASK_TO_PACK = "TO_PACK"
TASK_DROPOFF = "DROPPING_OFF"
TASK_TO_CHARGE = "TO_CHARGE"
TASK_CHARGING = "CHARGING"

class RobotState:
    def __init__(self, id, x, y, direction=0):
        self.id = id
        self.x = x
        self.y = y
        self.direction = direction # 0:E, 1:S, 2:W, 3:N
        self.battery = 100
        self.task_state = TASK_IDLE
        self.current_goal = None # (x, y)
        self.held_item = None # ID of shelf/pod

class WarehouseManager:
    def __init__(self, width, height, shelves: List[Tuple[int, int]], stations: List[Tuple[int, int]], chargers: List[Tuple[int, int]]):
        self.width = width
        self.height = height
        self.shelves = shelves   # Locations of pods
        self.stations = stations # Packing stations
        self.chargers = chargers # Charging pads
        self.robots: Dict[int, RobotState] = {}

    def get_next_goal(self, robot_id: int) -> Tuple[int, int]:
        robot = self.robots[robot_id]
        
        # 1. CRITICAL BATTERY CHECK
        if robot.battery < 20 and robot.task_state != TASK_CHARGING:
            robot.task_state = TASK_TO_CHARGE
            # Find nearest charger
            nearest = min(self.chargers, key=lambda c: abs(c[0]-robot.x) + abs(c[1]-robot.y))
            robot.current_goal = nearest
            return nearest

        # 2. State Machine
        if robot.task_state == TASK_IDLE:
            # Assign new random shelf
            robot.task_state = TASK_TO_SHELF
            target = random.choice(self.shelves)
            robot.current_goal = target
            return target
            
        elif robot.task_state == TASK_TO_SHELF:
            # Reached shelf? Transition to Pickup
            robot.task_state = TASK_TO_PACK
            # Find nearest packing station
            target = min(self.stations, key=lambda s: abs(s[0]-robot.x) + abs(s[1]-robot.y))
            robot.current_goal = target
            return target

        elif robot.task_state == TASK_TO_PACK:
            # Reached pack station? Go back to IDLE (or Return Shelf)
            robot.task_state = TASK_IDLE
            robot.current_goal = (robot.x, robot.y) # Wait here for next order
            return (robot.x, robot.y)
            
        elif robot.task_state == TASK_TO_CHARGE:
             # Reached charger
             robot.task_state = TASK_CHARGING
             return (robot.x, robot.y) # Stay put
             
        # Default fallback
        return (robot.x, robot.y)

    def update_robot(self, id, x, y, direction, battery_drain=0.5):
        if id not in self.robots:
            self.robots[id] = RobotState(id, x, y, direction)
        
        r = self.robots[id]
        r.x = x
        r.y = y
        r.direction = direction
        
        if r.task_state == TASK_CHARGING:
            r.battery = min(100, r.battery + 5) # Charge fast
            if r.battery == 100:
                r.task_state = TASK_IDLE
        else:
            r.battery = max(0, r.battery - battery_drain)
            
        return r