import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

const BOOT_STEPS = [
  { label: 'DATA ENGINE', delay: 600 },
  { label: 'BIN NETWORK', delay: 1100 },
  { label: 'COLLECTION ENGINE', delay: 1600 },
  { label: 'RECYCLING ENGINE', delay: 2100 },
  { label: 'ROUTE OPTIMIZER', delay: 2600 },
];

interface BootScreenProps {
  onComplete: () => void;
}

const BootScreen: React.FC<BootScreenProps> = ({ onComplete }) => {
  const [activeSteps, setActiveSteps] = useState<number[]>([]);
  const [progress, setProgress] = useState(0);
  const [done, setDone] = useState(false);

  useEffect(() => {
    BOOT_STEPS.forEach((step, i) => {
      setTimeout(() => {
        setActiveSteps((prev) => [...prev, i]);
        setProgress(Math.round(((i + 1) / BOOT_STEPS.length) * 100));
      }, step.delay);
    });

    setTimeout(() => setDone(true), 3400);
  }, []);

  return (
    <motion.div
      className="fixed inset-0 flex flex-col items-center justify-center z-50 boot-overlay"
      exit={{ opacity: 0, scale: 0.98 }}
      transition={{ duration: 0.6 }}
    >
      {/* Logo */}
      <motion.div
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
        className="text-center mb-12"
      >
        <div className="text-6xl mb-6">♻</div>
        <h1 className="text-4xl font-bold tracking-[0.3em] text-white mb-2">SMART CITY</h1>
        <h2 className="text-xl tracking-[0.5em] text-emerald-400 font-light">WASTE INTELLIGENCE</h2>
      </motion.div>

      {/* Boot steps */}
      <div className="w-80 mb-8">
        <p className="text-xs text-slate-500 tracking-widest mb-4 text-center">INITIALIZING SYSTEM...</p>
        <div className="space-y-3">
          {BOOT_STEPS.map((step, i) => (
            <motion.div
              key={step.label}
              initial={{ opacity: 0, x: -20 }}
              animate={activeSteps.includes(i) ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.3 }}
              className="flex items-center gap-3"
            >
              <motion.div
                className="w-2 h-2 rounded-full"
                animate={activeSteps.includes(i) ? { backgroundColor: '#34d399' } : { backgroundColor: '#1e293b' }}
                transition={{ duration: 0.3 }}
              />
              <span className={`text-xs tracking-widest font-mono ${activeSteps.includes(i) ? 'text-emerald-400' : 'text-slate-700'}`}>
                ● {step.label}
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-80 mb-6">
        <div className="h-px bg-slate-800 rounded-full overflow-hidden">
          <motion.div
            className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400"
            style={{ width: `${progress}%` }}
            transition={{ duration: 0.4 }}
          />
        </div>
        <div className="flex justify-between mt-2">
          <span className="text-xs text-slate-600 font-mono">{progress}%</span>
        </div>
      </div>

      {/* Enter button */}
      <AnimatePresence>
        {done && (
          <motion.button
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            onClick={onComplete}
            className="mt-4 px-8 py-3 border border-emerald-500 text-emerald-400 text-xs tracking-[0.3em] font-mono
                       hover:bg-emerald-500 hover:text-black transition-all duration-300 cursor-pointer"
          >
            ENTER COMMAND CENTER
          </motion.button>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default BootScreen;
