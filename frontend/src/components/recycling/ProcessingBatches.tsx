import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../../services/api';

const ProcessingBatches: React.FC = () => {
  const queryClient = useQueryClient();
  const [selectedBatchId, setSelectedBatchId] = useState<number | null>(null);
  
  const { data: batchesData } = useQuery({
    queryKey: ['recyclingBatches'],
    queryFn: api.getRecyclingBatches,
    refetchInterval: 5000,
  });
  const batches = batchesData?.batches || [];

  const { data: arrivalsData } = useQuery({
    queryKey: ['recyclingArrivals'],
    queryFn: api.getRecyclingArrivals,
  });
  
  const createBatchMut = useMutation({
    mutationFn: (data: { transferId: number; facilityId: number; inputWeightKg: number }) => api.createRecyclingBatch(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recyclingBatches'] });
    },
  });

  const completeBatchMut = useMutation({
    mutationFn: (batchId: number) => api.completeBatch(batchId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['recyclingBatches'] }),
  });

  const [newBatchTransfer, setNewBatchTransfer] = useState('');
  
  const selectedBatch = batches.find(b => b.batchId === selectedBatchId);
  const acceptedTransfers = arrivalsData?.arrivals.filter(a => a.status === 'ACCEPTED') || [];

  // State for recording actions
  const [classify, setClassify] = useState({ wasteType: '', weightKg: '' });
  const [process, setProcess] = useState({ method: '', inputKg: '', outputKg: '' });
  const [recover, setRecover] = useState({ type: '', weightKg: '', grade: '', dest: '' });
  const [residual, setResidual] = useState({ weightKg: '', cat: '', reason: '', dest: '', disp: '' });

  const classifyMut = useMutation({
    mutationFn: () => api.classifyWaste({ batchId: selectedBatchId!, wasteType: classify.wasteType, weightKg: Number(classify.weightKg) }),
    onSuccess: () => setClassify({ wasteType: '', weightKg: '' }),
  });
  const processMut = useMutation({
    mutationFn: () => api.processWaste({ batchId: selectedBatchId!, processingMethod: process.method, inputWeightKg: Number(process.inputKg), outputWeightKg: Number(process.outputKg) }),
    onSuccess: () => setProcess({ method: '', inputKg: '', outputKg: '' }),
  });
  const recoverMut = useMutation({
    mutationFn: () => api.recordRecovery({ batchId: selectedBatchId!, materialType: recover.type, weightKg: Number(recover.weightKg), qualityGrade: recover.grade, destination: recover.dest }),
    onSuccess: () => setRecover({ type: '', weightKg: '', grade: '', dest: '' }),
  });
  const residualMut = useMutation({
    mutationFn: () => api.recordResidual({ batchId: selectedBatchId!, weightKg: Number(residual.weightKg), category: residual.cat, reason: residual.reason, destination: residual.dest, disposalMethod: residual.disp }),
    onSuccess: () => setResidual({ weightKg: '', cat: '', reason: '', dest: '', disp: '' }),
  });

  return (
    <div className="flex gap-6 h-[70vh]">
      {/* Batches List Sidebar */}
      <div className="w-1/3 flex flex-col gap-4">
        <div className="glass p-4 rounded-xl border border-slate-700/50">
          <h3 className="text-sm font-semibold text-white mb-3">Create New Batch</h3>
          <div className="flex gap-2">
            <select 
              className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-2 py-1.5 text-xs text-white"
              value={newBatchTransfer}
              onChange={e => setNewBatchTransfer(e.target.value)}
            >
              <option value="">Select Accepted Transfer...</option>
              {acceptedTransfers.map(t => (
                <option key={t.transferId} value={t.transferId}>
                  {t.transferCode} ({t.actualDeliveredWeightKg}kg)
                </option>
              ))}
            </select>
            <button 
              onClick={() => {
                const t = acceptedTransfers.find(x => x.transferId === Number(newBatchTransfer));
                if (t) createBatchMut.mutate({ transferId: t.transferId, facilityId: t.destinationFacilityId, inputWeightKg: t.actualDeliveredWeightKg });
              }}
              disabled={!newBatchTransfer}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-3 py-1.5 rounded-md text-xs font-medium disabled:opacity-50"
            >
              CREATE
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto pr-2 space-y-2">
          {batches.map(b => (
            <div 
              key={b.batchId} 
              onClick={() => setSelectedBatchId(b.batchId)}
              className={`p-3 rounded-lg cursor-pointer border ${selectedBatchId === b.batchId ? 'bg-indigo-900/40 border-indigo-500' : 'glass border-slate-700/50 hover:bg-slate-800/60'}`}
            >
              <div className="flex justify-between items-center">
                <span className="font-mono font-medium text-white">{b.batchCode}</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">STATUS: {b.status}</span>
              </div>
              <div className="mt-2 flex gap-4 text-xs text-slate-400">
                <span>In: {b.inputWeightKg}kg</span>
                <span>Rec: {b.recoveredWeightKg}kg</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail Area */}
      <div className="flex-1 glass p-6 rounded-xl border border-slate-700/50 overflow-y-auto">
        {selectedBatch ? (
          <div>
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-xl font-bold text-white mb-1">{selectedBatch.batchCode} Operations</h2>
                <div className="flex gap-4 text-sm text-slate-400">
                  <span>Input: {selectedBatch.inputWeightKg} kg</span>
                  <span>Processed: {selectedBatch.processedWeightKg} kg</span>
                  <span className="text-emerald-400">Recovered: {selectedBatch.recoveredWeightKg} kg</span>
                  <span className="text-red-400">Residual: {selectedBatch.residualWeightKg} kg</span>
                </div>
              </div>
              {selectedBatch.status !== 'COMPLETED' && (
                <button 
                  onClick={() => completeBatchMut.mutate(selectedBatch.batchId)}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  COMPLETE BATCH
                </button>
              )}
            </div>

            {selectedBatch.status !== 'COMPLETED' ? (
              <div className="grid grid-cols-2 gap-6">
                {/* Classify */}
                <div className="p-4 border border-slate-700/50 rounded-xl bg-slate-900/50 col-span-2">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Record Waste Classification</h4>
                  <div className="flex gap-2">
                    <input type="text" placeholder="Waste Type (e.g. Plastic PET)" className="flex-1 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white" value={classify.wasteType} onChange={e => setClassify({...classify, wasteType: e.target.value})} />
                    <input type="number" placeholder="Weight Kg" className="w-1/3 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white" value={classify.weightKg} onChange={e => setClassify({...classify, weightKg: e.target.value})} />
                    <button onClick={() => classifyMut.mutate()} className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs px-4 py-2 rounded-md font-medium">CLASSIFY</button>
                  </div>
                </div>
                
                {/* Process */}
                <div className="p-4 border border-slate-700/50 rounded-xl bg-slate-900/50">
                  <h4 className="text-sm font-semibold text-slate-300 mb-3">Record Processing</h4>
                  <div className="space-y-3">
                    <input type="text" placeholder="Processing Method (e.g., Shredding)" className="w-full bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white" value={process.method} onChange={e => setProcess({...process, method: e.target.value})} />
                    <div className="flex gap-2">
                      <input type="number" placeholder="Input Kg" className="w-1/2 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white" value={process.inputKg} onChange={e => setProcess({...process, inputKg: e.target.value})} />
                      <input type="number" placeholder="Output Kg" className="w-1/2 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white" value={process.outputKg} onChange={e => setProcess({...process, outputKg: e.target.value})} />
                    </div>
                    <button onClick={() => processMut.mutate()} className="w-full bg-indigo-600 hover:bg-indigo-500 text-white text-xs py-2 rounded-md font-medium">RECORD PROCESS</button>
                  </div>
                </div>

                {/* Recover */}
                <div className="p-4 border border-emerald-900/50 rounded-xl bg-emerald-900/10">
                  <h4 className="text-sm font-semibold text-emerald-400 mb-3">Record Recovery</h4>
                  <div className="space-y-3">
                    <div className="flex gap-2">
                      <input type="text" placeholder="Material Type" className="w-1/2 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white" value={recover.type} onChange={e => setRecover({...recover, type: e.target.value})} />
                      <input type="number" placeholder="Weight Kg" className="w-1/2 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white" value={recover.weightKg} onChange={e => setRecover({...recover, weightKg: e.target.value})} />
                    </div>
                    <div className="flex gap-2">
                      <input type="text" placeholder="Grade (A/B/C)" className="w-1/4 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white" value={recover.grade} onChange={e => setRecover({...recover, grade: e.target.value})} />
                      <input type="text" placeholder="Destination Buyer" className="w-3/4 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white" value={recover.dest} onChange={e => setRecover({...recover, dest: e.target.value})} />
                    </div>
                    <button onClick={() => recoverMut.mutate()} className="w-full bg-emerald-600 hover:bg-emerald-500 text-white text-xs py-2 rounded-md font-medium">LOG RECOVERED MATERIAL</button>
                  </div>
                </div>

                {/* Residual */}
                <div className="p-4 border border-red-900/50 rounded-xl bg-red-900/10 col-span-2">
                  <h4 className="text-sm font-semibold text-red-400 mb-3">Record Residual (Reject/Landfill)</h4>
                  <div className="flex gap-3 items-end">
                    <div className="flex-1 space-y-3">
                      <div className="flex gap-2">
                        <input type="number" placeholder="Weight Kg" className="w-1/3 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white" value={residual.weightKg} onChange={e => setResidual({...residual, weightKg: e.target.value})} />
                        <input type="text" placeholder="Category" className="w-2/3 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white" value={residual.cat} onChange={e => setResidual({...residual, cat: e.target.value})} />
                      </div>
                      <div className="flex gap-2">
                        <input type="text" placeholder="Disposal Method" className="w-1/3 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white" value={residual.disp} onChange={e => setResidual({...residual, disp: e.target.value})} />
                        <input type="text" placeholder="Reason" className="w-2/3 bg-slate-900 border border-slate-700 rounded-md px-3 py-2 text-sm text-white" value={residual.reason} onChange={e => setResidual({...residual, reason: e.target.value})} />
                      </div>
                    </div>
                    <button onClick={() => residualMut.mutate()} className="bg-red-600 hover:bg-red-500 text-white text-xs px-6 py-2 rounded-md font-medium h-fit mb-1">LOG RESIDUAL</button>
                  </div>
                </div>

              </div>
            ) : (
              <div className="text-center py-12 text-slate-400">
                This batch has been marked as completed and is locked.
              </div>
            )}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-slate-500">
            Select a batch to manage operations
          </div>
        )}
      </div>
    </div>
  );
};

export default ProcessingBatches;
