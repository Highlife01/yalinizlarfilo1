import { useMemo, useRef, type Dispatch, type SetStateAction } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Html, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import { Button } from "@/components/ui/button";
import { RotateCcw } from "lucide-react";

export type DamagePoint3D = {
    position: [number, number, number];
    type: string;
};

type VehiclePreset = {
    label: string;
    bodyColor: string;
    glassColor: string;
    wheelColor: string;
    scale: number;
    length: number;
    width: number;
    lowerHeight: number;
    hoodLength: number;
    hoodHeight: number;
    cabinLength: number;
    cabinHeight: number;
    trunkLength: number;
    trunkHeight: number;
    frontWheelX: number;
    rearWheelX: number;
    wheelY: number;
    wheelZ: number;
};

const VEHICLE_PRESETS = {
    sedan_default: {
        label: "Premium Sedan",
        bodyColor: "#1e293b",
        glassColor: "#0f172a",
        wheelColor: "#09090b",
        scale: 1,
        length: 2.55,
        width: 1.05,
        lowerHeight: 0.35,
        hoodLength: 0.82,
        hoodHeight: 0.26,
        cabinLength: 1.1,
        cabinHeight: 0.52,
        trunkLength: 0.65,
        trunkHeight: 0.24,
        frontWheelX: 0.82,
        rearWheelX: -0.76,
        wheelY: 0.16,
        wheelZ: 0.54,
    },
    megane_2025: {
        label: "Renault Megane 2025",
        bodyColor: "#e2e8f0",
        glassColor: "#020617",
        wheelColor: "#111827",
        scale: 1.05,
        length: 2.65,
        width: 1.08,
        lowerHeight: 0.36,
        hoodLength: 0.88,
        hoodHeight: 0.27,
        cabinLength: 1.15,
        cabinHeight: 0.55,
        trunkLength: 0.68,
        trunkHeight: 0.25,
        frontWheelX: 0.86,
        rearWheelX: -0.82,
        wheelY: 0.17,
        wheelZ: 0.56,
    },
    corsa_2026: {
        label: "Opel Corsa 2026",
        bodyColor: "#ef4444",
        glassColor: "#0f172a",
        wheelColor: "#09090b",
        scale: 0.95,
        length: 2.25,
        width: 1.0,
        lowerHeight: 0.34,
        hoodLength: 0.68,
        hoodHeight: 0.24,
        cabinLength: 1.05,
        cabinHeight: 0.56,
        trunkLength: 0.45,
        trunkHeight: 0.22,
        frontWheelX: 0.72,
        rearWheelX: -0.68,
        wheelY: 0.15,
        wheelZ: 0.51,
    },
} satisfies Record<string, VehiclePreset>;

type VehiclePresetKey = keyof typeof VEHICLE_PRESETS;

const resolvePresetKey = (vehicleName?: string): VehiclePresetKey => {
    const normalized = (vehicleName || "").toLowerCase();

    if (normalized.includes("megane")) return "megane_2025";
    if (normalized.includes("corsa")) return "corsa_2026";
    return "sedan_default";
};

