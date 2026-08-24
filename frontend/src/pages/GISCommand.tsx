import React, { useEffect, useState } from 'react';
import { api } from '../services/api';
import { MapProvider } from '../components/gis/MapProvider';

export const GISCommand = () => {
  const [locations, setLocations] = useState<any[]>([]);
  const [hubs, setHubs] = useState<any[]>([]);
  const [routes, setRoutes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Currently, GIS APIs aren't fully exposed in our API wrapper, we'll hit them directly or mock for now
      // The requirement states we need an advanced, futuristic UI
      const mockLocations = [
        { locationId: 1, type: 1, referenceId: 101, lat: 40.7128, lon: -74.0060 },
        { locationId: 2, type: 2, referenceId: 201, lat: 40.7328, lon: -74.0160 },
        { locationId: 3, type: 3, referenceId: 301, lat: 40.7528, lon: -74.0260 }
      ];
      setLocations(mockLocations);
      
      const mockHubs = [
        { hubId: 101, name: "Downtown Central Hub", distanceKm: 2.4 }
      ];
      setHubs(mockHubs);

      setLoading(false);
    } catch (e) {
      console.error(e);
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-blue-500"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-[calc(100vh-8rem)]">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-500 tracking-wider">
          GIS COMMAND CENTER
        </h1>
        <button 
          onClick={fetchData}
          className="px-4 py-2 bg-blue-600/20 text-blue-400 border border-blue-500/50 rounded-lg hover:bg-blue-600/40 transition-colors shadow-[0_0_15px_rgba(59,130,246,0.3)]"
        >
          REFRESH TELEMETRY
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6 h-full pb-6">
        <div className="col-span-2 relative bg-gray-900 border border-gray-800 rounded-xl overflow-hidden shadow-[0_0_30px_rgba(0,0,0,0.5)]">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-purple-500 z-10"></div>
          
          {/* Futuristic Overlay Elements */}
          <div className="absolute top-4 left-4 z-10 bg-black/60 backdrop-blur border border-blue-500/30 p-3 rounded-lg text-xs font-mono text-blue-300">
            <div>SYS.STATUS: <span className="text-green-400">ONLINE</span></div>
            <div>LATENCY: 12ms</div>
            <div>UPLINK: ACTIVE</div>
          </div>
          
          <MapProvider locations={locations} />
        </div>

        <div className="space-y-6 flex flex-col h-full overflow-y-auto pr-2 custom-scrollbar">
          
          {/* Active Nodes Panel */}
          <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl relative overflow-hidden group">
            <div className="absolute inset-0 bg-blue-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <h2 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-800 pb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></div>
              Active Nodes
            </h2>
            <div className="space-y-3">
              {locations.map(loc => (
                <div key={loc.locationId} className="flex justify-between items-center p-3 bg-gray-800/50 border border-gray-700/50 rounded-lg">
                  <div>
                    <div className="text-sm font-medium text-gray-300">
                      {loc.type === 1 ? 'Collection Hub' : loc.type === 2 ? 'Processing Facility' : 'Resident Location'}
                    </div>
                    <div className="text-xs text-gray-500 mt-1 font-mono">ID: {loc.referenceId}</div>
                  </div>
                  <div className="text-xs font-mono text-right">
                    <div className="text-blue-400">LAT: {loc.lat.toFixed(4)}</div>
                    <div className="text-indigo-400">LON: {loc.lon.toFixed(4)}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Logistics Routing Panel */}
          <div className="bg-gray-900 border border-gray-800 p-5 rounded-xl relative overflow-hidden group flex-grow">
            <div className="absolute inset-0 bg-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
            <h2 className="text-xl font-semibold mb-4 text-gray-200 border-b border-gray-800 pb-2 flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-purple-500 animate-pulse"></div>
              Routing Intelligence
            </h2>
            
            <div className="text-sm text-gray-400 p-4 border border-dashed border-gray-700 rounded-lg text-center">
              No active vehicle routes.
              <div className="mt-2 text-xs text-purple-400">AWAITING DISPATCH SIGNAL</div>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};
