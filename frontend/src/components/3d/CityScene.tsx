import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import * as THREE from 'three';
import type { Bin, Vehicle } from '../../types';

// ─── Building ───────────────────────────────────────────────
const Building: React.FC<{ position: [number, number, number]; height: number; color?: string }> = ({ position, height, color = '#1a2a3a' }) => {
  return (
    <mesh position={[position[0], height / 2, position[2]]} castShadow>
      <boxGeometry args={[1.2, height, 1.2]} />
      <meshStandardMaterial color={color} metalness={0.3} roughness={0.7} />
    </mesh>
  );
};

// ─── Depot ──────────────────────────────────────────────────
const Depot: React.FC<{ position: [number, number, number] }> = ({ position }) => (
  <group position={position}>
    <mesh position={[0, 0.6, 0]} castShadow>
      <boxGeometry args={[3, 1.2, 2]} />
      <meshStandardMaterial color="#1a3a2a" metalness={0.4} roughness={0.6} />
    </mesh>
    <mesh position={[0, 1.4, 0]}>
      <boxGeometry args={[3.2, 0.15, 2.2]} />
      <meshStandardMaterial color="#34d399" metalness={0.6} roughness={0.3} />
    </mesh>
    <pointLight position={[0, 2, 0]} intensity={1.5} color="#34d399" distance={5} />
  </group>
);

// ─── Smart Bin 3D ────────────────────────────────────────────
interface SmartBin3DProps {
  bin: Bin;
  position: [number, number, number];
  onClick: (bin: Bin) => void;
}

const SmartBin3D: React.FC<SmartBin3DProps> = ({ bin, position, onClick }) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const fillRef = useRef<THREE.Mesh>(null);

  const statusColor = {
    NORMAL:   '#34d399',
    WARNING:  '#fbbf24',
    CRITICAL: '#ef4444',
    OVERFLOW: '#ef4444',
  }[bin.status] ?? '#34d399';

  useFrame((_, delta) => {
    if (!meshRef.current) return;
    if (bin.status === 'OVERFLOW') {
      meshRef.current.rotation.y += delta * 1.5;
    }
  });

  const fillHeight = Math.min(bin.fillPercent, 100) / 100 * 0.8;

  return (
    <group position={position} onClick={() => onClick(bin)}>
      {/* Bin body */}
      <mesh ref={meshRef} position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.35, 1, 8]} />
        <meshStandardMaterial color="#1e293b" metalness={0.5} roughness={0.4} />
      </mesh>

      {/* Bin lid */}
      <mesh position={[0, 1.05, 0]}>
        <cylinderGeometry args={[0.32, 0.30, 0.1, 8]} />
        <meshStandardMaterial color={statusColor} metalness={0.6} roughness={0.2} />
      </mesh>

      {/* Fill level */}
      <mesh ref={fillRef} position={[0, fillHeight / 2 + 0.05, 0]}>
        <cylinderGeometry args={[0.27, 0.31, fillHeight, 8]} />
        <meshStandardMaterial color={statusColor} transparent opacity={0.7} />
      </mesh>

      {/* Status glow light */}
      <pointLight position={[0, 1.5, 0]} intensity={bin.status !== 'NORMAL' ? 2 : 0.4}
                  color={statusColor} distance={3} />

      {/* Hover tooltip base plate */}
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[0.5, 16]} />
        <meshStandardMaterial color={statusColor} transparent opacity={0.15} />
      </mesh>
    </group>
  );
};

// ─── Truck ──────────────────────────────────────────────────
interface TruckProps {
  vehicle: Vehicle;
  routePoints: THREE.Vector3[];
}

const Truck: React.FC<TruckProps> = ({ vehicle, routePoints }) => {
  const ref = useRef<THREE.Group>(null);
  const tRef = useRef(0);

  const color = vehicle.status === 'ON_ROUTE' || vehicle.status === 'ASSIGNED' ? '#22d3ee' : '#475569';

  useFrame((_, delta) => {
    if (!ref.current || routePoints.length < 2) return;
    tRef.current = (tRef.current + delta * 0.15) % 1;
    const t = tRef.current;
    const segCount = routePoints.length - 1;
    const seg = Math.floor(t * segCount);
    const segT = (t * segCount) % 1;
    const p1 = routePoints[Math.min(seg, segCount - 1)];
    const p2 = routePoints[Math.min(seg + 1, segCount)];
    const pos = new THREE.Vector3().lerpVectors(p1, p2, segT);
    ref.current.position.copy(pos);
    const dir = new THREE.Vector3().subVectors(p2, p1).normalize();
    if (dir.length() > 0) {
      ref.current.lookAt(pos.clone().add(dir));
    }
  });

  return (
    <group ref={ref} position={routePoints[0] ?? [0, 0, 0]}>
      {/* Cab */}
      <mesh position={[0.3, 0.35, 0]} castShadow>
        <boxGeometry args={[0.6, 0.7, 0.5]} />
        <meshStandardMaterial color={color} metalness={0.5} roughness={0.3} />
      </mesh>
      {/* Body */}
      <mesh position={[-0.25, 0.25, 0]} castShadow>
        <boxGeometry args={[1.0, 0.5, 0.5]} />
        <meshStandardMaterial color="#334155" metalness={0.4} roughness={0.5} />
      </mesh>
      {/* Headlight glow */}
      <pointLight position={[0.65, 0.35, 0]} intensity={1.5} color="#22d3ee" distance={4} />
    </group>
  );
};

