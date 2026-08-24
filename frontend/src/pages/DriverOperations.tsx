import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface RouteState {
    routeId: number;
    status: string;
    vehicleId: number;
    currentLoadKg: number;
    capacityKg: number;
    stops: any[];
}

export default function DriverOperations() {
    const [route, setRoute] = useState<RouteState | null>(null);
    const [loading, setLoading] = useState(true);
    const [qrCode, setQrCode] = useState('');
    const [error, setError] = useState('');

    useEffect(() => {
        // Fetch active route for logged in driver
        fetch('/api/driver/operations')
            .then(r => r.json())
            .then(data => {
                if(data && !data.error) setRoute(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    const handleAction = async (endpoint: string, payload: any) => {
        setError('');
        try {
            const res = await fetch(endpoint, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload)
            });
            const result = await res.json();
            if(!res.ok) throw new Error(result.error || 'Action failed');
            
            // Refresh route
            const routeRes = await fetch('/api/driver/operations');
            setRoute(await routeRes.json());
            setQrCode('');
        } catch (e: any) {
            setError(e.message);
        }
    };

    if (loading) return <div className="p-8 text-white">Loading operations...</div>;

    return (
        <div className="min-h-screen bg-slate-900 text-white p-6 relative overflow-hidden">
            {/* Background elements */}
            <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-blue-600/20 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-emerald-600/20 blur-[120px] rounded-full pointer-events-none" />

            <div className="max-w-4xl mx-auto relative z-10">
                <header className="mb-8 border-b border-slate-700/50 pb-6 flex justify-between items-center">
                    <div>
                        <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-transparent">
                            Driver Operations Center
                        </h1>
                        <p className="text-slate-400 mt-2 text-sm">Real-time Fleet Tracking & QR Verification</p>
                    </div>
                    {route && (
                        <div className="bg-slate-800/80 backdrop-blur-md px-6 py-3 rounded-xl border border-slate-700">
                            <div className="text-xs text-slate-400 uppercase tracking-wider mb-1">Status</div>
                            <div className="font-semibold text-emerald-400">{route.status}</div>
                        </div>
                    )}
                </header>

                {error && (
                    <motion.div initial={{opacity:0, y:-10}} animate={{opacity:1, y:0}} className="bg-red-500/20 border border-red-500/50 text-red-200 p-4 rounded-xl mb-6 backdrop-blur-sm">
                        {error}
                    </motion.div>
                )}

                {!route ? (
                    <div className="bg-slate-800/50 backdrop-blur-md p-8 rounded-2xl border border-slate-700/50 text-center">
                        <div className="w-16 h-16 bg-slate-700 rounded-full flex items-center justify-center mx-auto mb-4">
                            <span className="text-2xl">🚛</span>
                        </div>
                        <h2 className="text-xl font-semibold mb-2">No Active Route</h2>
                        <p className="text-slate-400 mb-6">You don't have any pending assignments at the moment.</p>
                        <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-2 rounded-lg transition-colors font-medium shadow-lg shadow-blue-500/20">
                            Check for Updates
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        
                        <div className="space-y-6">
                            {/* Workflow Card */}
                            <div className="bg-slate-800/50 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50">
                                <h3 className="text-lg font-semibold mb-4 text-blue-100 flex items-center gap-2">
                                    <span className="text-blue-400">⚡</span> Current Action
                                </h3>
                                
                                {route.status === 'ROUTE_ASSIGNED' && (
                                    <button onClick={() => handleAction('/api/driver/route-accept', {routeId: route.routeId})} className="w-full bg-emerald-600 hover:bg-emerald-500 p-4 rounded-xl font-semibold shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                                        Accept Route
                                    </button>
                                )}

                                {route.status === 'ROUTE_ACCEPTED' && (
                                    <div className="space-y-4">
                                        <input 
                                            value={qrCode} onChange={e=>setQrCode(e.target.value)} 
                                            placeholder="Scan Vehicle QR (e.g. VEHICLE:V123:1)"
                                            className="w-full bg-slate-900 border border-slate-700 rounded-xl p-3 focus:outline-none focus:border-blue-500"
                                        />
                                        <button onClick={() => handleAction('/api/driver/vehicle-checkin', {routeId: route.routeId, vehicleQrCode: qrCode})} className="w-full bg-blue-600 hover:bg-blue-500 p-4 rounded-xl font-semibold shadow-lg shadow-blue-500/20 transition-all">
                                            Check-In Vehicle
                                        </button>
                                    </div>
                                )}
                                
                                {route.status === 'ROUTE_PRE_TRIP_CHECK' && (
                                    <button onClick={() => handleAction('/api/driver/inspection', {routeId: route.routeId, vehicleId: route.vehicleId, passed: true})} className="w-full bg-amber-600 hover:bg-amber-500 p-4 rounded-xl font-semibold shadow-lg shadow-amber-500/20 transition-all">
                                        Complete Safety Inspection
                                    </button>
                                )}

                                {route.status === 'ROUTE_READY' && (
                                    <button onClick={() => handleAction('/api/driver/route-start', {routeId: route.routeId})} className="w-full bg-emerald-600 hover:bg-emerald-500 p-4 rounded-xl font-semibold shadow-lg shadow-emerald-500/20 transition-all active:scale-95">
                                        Start Route
                                    </button>
                                )}
                            </div>

                            {/* Load Stats */}
                            <div className="bg-slate-800/50 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50">
                                <h3 className="text-lg font-semibold mb-4 text-slate-200">Vehicle Load</h3>
                                <div className="h-4 bg-slate-900 rounded-full overflow-hidden mb-2">
                                    <div className="h-full bg-gradient-to-r from-blue-500 to-indigo-500" style={{width: `${(route.currentLoadKg/route.capacityKg)*100}%`}}></div>
                                </div>
                                <div className="flex justify-between text-sm text-slate-400 font-medium">
                                    <span>{route.currentLoadKg} kg loaded</span>
                                    <span>{route.capacityKg} kg capacity</span>
                                </div>
                            </div>
                        </div>

                        {/* Stops List */}
                        <div className="bg-slate-800/50 backdrop-blur-md p-6 rounded-2xl border border-slate-700/50">
                            <h3 className="text-lg font-semibold mb-4 text-slate-200">Route Stops</h3>
                            <div className="space-y-4">
                                {route.stops?.map((stop, idx) => (
                                    <div key={stop.stopId} className={`p-4 rounded-xl border ${stop.status === 'STOP_COMPLETED' ? 'bg-slate-800 border-emerald-500/30' : 'bg-slate-900/50 border-slate-700'} relative`}>
                                        <div className="flex justify-between items-start mb-2">
                                            <div className="font-semibold">Stop {idx + 1}</div>
                                            <span className={`text-xs px-2 py-1 rounded-full ${stop.status === 'STOP_COMPLETED' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-blue-500/20 text-blue-400'}`}>{stop.status}</span>
                                        </div>
                                        {stop.status === 'STOP_PLANNED' && route.status === 'ROUTE_EN_ROUTE' && (
                                            <div className="mt-4 flex gap-2">
                                                <input value={qrCode} onChange={e=>setQrCode(e.target.value)} placeholder="Scan Location QR" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                                                <button onClick={() => handleAction(`/api/routes/${route.routeId}/stops/${stop.stopId}/arrive`, {stopQrCode: qrCode})} className="bg-blue-600 hover:bg-blue-500 px-4 rounded-lg text-sm font-medium">Arrive</button>
                                            </div>
                                        )}
                                        {stop.status === 'STOP_ARRIVED' && (
                                            <div className="mt-4 flex gap-2">
                                                <input id="actualWeight" type="number" placeholder="Actual Weight (kg)" className="flex-1 bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm" />
                                                <button onClick={() => {
                                                    const w = (document.getElementById('actualWeight') as HTMLInputElement).value;
                                                    handleAction(`/api/routes/${route.routeId}/stops/${stop.stopId}/complete`, {actualWeightKg: parseFloat(w)});
                                                }} className="bg-emerald-600 hover:bg-emerald-500 px-4 rounded-lg text-sm font-medium">Complete</button>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
