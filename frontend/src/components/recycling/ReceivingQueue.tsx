import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';

const ReceivingQueue: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedFacility, setSelectedFacility] = useState<number | ''>('');
  
  const { data: facilities = [] } = useQuery({
    queryKey: ['recyclingFacilities'],
    queryFn: api.getRecyclingFacilities,
  });
  
  const { data: arrivalsData } = useQuery({
    queryKey: ['recyclingArrivals'],
    queryFn: api.getRecyclingArrivals,
    refetchInterval: 5000,
  });
  const arrivals = arrivalsData?.arrivals || [];

  const receiveMut = useMutation({
    mutationFn: (transferId: number) => api.receiveTransfer(transferId, Number(selectedFacility)),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recyclingArrivals'] }),
  });

  const weightMut = useMutation({
    mutationFn: (data: { transferId: number; w: number }) => 
      api.recordTransferWeight({ transferId: data.transferId, receivedWeightKg: data.w, measurementSource: 'WEIGHBRIDGE' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recyclingArrivals'] }),
  });

  const acceptMut = useMutation({
    mutationFn: (transferId: number) => api.acceptTransfer(transferId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recyclingArrivals'] });
      queryClient.invalidateQueries({ queryKey: ['recyclingBatches'] });
    },
  });

  const rejectMut = useMutation({
    mutationFn: (transferId: number) => api.rejectTransfer(transferId, 'Failed Quality Check'),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recyclingArrivals'] }),
  });

  const [weights, setWeights] = useState<Record<number, string>>({});

  const filteredArrivals = arrivals.filter(a => selectedFacility === '' || a.destinationFacilityId === Number(selectedFacility));

  return (
    <div className="space-y-4">
      <div className="flex gap-4 items-center mb-4">
        <label className="text-sm text-slate-400">Select Facility:</label>
        <select 
          value={selectedFacility} 
          onChange={e => setSelectedFacility(e.target.value ? Number(e.target.value) : '')}
          className="bg-slate-900 border border-slate-700 rounded-md px-3 py-1.5 text-sm outline-none focus:border-indigo-500"
        >
          <option value="">All Recycling Facilities</option>
          {facilities.map(f => (
            <option key={f.facilityId} value={f.facilityId}>{f.name} ({f.facilityCode})</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredArrivals.map(t => (
          <div key={t.transferId} className="glass p-5 rounded-xl border border-slate-700/50 relative overflow-hidden">
            <div className={`absolute top-0 left-0 w-1 h-full ${
              t.status === 'ARRIVED' ? 'bg-blue-500' :
              t.status === 'RECEIVING' ? 'bg-amber-500' :
              t.status === 'WEIGHT_VERIFICATION' ? 'bg-purple-500' :
              t.status === 'ACCEPTED' ? 'bg-emerald-500' : 'bg-red-500'
            }`} />
            
            <div className="flex justify-between items-start mb-3">
              <div>
                <h3 className="font-mono text-lg text-white">{t.transferCode}</h3>
                <p className="text-xs text-slate-400">Planned: {t.plannedWeightKg} kg | Loaded: {t.actualLoadedWeightKg} kg</p>
              </div>
              <span className="px-2 py-1 bg-slate-800 text-xs rounded-md text-slate-300 font-medium">
                {t.status}
              </span>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-700/50 flex gap-2">
              {t.status === 'ARRIVED' && (
                <button 
                  onClick={() => receiveMut.mutate(t.transferId)}
                  disabled={selectedFacility === ''}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium py-2 rounded-md disabled:opacity-50"
                >
                  START RECEIVING
                </button>
              )}
              
              {t.status === 'RECEIVING' && (
                <div className="flex gap-2 w-full">
                  <input 
                    type="number" 
                    placeholder="Actual Weight (kg)" 
                    value={weights[t.transferId] || ''}
                    onChange={e => setWeights({...weights, [t.transferId]: e.target.value})}
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-3 text-sm text-white"
                  />
                  <button 
                    onClick={() => weightMut.mutate({ transferId: t.transferId, w: Number(weights[t.transferId]) })}
                    disabled={!weights[t.transferId]}
                    className="bg-amber-600 hover:bg-amber-500 text-white text-xs font-medium px-4 py-2 rounded-md disabled:opacity-50"
                  >
                    VERIFY WEIGHT
                  </button>
                </div>
              )}

              {t.status === 'WEIGHT_VERIFICATION' && (
                <div className="flex gap-2 w-full">
                  <button 
                    onClick={() => acceptMut.mutate(t.transferId)}
                    className="flex-1 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-medium py-2 rounded-md"
                  >
                    ACCEPT (MASS BALANCE)
                  </button>
                  <button 
                    onClick={() => rejectMut.mutate(t.transferId)}
                    className="flex-1 bg-red-600 hover:bg-red-500 text-white text-xs font-medium py-2 rounded-md"
                  >
                    REJECT
                  </button>
                </div>
              )}
              
              {t.status === 'ACCEPTED' && (
                <div className="w-full text-center text-xs text-emerald-400 font-medium py-2 bg-emerald-900/20 rounded-md">
                  READY FOR PROCESSING BATCH
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredArrivals.length === 0 && (
          <div className="col-span-full glass p-8 text-center rounded-xl text-slate-500">
            No incoming transfers awaiting action at this facility.
          </div>
        )}
      </div>
    </div>
  );
};

export default ReceivingQueue;
