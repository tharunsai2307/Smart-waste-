import React from 'react';

// Fallback map representation that visually positions locations without an actual map library
const FallbackMap = ({ locations }: { locations: any[] }) => {
  return (
    <div className="relative w-full h-full bg-gray-900 rounded-lg overflow-hidden border border-gray-700/50 shadow-2xl">
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.03)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.03)_1px,transparent_1px)] bg-[size:40px_40px]"></div>
      
      {/* Very basic coordinate mapping just for demonstration */}
      {locations.map((loc, i) => {
        // Mock projection to center coordinates in the div
        const x = 50 + (loc.lon - -74.0) * 100;
        const y = 50 - (loc.lat - 40.7) * 100;
        
        let color = 'bg-blue-500';
        if (loc.type === 1) color = 'bg-orange-500'; // Hub
        if (loc.type === 2) color = 'bg-green-500'; // Facility
        
        return (
          <div
            key={i}
            className={`absolute w-4 h-4 rounded-full ${color} transform -translate-x-1/2 -translate-y-1/2 shadow-[0_0_15px_rgba(255,255,255,0.5)] cursor-pointer hover:scale-125 transition-transform`}
            style={{ left: `${Math.max(5, Math.min(95, x))}%`, top: `${Math.max(5, Math.min(95, y))}%` }}
            title={loc.type === 1 ? 'Local Hub' : 'Resident'}
          >
            <div className={`absolute inset-0 rounded-full ${color} animate-ping opacity-75`}></div>
          </div>
        );
      })}
    </div>
  );
};

export const MapProvider = ({ locations }: { locations: any[] }) => {
  const provider = import.meta.env.VITE_MAP_PROVIDER;
  
  if (provider === 'GOOGLE_MAPS' && import.meta.env.VITE_MAP_API_KEY) {
    // In future: return <GoogleMap ... />
    return <FallbackMap locations={locations} />;
  }
  
  return <FallbackMap locations={locations} />;
};