function CarMeshes({
    preset,
    onMarkDamage,
}: {
    preset: VehiclePreset;
    onMarkDamage: (localPoint: THREE.Vector3) => void;
}) {
    const getLocalPoint = (event: { point: THREE.Vector3; object: THREE.Object3D }) => {
        const parent = event.object.parent;
        if (!parent) return event.point.clone();

        const worldToLocal = parent.matrixWorld.clone().invert();
        return event.point.clone().applyMatrix4(worldToLocal);
    };

    const markDamage = (event: { stopPropagation: () => void; point: THREE.Vector3; object: THREE.Object3D }) => {
        event.stopPropagation();
        onMarkDamage(getLocalPoint(event));
    };

    const bodyMaterial = (
        <meshPhysicalMaterial
            color={preset.bodyColor}
            metalness={0.75}
            roughness={0.15}
            envMapIntensity={1.2}
            clearcoat={1}
            clearcoatRoughness={0.1}
        />
    );
    const darkMaterial = (
        <meshStandardMaterial color="#09090b" roughness={0.8} />
    );

    const lowerY = preset.lowerHeight / 2 + 0.04;
    const hoodY = preset.lowerHeight + preset.hoodHeight / 2 - 0.01;
    const cabinY = preset.lowerHeight + preset.cabinHeight / 2 + 0.03;
    const trunkY = preset.lowerHeight + preset.trunkHeight / 2 + 0.02;

    const hoodX = preset.length * 0.29;
    const cabinX = -preset.length * 0.04;
    const trunkX = -preset.length * 0.36;

    return (
        <group>
            {/* Main Body */}
            <RoundedBox
                args={[preset.length, preset.lowerHeight, preset.width]}
                radius={0.08}
                smoothness={4}
                position={[0, lowerY, 0]}
                castShadow
                receiveShadow
                onPointerDown={markDamage}
            >
                {bodyMaterial}
            </RoundedBox>

            {/* Hood */}
            <RoundedBox
                args={[preset.hoodLength, preset.hoodHeight, preset.width * 0.98]}
                radius={0.06}
                smoothness={4}
                position={[hoodX, hoodY, 0]}
                castShadow
                receiveShadow
                onPointerDown={markDamage}
            >
                {bodyMaterial}
            </RoundedBox>

            {/* Cabin */}
            <RoundedBox
                args={[preset.cabinLength, preset.cabinHeight, preset.width * 0.96]}
                radius={0.12}
                smoothness={4}
                position={[cabinX, cabinY, 0]}
                castShadow
                receiveShadow
                onPointerDown={markDamage}
            >
                {bodyMaterial}
            </RoundedBox>

            {/* Trunk */}
            <RoundedBox
                args={[preset.trunkLength, preset.trunkHeight, preset.width * 0.95]}
                radius={0.06}
                smoothness={4}
                position={[trunkX, trunkY, 0]}
                castShadow
                receiveShadow
                onPointerDown={markDamage}
            >
                {bodyMaterial}
            </RoundedBox>

            {/* Exhaust */}
            <mesh position={[-preset.length / 2 - 0.01, lowerY - 0.1, preset.width * 0.3]}>
                <cylinderGeometry args={[0.04, 0.04, 0.08, 16]} />
                <meshStandardMaterial color="#475569" metalness={1} roughness={0.2} />
            </mesh>
            <mesh position={[-preset.length / 2 - 0.01, lowerY - 0.1, -preset.width * 0.3]}>
                <cylinderGeometry args={[0.04, 0.04, 0.08, 16]} />
                <meshStandardMaterial color="#475569" metalness={1} roughness={0.2} />
            </mesh>

            {/* Aerodynamic Lines & details */}
            {/* Front Bumper Lip */}
            <mesh position={[preset.length / 2 + 0.01, lowerY - 0.12, 0]}>
                <boxGeometry args={[0.02, 0.04, preset.width * 0.9]} />
                {darkMaterial}
            </mesh>

            {/* Side Skirts */}
            <mesh position={[0, lowerY - 0.12, preset.width / 2 + 0.01]}>
                <boxGeometry args={[preset.length * 0.65, 0.04, 0.02]} />
                {darkMaterial}
            </mesh>
            <mesh position={[0, lowerY - 0.12, -preset.width / 2 - 0.01]}>
                <boxGeometry args={[preset.length * 0.65, 0.04, 0.02]} />
                {darkMaterial}
            </mesh>

            {/* Windshield (Front Glass) */}
            <mesh position={[hoodX - preset.hoodLength * 0.35, preset.lowerHeight + 0.34, 0]} rotation={[0, 0, -Math.PI / 4.5]} castShadow onPointerDown={markDamage}>
                <boxGeometry args={[0.02, 0.48, preset.width * 0.92]} />
                <meshStandardMaterial color={preset.glassColor} metalness={0.9} roughness={0} transparent opacity={0.7} envMapIntensity={1.5} />
            </mesh>

            {/* Rear Glass */}
            <mesh position={[trunkX + preset.trunkLength * 0.3, preset.lowerHeight + 0.33, 0]} rotation={[0, 0, Math.PI / 3.8]} castShadow onPointerDown={markDamage}>
                <boxGeometry args={[0.02, 0.45, preset.width * 0.9]} />
                <meshStandardMaterial color={preset.glassColor} metalness={0.9} roughness={0} transparent opacity={0.7} envMapIntensity={1.5} />
            </mesh>

            {/* Side Windows */}
            <mesh position={[cabinX, preset.lowerHeight + 0.29, preset.width * 0.473]} castShadow onPointerDown={markDamage}>
                <boxGeometry args={[preset.cabinLength * 0.82, 0.24, 0.01]} />
                <meshStandardMaterial color={preset.glassColor} metalness={0.9} roughness={0} transparent opacity={0.65} envMapIntensity={1} />
            </mesh>
            <mesh position={[cabinX, preset.lowerHeight + 0.29, -preset.width * 0.473]} castShadow onPointerDown={markDamage}>
                <boxGeometry args={[preset.cabinLength * 0.82, 0.24, 0.01]} />
                <meshStandardMaterial color={preset.glassColor} metalness={0.9} roughness={0} transparent opacity={0.65} envMapIntensity={1} />
            </mesh>

            {/* Window Trims */}
            <mesh position={[cabinX, preset.lowerHeight + 0.42, preset.width * 0.475]}>
                <boxGeometry args={[preset.cabinLength * 0.83, 0.02, 0.015]} />
                {darkMaterial}
            </mesh>
            <mesh position={[cabinX, preset.lowerHeight + 0.42, -preset.width * 0.475]}>
                <boxGeometry args={[preset.cabinLength * 0.83, 0.02, 0.015]} />
                {darkMaterial}
            </mesh>

            {/* Wheels */}
            {[
                [preset.frontWheelX, preset.wheelY, preset.wheelZ],
                [preset.frontWheelX, preset.wheelY, -preset.wheelZ],
                [preset.rearWheelX, preset.wheelY, preset.wheelZ],
                [preset.rearWheelX, preset.wheelY, -preset.wheelZ],
            ].map((position, index) => (
                <group key={index} position={position as [number, number, number]}>
                    <mesh castShadow>
                        <cylinderGeometry args={[0.2, 0.2, 0.16, 36]} />
                        <meshStandardMaterial color="#020617" metalness={0.5} roughness={0.8} /> {/* Tire */}
                    </mesh>
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.13, 0.13, 0.17, 16]} />
                        <meshStandardMaterial color={preset.wheelColor} metalness={0.8} roughness={0.2} /> {/* Rim */}
                    </mesh>
                    <mesh rotation={[Math.PI / 2, 0, 0]}>
                        <cylinderGeometry args={[0.04, 0.04, 0.18, 12]} />
                        <meshStandardMaterial color="#d1d5db" metalness={1} roughness={0.1} /> {/* Center lock */}
                    </mesh>
                </group>
            ))}

            {/* Front Headlights - Modern LED style */}
            <mesh position={[preset.length / 2 - 0.03, lowerY + 0.08, preset.width * 0.35]} rotation={[0, Math.PI / 10, 0]}>
                <boxGeometry args={[0.06, 0.1, 0.26]} />
                <meshStandardMaterial color="#f8fafc" emissive="#e2e8f0" emissiveIntensity={3} />
            </mesh>
            <mesh position={[preset.length / 2 - 0.03, lowerY + 0.08, -preset.width * 0.35]} rotation={[0, -Math.PI / 10, 0]}>
                <boxGeometry args={[0.06, 0.1, 0.26]} />
                <meshStandardMaterial color="#f8fafc" emissive="#e2e8f0" emissiveIntensity={3} />
            </mesh>

            {/* Rear Taillights - Modern LED strip */}
            <mesh position={[-preset.length / 2 + 0.03, lowerY + 0.12, preset.width * 0.38]} rotation={[0, -Math.PI / 15, 0]}>
                <boxGeometry args={[0.08, 0.06, 0.26]} />
                <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={2.5} />
            </mesh>
            <mesh position={[-preset.length / 2 + 0.03, lowerY + 0.12, -preset.width * 0.38]} rotation={[0, Math.PI / 15, 0]}>
                <boxGeometry args={[0.08, 0.06, 0.26]} />
                <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={2.5} />
            </mesh>
            {/* Rear light strip connect */}
            <mesh position={[-preset.length / 2 + 0.02, lowerY + 0.12, 0]}>
                <boxGeometry args={[0.05, 0.03, preset.width * 0.6]} />
                <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={1} />
            </mesh>

            {/* Side Mirrors */}
            <mesh position={[hoodX - 0.05, hoodY + 0.18, preset.width * 0.52]} rotation={[0, Math.PI / 12, 0]}>
                <boxGeometry args={[0.1, 0.07, 0.14]} />
                {bodyMaterial}
            </mesh>
            <mesh position={[hoodX - 0.05, hoodY + 0.18, -preset.width * 0.52]} rotation={[0, -Math.PI / 12, 0]}>
                <boxGeometry args={[0.1, 0.07, 0.14]} />
                {bodyMaterial}
            </mesh>
            <mesh position={[hoodX - 0.05, hoodY + 0.18, preset.width * 0.52]}>
                <boxGeometry args={[0.02, 0.05, 0.145]} />
                {darkMaterial}
            </mesh>
            <mesh position={[hoodX - 0.05, hoodY + 0.18, -preset.width * 0.52]}>
                <boxGeometry args={[0.02, 0.05, 0.145]} />
                {darkMaterial}
            </mesh>

            {/* Door Handles */}
            <mesh position={[cabinX + 0.15, lowerY + 0.12, preset.width / 2 + 0.01]}>
                <boxGeometry args={[0.1, 0.03, 0.02]} />
                {bodyMaterial}
            </mesh>
            <mesh position={[cabinX + 0.15, lowerY + 0.12, -preset.width / 2 - 0.01]}>
                <boxGeometry args={[0.1, 0.03, 0.02]} />
                {bodyMaterial}
            </mesh>
            <mesh position={[cabinX - 0.35, lowerY + 0.12, preset.width / 2 + 0.01]}>
                <boxGeometry args={[0.1, 0.03, 0.02]} />
                {bodyMaterial}
            </mesh>
            <mesh position={[cabinX - 0.35, lowerY + 0.12, -preset.width / 2 - 0.01]}>
                <boxGeometry args={[0.1, 0.03, 0.02]} />
                {bodyMaterial}
            </mesh>

            {/* Pillars (Structure) */}
            {/* A-Pillars */}
            <mesh position={[hoodX - preset.hoodLength * 0.1, preset.lowerHeight + 0.3, preset.width * 0.46]} rotation={[0, 0, -Math.PI / 4]}>
                <boxGeometry args={[0.03, 0.45, 0.03]} />
                {bodyMaterial}
            </mesh>
            <mesh position={[hoodX - preset.hoodLength * 0.1, preset.lowerHeight + 0.3, -preset.width * 0.46]} rotation={[0, 0, -Math.PI / 4]}>
                <boxGeometry args={[0.03, 0.45, 0.03]} />
                {bodyMaterial}
            </mesh>
            {/* B-Pillars */}
            <mesh position={[cabinX, preset.lowerHeight + 0.35, preset.width * 0.485]}>
                <boxGeometry args={[0.06, 0.5, 0.01]} />
                {darkMaterial}
            </mesh>
            <mesh position={[cabinX, preset.lowerHeight + 0.35, -preset.width * 0.485]}>
                <boxGeometry args={[0.06, 0.5, 0.01]} />
                {darkMaterial}
            </mesh>
            {/* C-Pillars */}
            <mesh position={[trunkX + preset.trunkLength * 0.1, preset.lowerHeight + 0.32, preset.width * 0.46]} rotation={[0, 0, Math.PI / 4]}>
                <boxGeometry args={[0.12, 0.48, 0.05]} />
                {bodyMaterial}
            </mesh>
            <mesh position={[trunkX + preset.trunkLength * 0.1, preset.lowerHeight + 0.32, -preset.width * 0.46]} rotation={[0, 0, Math.PI / 4]}>
                <boxGeometry args={[0.12, 0.48, 0.05]} />
                {bodyMaterial}
            </mesh>

            {/* Front Grille */}
            <mesh position={[preset.length / 2 - 0.01, lowerY - 0.02, 0]}>
                <boxGeometry args={[0.02, 0.15, preset.width * 0.6]} />
                <meshStandardMaterial color="#020617" metalness={1} roughness={0.1} />
            </mesh>
        </group>
    );
}