// ─── Road ───────────────────────────────────────────────────
const Road: React.FC<{ from: [number, number, number]; to: [number, number, number] }> = ({ from, to }) => {
  const points = [new THREE.Vector3(...from), new THREE.Vector3(...to)];
  const curve = new THREE.LineCurve3(...points);
  return (
    <mesh>
      <tubeGeometry args={[curve, 1, 0.06, 4, false]} />
      <meshStandardMaterial color="#1e293b" />
    </mesh>
  );
};

// ─── Main CityScene ─────────────────────────────────────────
interface CitySceneProps {
  bins: Bin[];
  vehicles: Vehicle[];
  onBinClick: (bin: Bin) => void;
}

// Fixed positions for city elements
const BIN_POSITIONS: [number, number, number][] = [
  [-5, 0, -3], [-2, 0, -5], [2, 0, -4], [5, 0, -2],
  [4, 0, 2], [1, 0, 5], [-3, 0, 4], [-6, 0, 1],
  [0, 0, 0], [3, 0, -1], [-1, 0, 2], [6, 0, -5],
  [-4, 0, -6], [2, 0, 6], [-6, 0, -4],
];

const BUILDING_DEFS = [
  { pos: [-7, 0, -6] as [number, number, number], h: 4 },
  { pos: [-6, 0, 0] as [number, number, number], h: 3 },
  { pos: [6, 0, -6] as [number, number, number], h: 5 },
  { pos: [7, 0, 2] as [number, number, number], h: 3.5 },
  { pos: [-3, 0, 7] as [number, number, number], h: 2.5 },
  { pos: [4, 0, 7] as [number, number, number], h: 4 },
  { pos: [-7, 0, 5] as [number, number, number], h: 3 },
  { pos: [0, 0, -7] as [number, number, number], h: 6 },
];

const ROUTE_POINTS: THREE.Vector3[] = [
  new THREE.Vector3(-8, 0.2, 0), // Depot
  new THREE.Vector3(-5, 0.2, -3),
  new THREE.Vector3(2, 0.2, -4),
  new THREE.Vector3(5, 0.2, 2),
  new THREE.Vector3(1, 0.2, 5),
  new THREE.Vector3(-8, 0.2, 0),
];

