import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
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
    {/* DEPOT sign glow */}
    <pointLight position={[0, 2, 0]} intensity={1} color="#34d399" distance={5} />
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
      <pointLight position={[0, 1.5, 0]} intensity={bin.status !== 'NORMAL' ? 2 : 0.3}
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

const CityScene: React.FC<CitySceneProps> = ({ bins, vehicles, onBinClick }) => {
  const groundRef = useRef<THREE.Mesh>(null);

  const displayedBins = useMemo(() => bins.slice(0, 15), [bins]);
  const activeVehicle = useMemo(() => vehicles.find(v => v.status === 'ON_ROUTE' || v.status === 'ASSIGNED') ?? vehicles[0], [vehicles]);

  return (
    <Canvas
      shadows
      camera={{ position: [12, 10, 12], fov: 50 }}
      style={{ background: 'transparent' }}
    >
      <ambientLight intensity={0.15} color="#1a2a4a" />
      <directionalLight position={[10, 15, 10]} intensity={0.4} castShadow color="#e2e8f0" />
      <pointLight position={[0, 8, 0]} intensity={0.5} color="#0d2a3a" />

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
      <Environment preset="night" />
    </Canvas>
  );
};

export default CityScene;