function SceneFixed({
    damagePoints,
    setDamagePoints,
    preset,
}: {
    damagePoints: DamagePoint3D[];
    setDamagePoints: Dispatch<SetStateAction<DamagePoint3D[]>>;
    preset: VehiclePreset;
}) {
    const carRef = useRef<THREE.Group>(null);

    const handleMarkDamage = (localPoint: THREE.Vector3) => {
        setDamagePoints((prev) => [
            ...prev,
            { position: [localPoint.x, localPoint.y, localPoint.z], type: "scratch" },
        ]);
    };

    const handleRemove = (index: number) => {
        setDamagePoints((prev) => prev.filter((_, i) => i !== index));
    };

    return (
        <>
            <ambientLight intensity={0.52} />
            <directionalLight position={[4, 6, 4]} intensity={1.3} castShadow shadow-mapSize={[1024, 1024]} />
            <directionalLight position={[-3, 4, -3]} intensity={0.45} />
            <pointLight position={[0, 3, 2]} intensity={0.25} />

            <OrbitControls
                enablePan={false}
                minPolarAngle={Math.PI / 8}
                maxPolarAngle={Math.PI / 2.05}
                maxDistance={5.2}
                minDistance={2.3}
            />

            <group ref={carRef} position={[0, 0, 0]} scale={preset.scale}>
                <CarMeshes preset={preset} onMarkDamage={handleMarkDamage} />

                {damagePoints.map((point, index) => (
                    <group key={index} position={point.position}>
                        <mesh
                            onPointerDown={(event) => {
                                event.stopPropagation();
                                handleRemove(index);
                            }}
                        >
                            <sphereGeometry args={[0.08, 16, 16]} />
                            <meshStandardMaterial color="#dc2626" emissive="#991b1b" />
                        </mesh>

                        <Html center distanceFactor={4} style={{ pointerEvents: "none", userSelect: "none" }}>
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-red-500 text-xs font-bold text-white shadow">
                                {index + 1}
                            </span>
                        </Html>
                    </group>
                ))}
            </group>
        </>
    );
}

