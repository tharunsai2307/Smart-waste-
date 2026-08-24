import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';

export default function DispatchDashboard() {
    const [stats, setStats] = useState<any>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetch('/api/operations/live')
            .then(res => res.json())
            .then(data => {
                setStats(data);
                setLoading(false);
            })
            .catch(() => setLoading(false));
    }, []);

    if (loading) return <div className="p-8 text-white">Loading operations data...</div>;

    if (!stats || stats.activeRoutes === 0) {
        return (
            <div className="min-h-screen bg-slate-950 text-white flex items-center justify-center">
                <div className="text-center p-8 bg-slate-900/50 rounded-3xl border border-slate-800">
                    <h2 className="text-2xl font-bold text-slate-400">NO ACTIVE OPERATIONS</h2>
                    <p className="text-slate-500 mt-2">All routes are currently inactive or completed.</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-slate-950 text-white p-8">
            <header className="mb-10">
                <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-400 bg-clip-text text-transparent">
                    Operations Command Center
                </h1>
                <p className="text-slate-400 mt-2">Live Fleet & Collection Tracking</p>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
                <StatCard title="Active Routes" value={stats.activeRoutes} color="blue" />
                <StatCard title="Active Vehicles" value={stats.activeVehicles} color="indigo" />
                <StatCard title="Stops in Progress" value={stats.stopsInProgress} color="emerald" />
                <StatCard title="Failed Inspections" value={stats.failedInspections} color="red" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Incidents / Variances */}
                <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
                    <h3 className="text-xl font-bold mb-6 text-slate-200">Weight Variances & Incidents</h3>
                    <div className="space-y-4">
                        {stats.incidents?.length > 0 ? stats.incidents.map((inc: any) => (
                            <div key={inc.incidentId} className="bg-slate-800/50 p-4 rounded-xl border border-slate-700/50 flex justify-between items-center">
                                <div>
                                    <span className="text-red-400 font-semibold text-sm">{inc.type}</span>
                                    <p className="text-slate-300 mt-1">{inc.description}</p>
                                </div>
                                <span className="text-xs text-slate-500">{inc.timestamp}</span>
                            </div>
                        )) : (
                            <div className="text-slate-500 italic">No active incidents.</div>
                        )}
                    </div>
                </div>

                {/* Live Fleet */}
                <div className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800">
                    <h3 className="text-xl font-bold mb-6 text-slate-200">Live Fleet Load</h3>
                    <div className="space-y-6">
                        {stats.vehicles?.map((v: any) => (
                            <div key={v.vehicleId}>
                                <div className="flex justify-between mb-2 text-sm">
                                    <span className="font-semibold text-slate-300">Vehicle {v.vehicleId}</span>
                                    <span className={v.utilizationPercentage > 90 ? 'text-red-400' : 'text-slate-400'}>
                                        {v.currentLoadKg} / {v.capacityKg} kg ({v.utilizationPercentage.toFixed(1)}%)
                                    </span>
                                </div>
                                <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                                    <motion.div 
                                        initial={{width: 0}}
                                        animate={{width: `${v.utilizationPercentage}%`}}
                                        className={`h-full ${v.utilizationPercentage > 90 ? 'bg-red-500' : 'bg-blue-500'}`}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}

function StatCard({title, value, color}: {title: string, value: number, color: string}) {
    const colorClasses = {
        blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
        indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
        emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
        red: 'text-red-400 bg-red-500/10 border-red-500/20',
    } as Record<string, string>;
    
    return (
        <div className={`p-6 rounded-3xl border ${colorClasses[color]} flex flex-col justify-between`}>
            <h4 className="text-sm font-medium opacity-80 uppercase tracking-wider mb-4">{title}</h4>
            <span className="text-4xl font-bold">{value}</span>
        </div>
    );
}
