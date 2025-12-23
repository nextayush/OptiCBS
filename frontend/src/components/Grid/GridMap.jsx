// src/components/Grid/GridMap.jsx
import React, { useRef, useEffect, useState } from 'react';

const CELL_SIZE = 40;
const ROBOT_SIZE = 28;

// Color mapping for different agent states (Tier 2 Feature)
const STATE_COLORS = {
  IDLE: '#64748b',       // Slate-500
  TO_SHELF: '#3b82f6',   // Blue-500
  PICKING_UP: '#eab308', // Yellow-500 (Waiting)
  TO_PACK: '#f97316',    // Orange-500 (Carrying)
  DROPPING_OFF: '#84cc16', // Lime-500
  TO_CHARGE: '#ef4444',  // Red-500
  CHARGING: '#22c55e'    // Green-500
};

const GridMap = ({ 
  width, 
  height, 
  obstacles, 
  agents, 
  paths, 
  currentTime, 
  colors, 
  onCellClick, 
  interactionMode, 
  showHeatmap 
}) => {
  const canvasRef = useRef(null);
  const [hoverCell, setHoverCell] = useState(null);
  
  const theme = colors || { bg: '#0f172a', grid: '#334155', obstacle: '#64748b', text: '#ffffff' };

  // --- Helper: Draw the Realistic Robot ---
  const drawRobot = (ctx, x, y, angle, id, stateData) => {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(angle);

    // 1. Determine Visual State
    // Default to blue/carrying logic if state isn't provided (legacy backend compatibility)
    const state = stateData?.state || 'TO_SHELF'; 
    const battery = stateData?.battery !== undefined ? stateData.battery : 100;
    const isCarrying = state === 'TO_PACK' || state === 'DROPPING_OFF';
    
    const bodyColor = STATE_COLORS[state] || `hsl(${(id * 137) % 360}, 60%, 50%)`;

    // 2. Draw Body (Chassis)
    ctx.fillStyle = bodyColor;
    ctx.shadowColor = 'rgba(0,0,0,0.5)';
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.roundRect(-ROBOT_SIZE/2, -ROBOT_SIZE/2, ROBOT_SIZE, ROBOT_SIZE, 6);
    ctx.fill();
    ctx.shadowBlur = 0;

    // 3. Draw Directional Head (The "Front")
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.fillRect(ROBOT_SIZE/2 - 5, -ROBOT_SIZE/2 + 5, 4, ROBOT_SIZE - 10);

    // 4. Draw Payload (if carrying)
    if (isCarrying) {
        // Draw Crate
        ctx.fillStyle = '#d97706'; // Amber-600
        ctx.strokeStyle = '#78350f'; // Amber-900
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.rect(-8, -8, 16, 16);
        ctx.fill();
        ctx.stroke();
        
        // Crate "X" detail
        ctx.beginPath();
        ctx.moveTo(-8, -8); ctx.lineTo(8, 8);
        ctx.moveTo(8, -8); ctx.lineTo(-8, 8);
        ctx.stroke();
    } else {
        // Draw ID text if empty
        ctx.rotate(-angle); // Keep text upright
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px "JetBrains Mono", monospace';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(id, 0, 0);
        ctx.rotate(angle); // Restore rotation for battery bar
    }

    // 5. Draw Battery Bar (Extreme Detail Feature)
    // Rotate -90 deg relative to body so it floats "above" the robot in world space
    // or keep it fixed relative to body. Let's keep it fixed to body for cleaner look.
    const barWidth = 22;
    const hp = battery / 100;
    
    ctx.translate(0, -ROBOT_SIZE/2 - 6); // Move above head
    // Background
    ctx.fillStyle = '#1e293b'; 
    ctx.fillRect(-barWidth/2, 0, barWidth, 4);
    // Health
    ctx.fillStyle = hp > 0.5 ? '#22c55e' : (hp > 0.2 ? '#eab308' : '#ef4444');
    ctx.fillRect(-barWidth/2, 0, barWidth * hp, 4);

    ctx.restore();
  };

  // --- Input Handling ---
  const getGridCoords = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX - rect.left) * (canvas.width / rect.width / window.devicePixelRatio);
    const y = (e.clientY - rect.top) * (canvas.height / rect.height / window.devicePixelRatio);
    return [Math.floor(x / CELL_SIZE), Math.floor(y / CELL_SIZE)];
  };

  const handleClick = (e) => {
    const [gx, gy] = getGridCoords(e);
    if (gx >= 0 && gx < width && gy >= 0 && gy < height) onCellClick(gx, gy);
  };

  const handleMouseMove = (e) => {
    const [gx, gy] = getGridCoords(e);
    if (gx >= 0 && gx < width && gy >= 0 && gy < height) setHoverCell([gx, gy]);
    else setHoverCell(null);
  };

  // --- Main Rendering Loop ---
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const dpr = window.devicePixelRatio || 1;
    
    // Resize Canvas
    canvas.width = width * CELL_SIZE * dpr;
    canvas.height = height * CELL_SIZE * dpr;
    canvas.style.width = `${width * CELL_SIZE}px`;
    canvas.style.height = `${height * CELL_SIZE}px`;
    ctx.scale(dpr, dpr);

    const render = () => {
      // 1. Background
      ctx.fillStyle = theme.bg;
      ctx.fillRect(0, 0, width * CELL_SIZE, height * CELL_SIZE);

      // 2. Grid Lines (Subtle)
      ctx.strokeStyle = theme.grid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      for (let x = 0; x <= width; x++) { ctx.moveTo(x * CELL_SIZE, 0); ctx.lineTo(x * CELL_SIZE, height * CELL_SIZE); }
      for (let y = 0; y <= height; y++) { ctx.moveTo(0, y * CELL_SIZE); ctx.lineTo(width * CELL_SIZE, y * CELL_SIZE); }
      ctx.stroke();

      // 3. Interaction Highlight
      if (hoverCell && interactionMode !== 'none') {
        const [hx, hy] = hoverCell;
        ctx.fillStyle = interactionMode === 'wall' ? 'rgba(239, 68, 68, 0.2)' : 'rgba(59, 130, 246, 0.2)';
        ctx.fillRect(hx * CELL_SIZE, hy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
      }

      // 4. Draw Obstacles (3D Effect Shelves)
      obstacles.forEach(([x, y]) => {
        // Base
        ctx.fillStyle = theme.obstacle;
        ctx.beginPath();
        ctx.roundRect(x * CELL_SIZE + 2, y * CELL_SIZE + 2, CELL_SIZE - 4, CELL_SIZE - 4, 4);
        ctx.fill();
        
        // Rack Details (Simulating layers)
        ctx.fillStyle = 'rgba(0,0,0,0.2)';
        ctx.fillRect(x * CELL_SIZE + 6, y * CELL_SIZE + 10, CELL_SIZE - 12, 3);
        ctx.fillRect(x * CELL_SIZE + 6, y * CELL_SIZE + 22, CELL_SIZE - 12, 3);
      });

      // 5. Draw Goals (Drop Zones)
      agents.forEach((agent, idx) => {
        const [gx, gy] = agent.goal;
        ctx.strokeStyle = `hsl(${(idx * 137) % 360}, 70%, 50%)`;
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.strokeRect(gx * CELL_SIZE + 4, gy * CELL_SIZE + 4, CELL_SIZE - 8, CELL_SIZE - 8);
        ctx.setLineDash([]);
        
        // Label
        ctx.fillStyle = theme.text;
        ctx.font = '8px Inter';
        ctx.globalAlpha = 0.5;
        ctx.fillText(`G${idx}`, gx * CELL_SIZE + CELL_SIZE/2 - 4, gy * CELL_SIZE + CELL_SIZE/2);
        ctx.globalAlpha = 1.0;
      });

      // 6. Heatmap Overlay (Tier 3)
      if (showHeatmap && paths.length > 0) {
        const frequency = {};
        let maxFreq = 0;
        
        paths.forEach(p => {
            if(!p.path) return;
            p.path.forEach(pos => {
                // Handle both [x,y] and [x,y,dir]
                const x = pos[0];
                const y = pos[1];
                const key = `${x},${y}`;
                frequency[key] = (frequency[key] || 0) + 1;
                maxFreq = Math.max(maxFreq, frequency[key]);
            });
        });

        for (let x = 0; x < width; x++) {
            for (let y = 0; y < height; y++) {
                const count = frequency[`${x},${y}`] || 0;
                if (count > 0) {
                    const intensity = count / maxFreq; 
                    // Gradient: Transparent -> Red
                    ctx.fillStyle = `rgba(239, 68, 68, ${intensity * 0.7})`; 
                    ctx.fillRect(x * CELL_SIZE, y * CELL_SIZE, CELL_SIZE, CELL_SIZE);
                    
                    if (intensity > 0.4) {
                        ctx.fillStyle = '#fff';
                        ctx.font = 'bold 10px Inter';
                        ctx.fillText(count, x * CELL_SIZE + CELL_SIZE/2, y * CELL_SIZE + CELL_SIZE/2);
                    }
                }
            }
        }
      }

      // 7. Robots (Animated)
      const tIndex = Math.floor(currentTime);
      const tProgress = currentTime - tIndex;

      paths.forEach((agentData, idx) => {
        const path = agentData.path;
        if (!path || path.length === 0) return;

        // --- Kinematic Interpolation ---
        const currState = path[Math.min(tIndex, path.length - 1)];
        const nextState = path[Math.min(tIndex + 1, path.length - 1)];
        
        // Handle coordinates
        const cx = currState[0]; const cy = currState[1];
        const nx = nextState[0]; const ny = nextState[1];

        // Smooth X,Y
        const x = cx + (nx - cx) * tProgress;
        const y = cy + (ny - cy) * tProgress;

        // Handle Angle
        let angle = 0;
        
        // Case A: Backend provides direction (Advanced Mode)
        if (currState.length > 2) {
             const cDir = currState[2]; // 0=E, 1=S, 2=W, 3=N
             let nDir = nextState[2];
             
             // Handle 270->0 wrap-around (West to North)
             if (cDir === 3 && nDir === 0) nDir = 4;
             if (cDir === 0 && nDir === 3) nDir = -1;
             
             // Interpolate Angle
             const interpolatedDir = cDir + (nDir - cDir) * tProgress;
             // Convert direction index to Radians (0 -> 0, 1 -> PI/2)
             angle = interpolatedDir * (Math.PI / 2);

        } else {
             // Case B: Legacy/Simple Mode (Infer from movement)
             if (nx !== cx || ny !== cy) {
                angle = Math.atan2(ny - cy, nx - cx);
             } else if (tIndex > 0) {
                // Maintain previous angle if waiting
                const prev = path[Math.min(tIndex - 1, path.length - 1)];
                angle = Math.atan2(cy - prev[1], cx - prev[0]);
             }
        }

        drawRobot(
            ctx, 
            x * CELL_SIZE + CELL_SIZE/2, 
            y * CELL_SIZE + CELL_SIZE/2, 
            angle, 
            idx, 
            agentData // Pass full agent data (battery, state)
        );
      });
    };

    requestAnimationFrame(render);
  }, [width, height, obstacles, agents, paths, currentTime, theme, hoverCell, interactionMode, showHeatmap]);

  return (
    <div className={`relative overflow-hidden rounded-xl border border-slate-300 dark:border-slate-700 shadow-2xl transition-all duration-300 
        ${interactionMode !== 'none' ? 'cursor-pointer ring-2 ring-blue-500/50' : ''}`}>
      <canvas 
        ref={canvasRef} 
        onClick={handleClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={() => setHoverCell(null)}
      />
    </div>
  );
};

export default GridMap;