export function DamageControl3D({
    damagePoints,
    setDamagePoints,
    vehicleName,
    className = "",
}: {
    damagePoints: DamagePoint3D[];
    setDamagePoints: Dispatch<SetStateAction<DamagePoint3D[]>>;
    vehicleName?: string;
    className?: string;
}) {
    const preset = useMemo(() => {
        const key = resolvePresetKey(vehicleName);
        return VEHICLE_PRESETS[key];
    }, [vehicleName]);

    return (
        <div className={className}>
            <p className="mb-1 text-sm font-medium text-slate-700">
                Sedan 3D araci surukleyerek dondurun, hasar noktasina tiklayin.
            </p>
            <p className="mb-2 text-xs text-slate-500">
                Model: {preset.label}
            </p>

            <div className="h-[340px] w-full overflow-hidden rounded-xl border-2 border-slate-300 bg-slate-100">
                <Canvas camera={{ position: [2.9, 1.6, 2.9], fov: 42 }} gl={{ antialias: true }} shadows>
                    <SceneFixed damagePoints={damagePoints} setDamagePoints={setDamagePoints} preset={preset} />
                </Canvas>
            </div>

            {damagePoints.length > 0 && (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                    <p className="text-xs text-slate-500">{damagePoints.length} hasar noktasi isaretlendi.</p>
                    <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-8 gap-1.5"
                        onClick={() => setDamagePoints((prev) => prev.slice(0, -1))}
                    >
                        <RotateCcw className="h-3.5 w-3.5" />
                        Son isareti geri al
                    </Button>
                </div>
            )}
        </div>
    );
}