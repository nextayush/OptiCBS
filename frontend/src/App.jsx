// src/App.jsx
import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { 
  Play, Pause, RotateCcw, Box, Server, Activity, 
  Sun, Moon, BrickWall, Shuffle, Trash2, Flame, Settings, Users, Grid as GridIcon
} from 'lucide-react';
import GridMap from './components/Grid/GridMap';
import ExplainLog from './components/Analytics/ExplainLog';

function App() {
  // --- Configuration State ---
  const [config, setConfig] = useState({
    width: 12,
    height: 10,
    agentCount: 3
  });

  // --- Sandbox State ---
  const [obstacles, setObstacles] = useState([[3, 3], [3, 4], [3, 5], [7, 7], [7, 6]]);
  const [agents, setAgents] = useState([
    { start: [0, 0], goal: [9, 9] },
    { start: [9, 0], goal: [0, 9] },
    { start: [0, 9], goal: [9, 0] }
  ]);
  
  const [interactionMode, setInteractionMode] = useState('none'); 
  const [showHeatmap, setShowHeatmap] = useState(false);

  // --- Solver State ---
  const [paths, setPaths] = useState([]);
  const [status, setStatus] = useState("Idle");
  const [currentTime, setCurrentTime] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [maxTime, setMaxTime] = useState(0);

  // --- Theme ---
  const [isDarkMode, setIsDarkMode] = useState(true);
  useEffect(() => {
    isDarkMode ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark');
  }, [isDarkMode]);

  const canvasColors = useMemo(() => ({
    bg: isDarkMode ? '#0f172a' : '#f8fafc',
    grid: isDarkMode ? '#1e293b' : '#e2e8f0',
    obstacle: isDarkMode ? '#475569' : '#94a3b8',
    text: isDarkMode ? '#ffffff' : '#0f172a'
  }), [isDarkMode]);

  // --- Handlers ---

  // 1. Safe Grid Resizing
  const handleConfigChange = (key, value) => {
    let newVal = parseInt(value, 10);
    if (isNaN(newVal)) return;

    // Bounds checking
    if (key === 'width' || key === 'height') newVal = Math.max(5, Math.min(30, newVal));
    if (key === 'agentCount') newVal = Math.max(1, Math.min(20, newVal));

    setConfig(prev => {
        const newConfig = { ...prev, [key]: newVal };
        // Trigger a re-randomization whenever config changes to prevent out-of-bounds errors
        setTimeout(() => randomizeMap(newConfig), 50); 
        return newConfig;
    });
  };

  // 2. Randomize Scenario (Updated for dynamic size)
  const randomizeMap = (currentConfig = config) => {
    const w = currentConfig.width;
    const h = currentConfig.height;
    const count = currentConfig.agentCount;
    
    // 1. Generate Random Obstacles (15% density)
    const newObstacles = [];
    for(let x=0; x<w; x++){
        for(let y=0; y<h; y++){
            if(Math.random() < 0.15) newObstacles.push([x, y]);
        }
    }

    // 2. Generate Random Agents
    const newAgents = [];
    const used = new Set(newObstacles.map(o => `${o[0]},${o[1]}`));
    
    const getRandomFree = () => {
        let x, y, k;
        let attempts = 0;
        do {
            x = Math.floor(Math.random() * w);
            y = Math.floor(Math.random() * h);
            k = `${x},${y}`;
            attempts++;
            if (attempts > 500) return null; // Prevent infinite loop on full grid
        } while (used.has(k));
        used.add(k);
        return [x, y];
    };

    for(let i=0; i < count; i++) {
        const start = getRandomFree();
        const goal = getRandomFree();
        if (start && goal) {
            newAgents.push({ start, goal });
        }
    }

    setObstacles(newObstacles);
    setAgents(newAgents);
    setPaths([]);
    setStatus("Randomized");
    setCurrentTime(0);
    setIsPlaying(false);
  };

  // 3. Handle Grid Clicks
  const handleCellClick = (x, y) => {
    if (interactionMode === 'wall') {
        const exists = obstacles.find(o => o[0] === x && o[1] === y);
        if (exists) {
            setObstacles(obstacles.filter(o => o[0] !== x || o[1] !== y));
        } else {
            const agentConflict = agents.some(a => 
                (a.start[0] === x && a.start[1] === y) || (a.goal[0] === x && a.goal[1] === y)
            );
            if (!agentConflict) {
                setObstacles([...obstacles, [x, y]]);
            }
        }
        setPaths([]); 
        setStatus("Map Modified");
        setCurrentTime(0);
    }
  };

  // 4. Solve API Call
  const solveMAPF = async () => {
    setStatus("Solving...");
    setIsPlaying(false);
    setCurrentTime(0);
    try {
      const payload = {
        width: config.width,
        height: config.height,
        obstacles: obstacles,
        starts: agents.map(a => a.start),
        goals: agents.map(a => a.goal)
      };
      
      // ADD TIMEOUT: If backend takes > 10 seconds, abort.
      const res = await axios.post('http://localhost:8000/api/v1/solve', payload, {
          timeout: 10000 
      });
      
      if (res.data.status === "Solved") {
        setPaths(res.data.paths);
        setMaxTime(Math.max(...res.data.paths.map(p => p.path.length)) - 1);
        setStatus("Solved");
        setIsPlaying(true);
      } else {
        setStatus("Failed: " + res.data.status);
      }
    } catch (err) {
      console.error(err);
      if (err.code === 'ECONNABORTED') {
          setStatus("Timeout: Server took too long");
      } else if (err.response) {
          setStatus(`Error: ${err.response.status}`);
      } else {
          setStatus("Connection Failed"); // Backend unreachable
      }
    }
  };

  // Animation Loop
  useEffect(() => {
    let animationFrame;
    if (isPlaying && currentTime < maxTime) {
      const animate = () => {
        setCurrentTime(prev => {
          const next = prev + 0.15;
          if (next >= maxTime) { setIsPlaying(false); return maxTime; }
          return next;
        });
        animationFrame = requestAnimationFrame(animate);
      };
      animationFrame = requestAnimationFrame(animate);
    }
    return () => cancelAnimationFrame(animationFrame);
  }, [isPlaying, currentTime, maxTime]);

  return (
    <div className={`flex h-screen transition-colors duration-300 ${isDarkMode ? 'bg-slate-950 text-slate-100' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Sidebar */}
      <aside className={`w-80 border-r p-5 flex flex-col gap-4 shadow-2xl z-20 overflow-y-auto custom-scrollbar 
          ${isDarkMode ? 'bg-slate-900 border-slate-800' : 'bg-white border-slate-200'}`}>
        
        {/* Header */}
        <div className="flex items-center gap-3 mb-1">
          <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
            <Box className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight">OptiFlow</h1>
            <span className="text-[10px] font-mono text-blue-500 font-bold uppercase tracking-wider">Research Suite</span>
          </div>
        </div>

        {/* --- Configuration Panel --- */}
        <div className={`p-4 rounded-xl border space-y-4 ${isDarkMode ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex items-center gap-2 text-slate-500 text-xs font-bold uppercase tracking-wider mb-2">
                <Settings className="w-3 h-3" /> Configuration
            </div>
            
            {/* Grid Size Inputs */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <GridIcon className="w-3 h-3" /> Grid Dimensions (5-30)
                </label>
                <div className="flex gap-2">
                    <div className="relative flex-1">
                        <input 
                            type="number" 
                            value={config.width}
                            onChange={(e) => handleConfigChange('width', e.target.value)}
                            className={`w-full p-2 pl-8 rounded-lg border text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all
                            ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
                        />
                        <span className="absolute left-2 top-2 text-slate-500 text-xs font-bold">W</span>
                    </div>
                    <div className="relative flex-1">
                        <input 
                            type="number" 
                            value={config.height}
                            onChange={(e) => handleConfigChange('height', e.target.value)}
                            className={`w-full p-2 pl-8 rounded-lg border text-sm font-mono focus:ring-2 focus:ring-blue-500 outline-none transition-all
                            ${isDarkMode ? 'bg-slate-900 border-slate-700' : 'bg-white border-slate-300'}`}
                        />
                        <span className="absolute left-2 top-2 text-slate-500 text-xs font-bold">H</span>
                    </div>
                </div>
            </div>

            {/* Agent Count Input */}
            <div className="space-y-2">
                <label className="text-xs font-medium text-slate-400 flex items-center gap-1">
                    <Users className="w-3 h-3" /> Agent Count (1-20)
                </label>
                <div className="relative">
                    <input 
                        type="range" 
                        min="1" max="20" 
                        value={config.agentCount}
                        onChange={(e) => handleConfigChange('agentCount', e.target.value)}
                        className="w-full h-2 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-blue-500 mb-2"
                    />
                    <div className="flex justify-between text-xs font-mono text-slate-500">
                        <span>1</span>
                        <span className="text-blue-500 font-bold">{config.agentCount}</span>
                        <span>20</span>
                    </div>
                </div>
            </div>
        </div>

        {/* --- Map Tools --- */}
        <div className="grid grid-cols-2 gap-2">
            <button 
                onClick={() => setInteractionMode(interactionMode === 'wall' ? 'none' : 'wall')}
                className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all
                ${interactionMode === 'wall' 
                    ? 'bg-blue-600 text-white border-blue-500 shadow-md' 
                    : isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`}
            >
                <BrickWall className="w-3.5 h-3.5" /> Draw Walls
            </button>
            <button 
                onClick={() => randomizeMap(config)}
                className={`p-2.5 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all
                ${isDarkMode ? 'bg-slate-800 border-slate-700 hover:bg-slate-700' : 'bg-slate-100 border-slate-200 hover:bg-slate-200'}`}
            >
                <Shuffle className="w-3.5 h-3.5" /> Randomize
            </button>
        </div>
        
        <button 
            onClick={() => { setObstacles([]); setPaths([]); }}
            className={`w-full p-2 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 transition-all text-red-500 border-red-500/20 hover:bg-red-500/10`}
        >
            <Trash2 className="w-3.5 h-3.5" /> Clear Map
        </button>

        {/* --- Stats --- */}
        <div className={`p-4 rounded-xl border flex justify-between items-center ${isDarkMode ? 'bg-slate-800/30 border-slate-700' : 'bg-slate-50 border-slate-200'}`}>
            <div>
                <p className="text-[10px] uppercase font-bold text-slate-500">Total Cost</p>
                <p className="text-xl font-mono leading-none mt-1">{paths.reduce((a,c)=>a+c.cost, 0)}</p>
            </div>
             <div className="text-right">
                <p className="text-[10px] uppercase font-bold text-slate-500">Status</p>
                <div className="flex items-center justify-end gap-1.5 mt-1">
                    <Activity className={`w-3 h-3 ${status === 'Solved' ? 'text-green-500' : 'text-blue-500'}`} />
                    <span className={`text-sm font-semibold ${status === 'Solved' ? 'text-green-500' : 'text-slate-400'}`}>{status}</span>
                </div>
            </div>
        </div>

        {/* Explain Log */}
        <div className="flex-1 min-h-0 border-t pt-4 mt-1 overflow-hidden flex flex-col gap-2 border-slate-200 dark:border-slate-800">
           <ExplainLog paths={paths} isDarkMode={isDarkMode} />
        </div>

        {/* Main Action */}
        <button 
            onClick={solveMAPF}
            disabled={status === "Solving..."}
            className="w-full py-3.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-500/20 transition-all flex items-center justify-center gap-2 active:scale-[0.98]"
        >
            <Server className="w-4 h-4" /> 
            {status === "Solving..." ? "Computing..." : "Run Simulation"}
        </button>
      </aside>

      {/* Main View */}
      <main className="flex-1 relative flex flex-col">
        <header className={`h-16 border-b flex items-center px-6 justify-between backdrop-blur-md sticky top-0 z-10 transition-colors
          ${isDarkMode ? 'bg-slate-900/80 border-slate-800' : 'bg-white/80 border-slate-200'}`}>
            
            <div className="flex items-center gap-3">
                {interactionMode === 'wall' && (
                    <div className="px-3 py-1 bg-blue-500/20 text-blue-500 text-xs font-bold rounded-full animate-pulse border border-blue-500/30">
                        EDIT MODE
                    </div>
                )}
            </div>
            
            <div className="flex items-center gap-4">
                <button 
                    onClick={() => setShowHeatmap(!showHeatmap)}
                    className={`p-2 rounded-lg border flex items-center gap-2 text-xs font-medium transition-all
                    ${showHeatmap ? 'bg-red-500/20 text-red-500 border-red-500/50' : 'text-slate-500 border-transparent hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                    <Flame className="w-4 h-4" /> Heatmap
                </button>

                <div className="w-px h-6 bg-slate-500/20 mx-1"></div>

                <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 opacity-60 hover:opacity-100 transition-opacity">
                  {isDarkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
                </button>

                <div className="w-px h-6 bg-slate-500/20 mx-1"></div>

                <div className="flex items-center gap-3 bg-slate-400/10 p-1 rounded-lg border border-slate-500/10">
                    <button 
                        onClick={() => { setIsPlaying(!isPlaying); if(currentTime >= maxTime) setCurrentTime(0); }}
                        className={`p-1.5 rounded-md transition ${isDarkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-white text-slate-700'}`}
                    >
                        {isPlaying ? <Pause className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                    </button>
                    <button 
                         onClick={() => { setIsPlaying(false); setCurrentTime(0); }}
                         className={`p-1.5 rounded-md transition ${isDarkMode ? 'hover:bg-slate-700 text-slate-200' : 'hover:bg-white text-slate-700'}`}
                    >
                         <RotateCcw className="w-4 h-4" />
                    </button>

                    <div className="flex items-center gap-3 px-2">
                        <span className="text-xs font-mono font-medium opacity-60 w-8 text-right">{currentTime.toFixed(1)}</span>
                        <input type="range" min="0" max={maxTime || 10} step="0.1" value={currentTime} 
                            onChange={(e) => { setIsPlaying(false); setCurrentTime(parseFloat(e.target.value)); }}
                            className="w-24 h-1 bg-slate-400/30 rounded-lg appearance-none cursor-pointer accent-blue-500"
                        />
                    </div>
                </div>
            </div>
        </header>

        <div className={`flex-1 flex items-center justify-center overflow-auto p-10 cursor-crosshair
          ${isDarkMode ? 'bg-[#0B101E]' : 'bg-slate-100'}`}>
            <GridMap 
                width={config.width} 
                height={config.height} 
                obstacles={obstacles} 
                agents={agents} 
                paths={paths}
                currentTime={currentTime}
                colors={canvasColors}
                onCellClick={handleCellClick}
                interactionMode={interactionMode}
                showHeatmap={showHeatmap}
            />
        </div>
      </main>
    </div>
  );
}

export default App;