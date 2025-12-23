// src/components/Analytics/ExplainLog.jsx
import React, { useMemo } from 'react';
import { FileText, AlertCircle, CheckCircle2 } from 'lucide-react';

const ExplainLog = ({ paths }) => {
  // Analyze paths to generate natural language logs
  const logs = useMemo(() => {
    if (!paths || paths.length === 0) return [];
    
    const events = [];
    const maxTime = Math.max(...paths.map(p => p.path.length));

    // Check time steps for interesting events
    for (let t = 0; t < maxTime; t++) {
      // 1. Check for Waits
      paths.forEach((agent) => {
        const curr = agent.path[t];
        const next = agent.path[t+1];
        
        // If agent exists at t+1 and position hasn't changed
        if (next && curr[0] === next[0] && curr[1] === next[1]) {
           // Only log significant waits (not end-of-path idling)
           if (t < agent.path.length - 1) {
             events.push({
               time: t,
               agentId: agent.agent_id,
               type: 'wait',
               message: `Agent ${agent.agent_id} waits at (${curr[0]}, ${curr[1]}) to avoid conflict.`
             });
           }
        }
      });
    }

    // Sort by time
    return events.sort((a, b) => a.time - b.time);
  }, [paths]);

  if (paths.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-secondary opacity-50">
        <FileText className="w-12 h-12 mb-2" />
        <p>No solution data available.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <h3 className="text-sm font-semibold text-slate-300 mb-3 flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-success" /> Decision Log
      </h3>
      
      <div className="flex-1 overflow-y-auto pr-2 space-y-3 custom-scrollbar">
        {/* Initial Plan Log */}
        <div className="p-3 rounded bg-slate-800/50 border border-slate-700/50 text-sm">
           <span className="text-accent font-mono text-xs">T=0.0</span>
           <p className="text-slate-300 mt-1">
             Initialized MAPF for <span className="text-white font-bold">{paths.length} agents</span>.
             Optimal solution found with total cost <span className="text-white font-bold">{paths.reduce((a,c)=>a+c.cost,0)}</span>.
           </p>
        </div>

        {/* Dynamic Events */}
        {logs.map((log, idx) => (
          <div key={idx} className="p-3 rounded bg-slate-800/50 border border-slate-700/50 text-sm flex gap-3">
             <div className="mt-0.5">
               {log.type === 'wait' ? (
                 <AlertCircle className="w-4 h-4 text-orange-400" />
               ) : (
                 <div className="w-4 h-4 rounded-full bg-slate-600" />
               )}
             </div>
             <div>
               <span className="text-secondary font-mono text-xs">T={log.time}.0</span>
               <p className="text-slate-300 leading-tight mt-0.5">{log.message}</p>
             </div>
          </div>
        ))}
        
        {logs.length === 0 && (
          <div className="text-xs text-secondary text-center py-4">
            No conflicts detected. All agents followed optimal shortest paths.
          </div>
        )}
      </div>
    </div>
  );
};

export default ExplainLog;