import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { api } from '../services/api';

const RoutesPage: React.FC = () => {
  const [fromNode, setFromNode] = useState(0);
  const [toNode, setToNode] = useState(3);
  const [queryParams, setQueryParams] = useState({ from: 0, to: 3 });

  const { data: route, isLoading } = useQuery({
    queryKey: ['route', queryParams.from, queryParams.to],
    queryFn: () => api.getRoute(queryParams.from, queryParams.to),
  });

  const locationNames = [
    'Depot', 'Anna Nagar', 'Ambattur', 'Avadi', 'Poonamallee', 'Mogappair',
    'Tirumullaivoyal', 'Kolathur', 'Perambur', 'Villivakkam', 'Madhavaram',
    'Redhills', 'Ambattur Estate', 'Padi', 'Sathyamurthy', 'Ennore',
    'Manali', 'Tiruvottiyur', 'Sholavaram', 'Ayanambakkam',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Route Optimizer</h1>
        <p className="text-xs text-slate-500 mt-1">Dijkstra's Algorithm — powered by C backend</p>
      </div>

      {/* Route query form */}
      <div className="glass p-6 rounded-2xl">
        <div className="text-xs text-slate-500 tracking-widest mb-4">CALCULATE OPTIMAL ROUTE</div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
          <div>
            <label className="block text-xs text-slate-400 mb-2">FROM NODE</label>
            <select
              value={fromNode}
              onChange={(e) => setFromNode(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg text-sm text-white font-mono"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {locationNames.map((name, i) => (
                <option key={i} value={i} style={{ background: '#0d1423' }}>{i}: {name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-2">TO NODE</label>
            <select
              value={toNode}
              onChange={(e) => setToNode(Number(e.target.value))}
              className="w-full px-3 py-2.5 rounded-lg text-sm text-white font-mono"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              {locationNames.map((name, i) => (
                <option key={i} value={i} style={{ background: '#0d1423' }}>{i}: {name}</option>
              ))}
            </select>
          </div>
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => setQueryParams({ from: fromNode, to: toNode })}
            className="px-5 py-2.5 rounded-xl text-sm font-semibold tracking-wider cursor-pointer"
            style={{ background: 'linear-gradient(135deg, #059669, #0891b2)', color: 'white' }}
          >
            🗺 CALCULATE DIJKSTRA ROUTE
          </motion.button>
        </div>
      </div>

      {/* Route result */}
      {isLoading && (
        <div className="text-center py-12 text-emerald-400 font-mono text-xs">RUNNING DIJKSTRA ALGORITHM...</div>
      )}

      {route && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Route details */}
          <div className="glass p-6 rounded-2xl">
            <div className="text-xs text-slate-500 tracking-widest mb-4">ROUTE METRICS</div>
            <div className="space-y-4">
              {[
                { label: 'Distance', value: route.distance === -1 ? 'No path' : `${route.distance} km`, color: '#34d399' },
                { label: 'From', value: locationNames[route.from] ?? `Node ${route.from}`, color: '#22d3ee' },
                { label: 'To', value: locationNames[route.to] ?? `Node ${route.to}`, color: '#22d3ee' },
                { label: 'Stops', value: `${route.path.length} nodes`, color: '#a78bfa' },
              ].map(m => (
                <div key={m.label}>
                  <div className="text-xs text-slate-600">{m.label}</div>
                  <div className="text-lg font-bold font-mono mt-0.5" style={{ color: m.color }}>{m.value}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Path visualization */}
          <div className="md:col-span-2 glass p-6 rounded-2xl">
            <div className="text-xs text-slate-500 tracking-widest mb-4">OPTIMAL PATH</div>
            {route.distance === -1 ? (
              <div className="text-red-400 text-sm">No path found between these nodes.</div>
            ) : (
              <div className="flex flex-col gap-3">
                {route.path.map((node, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.1 }}
                    className="flex items-center gap-4"
                  >
                    <div className="flex flex-col items-center">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold"
                           style={{
                             background: i === 0 ? 'rgba(52,211,153,0.2)' : i === route.path.length - 1 ? 'rgba(34,211,238,0.2)' : 'rgba(255,255,255,0.07)',
                             border: `1px solid ${i === 0 ? '#34d399' : i === route.path.length - 1 ? '#22d3ee' : 'rgba(255,255,255,0.1)'}`,
                             color: i === 0 ? '#34d399' : i === route.path.length - 1 ? '#22d3ee' : '#94a3b8',
                           }}>
                        {node.nodeId}
                      </div>
                      {i < route.path.length - 1 && (
                        <div className="w-px h-4 mt-1" style={{ background: 'rgba(255,255,255,0.1)' }} />
                      )}
                    </div>
                    <div className="text-sm font-medium" style={{ color: i === 0 ? '#34d399' : i === route.path.length - 1 ? '#22d3ee' : '#e2e8f0' }}>
                      {node.name}
                      {i === 0 && <span className="ml-2 text-xs text-slate-500 font-normal">START</span>}
                      {i === route.path.length - 1 && <span className="ml-2 text-xs text-slate-500 font-normal">DESTINATION</span>}
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default RoutesPage;