// Interactive 2D Fallback Visualizer
const Interactive2DCity: React.FC<CitySceneProps> = ({ bins, vehicles, onBinClick }) => {
  return (
    <div className="relative w-full h-full bg-slate-950 flex flex-col items-center justify-center p-4 select-none overflow-hidden">
      {/* Grid Pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(52,211,153,0.06)_1px,transparent_1px),linear-gradient(90deg,rgba(52,211,153,0.06)_1px,transparent_1px)] bg-[size:32px_32px]" />
      
      {/* City Center Radar Indicator */}
      <div className="absolute w-72 h-72 rounded-full border border-emerald-500/10 animate-pulse pointer-events-none" />
      <div className="absolute w-96 h-96 rounded-full border border-blue-500/10 pointer-events-none" />

      <div className="relative z-10 w-full max-w-4xl h-full flex flex-col justify-between">
        <div className="flex justify-between items-center text-xs font-mono text-slate-400 border-b border-slate-800/80 pb-2">
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="text-emerald-400 font-bold">SMART TELEMETRY GRID</span>
          </div>
          <div>{bins.length} Active Bins &bull; {vehicles.length} Fleet Vehicles</div>
        </div>

        {/* Interactive Bins Grid Map */}
        <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 my-auto py-2">
          {bins.slice(0, 10).map((bin) => {
            const isCritical = bin.status === 'CRITICAL' || bin.status === 'OVERFLOW';
            const isWarning = bin.status === 'WARNING';
            const badgeColor = isCritical ? 'border-red-500 bg-red-500/10 text-red-400' : isWarning ? 'border-amber-500 bg-amber-500/10 text-amber-400' : 'border-emerald-500 bg-emerald-500/10 text-emerald-400';

            return (
              <button
                key={bin.binId}
                onClick={() => onBinClick(bin)}
                className={`p-3 rounded-xl border ${badgeColor} transition-all hover:scale-105 text-left flex flex-col justify-between bg-slate-900/80 backdrop-blur shadow-md`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="text-[11px] font-bold font-mono">#{bin.binId}</span>
                  <span className="text-[10px] uppercase font-mono px-1 rounded bg-black/40">{bin.status}</span>
                </div>
                <div className="text-xs text-white font-medium truncate mb-2">{bin.location}</div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${isCritical ? 'bg-red-500' : isWarning ? 'bg-amber-400' : 'bg-emerald-400'}`}
                    style={{ width: `${Math.min(bin.fillPercent, 100)}%` }}
                  />
                </div>
                <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1">
                  <span>{bin.wasteType}</span>
                  <span className="font-bold text-slate-200">{bin.fillPercent.toFixed(0)}%</span>
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-between items-center text-[11px] text-slate-500 font-mono pt-2 border-t border-slate-800/80">
          <span>Click any smart bin node to inspect live load diagnostics</span>
          <span className="text-emerald-400">STATUS: TELEMETRY ACTIVE</span>
        </div>
      </div>
    </div>
  );
};

const CityScene: React.FC<CitySceneProps> = (props) => {
  const [webGlAvailable, setWebGlAvailable] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      setWebGlAvailable(Boolean(gl));
    } catch {
      setWebGlAvailable(false);
    }
  }, []);

  if (webGlAvailable === false) {
    return <Interactive2DCity {...props} />;
  }

  const { bins, vehicles, onBinClick } = props;
  const groundRef = useRef<THREE.Mesh>(null);
  const displayedBins = useMemo(() => bins.slice(0, 15), [bins]);
  const activeVehicle = useMemo(() => vehicles.find(v => v.status === 'ON_ROUTE' || v.status === 'ASSIGNED') ?? vehicles[0], [vehicles]);

  return (
    <Canvas
      shadows
      camera={{ position: [12, 10, 12], fov: 50 }}
      style={{ background: '#020810' }}
      onCreated={({ gl }) => {
        gl.domElement.addEventListener('webglcontextlost', (e) => {
          e.preventDefault();
          setWebGlAvailable(false);
        }, false);
      }}
    >
      <ambientLight intensity={0.4} color="#94a3b8" />
      <directionalLight position={[10, 15, 10]} intensity={0.8} castShadow color="#f8fafc" />
      <pointLight position={[0, 8, 0]} intensity={0.6} color="#38bdf8" />
      <hemisphereLight args={['#38bdf8', '#0f172a', 0.5]} />

      {/* Ground grid */}
      <mesh ref={groundRef} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[40, 40, 20, 20]} />
        <meshStandardMaterial color="#0a1520" wireframe opacity={0.3} transparent />
      </mesh>

      {/* Solid ground */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <planeGeometry args={[40, 40]} />
        <meshStandardMaterial color="#0a1520" />
      </mesh>

      {/* Depot */}
      <Depot position={[-8, 0, 0]} />

      {/* Buildings */}
      {BUILDING_DEFS.map((b, i) => (
        <Building key={i} position={b.pos} height={b.h} />
      ))}

      {/* Roads */}
      {ROUTE_POINTS.slice(0, -1).map((pt, i) => (
        <Road key={i} from={pt.toArray() as [number,number,number]} to={ROUTE_POINTS[i + 1].toArray() as [number,number,number]} />
      ))}

      {/* Smart Bins */}
      {displayedBins.map((bin, i) => (
        <SmartBin3D
          key={bin.binId}
          bin={bin}
          position={BIN_POSITIONS[i % BIN_POSITIONS.length]}
          onClick={onBinClick}
        />
      ))}

      {/* Active truck */}
      {activeVehicle && <Truck vehicle={activeVehicle} routePoints={ROUTE_POINTS} />}

      {/* Fog for depth */}
      <fog attach="fog" args={['#020810', 25, 50]} />

      <OrbitControls
        enablePan={false}
        minPolarAngle={0.2}
        maxPolarAngle={Math.PI / 2.2}
        minDistance={8}
        maxDistance={30}
        autoRotate
        autoRotateSpeed={0.3}
      />
    </Canvas>
  );
};

export default CityScene;
