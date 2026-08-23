import React, { useEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

interface KPICardProps {
  label: string;
  value: number;
  unit?: string;
  suffix?: string;
  color?: string;
  icon?: string;
  trend?: string;
  decimal?: number;
}

const KPICard: React.FC<KPICardProps> = ({
  label, value, unit, suffix, color = '#34d399', icon, trend, decimal = 0
}) => {
  const [displayed, setDisplayed] = useState(0);
  const rafRef = useRef<number>(0);
  const startRef = useRef<number>(0);
  const duration = 1200;

  useEffect(() => {
    const start = performance.now();
    startRef.current = start;
    const from = displayed;

    const animate = (now: number) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3); // ease-out-cubic
      setDisplayed(from + (value - from) * eased);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate);
      }
    };

    rafRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(rafRef.current);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="glass glass-hover p-5 rounded-2xl flex flex-col gap-3"
      style={{ borderTop: `1px solid ${color}22` }}
    >
      <div className="flex items-center justify-between">
        <span className="text-xs text-slate-500 tracking-widest font-medium">{label}</span>
        {icon && <span className="text-lg">{icon}</span>}
      </div>

      <div className="flex items-end gap-1">
        {unit && <span className="text-sm text-slate-400 mb-1">{unit}</span>}
        <span className="text-3xl font-bold" style={{ color, fontVariantNumeric: 'tabular-nums' }}>
          {displayed.toFixed(decimal).replace(/\B(?=(\d{3})+(?!\d))/g, ',')}
        </span>
        {suffix && <span className="text-sm text-slate-400 mb-1">{suffix}</span>}
      </div>

      {trend && (
        <div className="text-xs text-slate-500">{trend}</div>
      )}
    </motion.div>
  );
};

export default KPICard;
