
import React, { useRef, useMemo, useEffect, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface OrbProps {
  analyser: AnalyserNode | null;
  emotion: string;
  frequencyData?: Uint8Array;
}

// --- 1. ZEN GEMSTONE PALETTES (Bảng màu Đá Quý) ---
// Structure: [Deep Core, Mid Tone, Highlight, Rim/Glow]
const PALETTES: Record<string, [string, string, string, string]> = {
  // Neutral: "Moonstone" - Đá Mặt Trăng (Huyền ảo, nhẹ nhàng)
  neutral:  ["#475569", "#cbd5e1", "#ffffff", "#f97316"], 
  
  // Joyful: "Sunstone" - Đá Mặt Trời (Ấm áp, rực rỡ)
  joyful:   ["#b45309", "#fbbf24", "#fffbeb", "#f59e0b"], 

  // Sad: "Deep Sapphire" - Ngọc Bích Biển (Sâu thẳm, chữa lành)
  sad:      ["#0f172a", "#3b82f6", "#e0f2fe", "#60a5fa"], 

  // Anxious: "Smoky Quartz" - Thạch Anh Khói (Nối đất, lửa trong tâm)
  anxious:  ["#451a03", "#c2410c", "#ffedd5", "#ea580c"], 

  // Calm: "Imperial Jade" - Ngọc Lục Bảo (Rừng già, an tĩnh)
  calm:     ["#064e3b", "#10b981", "#ecfdf5", "#34d399"], 

  // Seeking: "Amethyst" - Thạch Anh Tím (Tâm linh, huyền bí)
  seeking:  ["#4c1d95", "#9333ea", "#f3e8ff", "#a855f7"], 

  // Stressed: "Ruby" - Hồng Ngọc (Năng lượng dồn nén)
  stressed: ["#881337", "#f43f5e", "#ffe4e6", "#fb7185"], 

  // Confused: "Opal" - Đá Mắt Mèo (Sương mù, biến ảo)
  confused: ["#164e63", "#06b6d4", "#cffafe", "#22d3ee"], 

  // Lonely: "Lapis Lazuli" - Thanh Kim (Trời đêm cô độc nhưng đẹp)
  lonely:   ["#1e1b4b", "#4f46e5", "#e0e7ff", "#6366f1"], 
};

const DEFAULT_PALETTE: [string, string, string, string] = ["#475569", "#cbd5e1", "#ffffff", "#f97316"];

// --- 2. QUANTUM LIQUID SHADER ---
// Sử dụng 4D Noise giả lập chất lỏng và Fake Subsurface Scattering cho chiều sâu

const vertexShader = `
  uniform float uTime;
  uniform float uIntensity;
  uniform float uAudioHigh;
  uniform float uAudioLow;
  
  varying vec2 vUv;
  varying float vDisplacement;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  // Simplex Noise helpers
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
  vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
  float snoise(vec3 v) {
    const vec2  C = vec2(1.0/6.0, 1.0/3.0) ;
    const vec4  D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy) );
    vec3 x0 = v - i + dot(i, C.xxx) ;
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min( g.xyz, l.zxy );
    vec3 i2 = max( g.xyz, l.zxy );
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute( permute( permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0 ))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0 ))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0 ));
    float n_ = 0.142857142857;
    vec3  ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_ );
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4( x.xy, y.xy );
    vec4 b1 = vec4( x.zw, y.zw );
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy ;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww ;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot( m*m, vec4( dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3) ) );
  }

  void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    
    // Organic movement: Combine low freq swell + high freq ripples
    float noiseLow = snoise(vec3(position.x * 0.6, position.y * 0.6, uTime * 0.2));
    float noiseHigh = snoise(vec3(position.x * 2.5 + uTime, position.y * 2.5, uTime * 0.5));
    
    float combinedNoise = (noiseLow * 0.7 + noiseHigh * 0.3);
    
    // Audio reactivity
    float displacement = combinedNoise * (0.08 + uIntensity * 0.1 + uAudioLow * 0.25);
    displacement += noiseHigh * uAudioHigh * 0.08; // High freqs add sharp ripples

    vDisplacement = combinedNoise;
    
    vec3 newPos = position + normal * displacement;
    vec4 worldPosition = modelMatrix * vec4(newPos, 1.0);
    vec4 mvPosition = viewMatrix * worldPosition;
    
    vViewPosition = -mvPosition.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform vec3 uColorDeep;
  uniform vec3 uColorMid;
  uniform vec3 uColorHigh;
  uniform vec3 uColorRim;
  
  varying vec2 vUv;
  varying float vDisplacement;
  varying vec3 vNormal;
  varying vec3 vViewPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewPosition);
    vec3 lightDir = normalize(vec3(0.5, 1.0, 1.0)); // Key light
    
    // 1. Lighting Model
    float NdotL = max(dot(normal, lightDir), 0.0);
    float NdotV = max(dot(normal, viewDir), 0.0); // Facing ratio
    
    // 2. Base Color Mixing (Liquid Depth)
    float noiseMix = smoothstep(-0.4, 0.6, vDisplacement);
    vec3 baseColor = mix(uColorDeep, uColorMid, noiseMix * 0.5 + NdotL * 0.5);

    // 3. Inner Glow (Fake Subsurface Scattering)
    // Càng nhìn thẳng tâm, càng thấy sâu (màu deep/high glow)
    float innerGlow = pow(1.0 - NdotV, 3.0);
    baseColor = mix(baseColor, uColorHigh, innerGlow * 0.4);

    // 4. Specular Highlight (Độ ướt)
    vec3 halfVector = normalize(lightDir + viewDir);
    float NdotH = max(dot(normal, halfVector), 0.0);
    float specular = pow(NdotH, 60.0) * 0.8; // Sharp glossy look
    
    // 5. Fresnel Rim (Viền sáng năng lượng)
    float fresnel = pow(1.0 - NdotV, 3.5);
    
    // 6. Composition
    vec3 finalColor = baseColor;
    finalColor += specular; 
    finalColor = mix(finalColor, uColorRim, fresnel * 0.7); // Pha viền
    
    // Shadow softness
    finalColor = mix(finalColor, uColorDeep, (1.0 - NdotL) * 0.4);

    gl_FragColor = vec4(finalColor, 1.0);
  }
`;

// --- 3. COMPONENTS ---

const LiquidOrb = ({ 
  emotion, 
  frequencyData,
  detail 
}: { 
  emotion: string, 
  frequencyData?: Uint8Array,
  detail: number
}) => {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  
  const targetColors = useRef({
    deep: new THREE.Color(),
    mid: new THREE.Color(),
    high: new THREE.Color(),
    rim: new THREE.Color()
  });

  useEffect(() => {
    const p = PALETTES[emotion] || DEFAULT_PALETTE;
    targetColors.current.deep.set(p[0]);
    targetColors.current.mid.set(p[1]);
    targetColors.current.high.set(p[2]);
    targetColors.current.rim.set(p[3]);
  }, [emotion]);

  const uniforms = useMemo(() => ({
    uTime: { value: 0 },
    uIntensity: { value: 0 },
    uAudioLow: { value: 0 },
    uAudioHigh: { value: 0 },
    uColorDeep: { value: new THREE.Color(DEFAULT_PALETTE[0]) },
    uColorMid: { value: new THREE.Color(DEFAULT_PALETTE[1]) },
    uColorHigh: { value: new THREE.Color(DEFAULT_PALETTE[2]) },
    uColorRim: { value: new THREE.Color(DEFAULT_PALETTE[3]) },
  }), []);

  useFrame((state) => {
    if (!materialRef.current || !meshRef.current) return;

    const time = state.clock.elapsedTime;
    
    // Audio Analysis
    let lowEnergy = 0;
    let highEnergy = 0;
    if (frequencyData && frequencyData.length > 0) {
       lowEnergy = frequencyData.slice(0, 5).reduce((a,b)=>a+b,0) / 5 / 255;
       highEnergy = frequencyData.slice(15, 30).reduce((a,b)=>a+b,0) / 15 / 255;
    }

    // Smooth Color Transitions
    const lerpSpeed = 0.04;
    materialRef.current.uniforms.uColorDeep.value.lerp(targetColors.current.deep, lerpSpeed);
    materialRef.current.uniforms.uColorMid.value.lerp(targetColors.current.mid, lerpSpeed);
    materialRef.current.uniforms.uColorHigh.value.lerp(targetColors.current.high, lerpSpeed);
    materialRef.current.uniforms.uColorRim.value.lerp(targetColors.current.rim, lerpSpeed);

    // Update Uniforms
    materialRef.current.uniforms.uTime.value = time;
    materialRef.current.uniforms.uAudioLow.value = THREE.MathUtils.lerp(materialRef.current.uniforms.uAudioLow.value, lowEnergy, 0.15);
    materialRef.current.uniforms.uAudioHigh.value = THREE.MathUtils.lerp(materialRef.current.uniforms.uAudioHigh.value, highEnergy, 0.15);

    // "Breathing" Intensity
    const breath = Math.sin(time * 0.6) * 0.08 + 0.08; 
    const targetIntensity = 0.1 + breath + (lowEnergy * 0.6);
    materialRef.current.uniforms.uIntensity.value = THREE.MathUtils.lerp(
        materialRef.current.uniforms.uIntensity.value, targetIntensity, 0.05
    );

    // Floating Rotation
    meshRef.current.rotation.y = Math.sin(time * 0.15) * 0.15;
    meshRef.current.rotation.z = Math.cos(time * 0.2) * 0.1;
  });

  return (
    <group>
      {/* 1. Main Liquid Orb */}
      <mesh ref={meshRef} scale={1.4}>
        <icosahedronGeometry args={[1, detail]} />
        <shaderMaterial 
          ref={materialRef}
          vertexShader={vertexShader}
          fragmentShader={fragmentShader}
          uniforms={uniforms}
        />
      </mesh>
      
      {/* 2. Inner Core Light (Glow from center) */}
      <mesh scale={0.65}>
        <sphereGeometry args={[1, 32, 32]} />
        <meshBasicMaterial 
            color="#ffffff" 
            transparent 
            opacity={0.4} 
            blending={THREE.AdditiveBlending} 
        />
      </mesh>
    </group>
  );
};

// --- 4. ORBITAL PARTICLES (Energy Field) ---
const SwarmParticles = ({ count = 60, emotion, frequencyData }: { count?: number, emotion: string, frequencyData?: Uint8Array }) => {
    const meshRef = useRef<THREE.InstancedMesh>(null);
    const dummy = useMemo(() => new THREE.Object3D(), []);
    
    // Init particles in a spherical shell
    const particles = useMemo(() => {
      return new Array(count).fill(0).map((_, i) => ({
        // Distributed on sphere surface roughly
        phi: Math.acos(-1 + (2 * i) / count),
        theta: Math.sqrt(count * Math.PI) * i,
        radiusBase: 2.2 + Math.random() * 1.5,
        speed: 0.005 + Math.random() * 0.01,
        size: Math.random() * 0.04 + 0.01,
        phase: Math.random() * Math.PI * 2
      }));
    }, [count]);
    
    const colorTarget = useRef(new THREE.Color(DEFAULT_PALETTE[3]));

    useEffect(() => {
        const p = PALETTES[emotion] || DEFAULT_PALETTE;
        colorTarget.current.set(p[3]); 
    }, [emotion]);
  
    useFrame((state) => {
      if(!meshRef.current) return;
      
      let energy = 0;
      if (frequencyData && frequencyData.length > 0) {
        energy = frequencyData.slice(0, 30).reduce((a,b)=>a+b,0) / 30 / 255;
      }
      
      const time = state.clock.elapsedTime;
      (meshRef.current.material as THREE.MeshBasicMaterial).color.lerp(colorTarget.current, 0.05);

      particles.forEach((p, i) => {
        // Orbit logic
        const activeSpeed = p.speed * (1 + energy * 8); // Spin faster with audio
        
        // Update angles
        const currentTheta = p.theta + time * activeSpeed;
        const currentPhi = p.phi + Math.sin(time * 0.5 + p.phase) * 0.1; // Gentle bobbing

        // Radius expands with energy
        const r = p.radiusBase + (energy * 1.0) + Math.sin(time * 2 + p.phase) * 0.1;

        const x = r * Math.sin(currentPhi) * Math.cos(currentTheta);
        const y = r * Math.sin(currentPhi) * Math.sin(currentTheta);
        const z = r * Math.cos(currentPhi);
        
        dummy.position.set(x, y, z);
        dummy.rotation.set(time, time, time);
        
        // Scale pulse
        const scale = p.size * (1 + energy * 4 + Math.sin(time * 3 + p.phase)*0.3);
        dummy.scale.setScalar(scale);
        
        dummy.updateMatrix();
        meshRef.current!.setMatrixAt(i, dummy.matrix);
      });
      
      meshRef.current.instanceMatrix.needsUpdate = true;
      // Rotate entire field slowly
      meshRef.current.rotation.y = time * 0.05;
    });
  
    return (
      <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
        <sphereGeometry args={[1, 6, 6]} />
        <meshBasicMaterial 
            transparent 
            opacity={0.7} 
            blending={THREE.AdditiveBlending}
        />
      </instancedMesh>
    )
};

export default function OrbViz({ analyser, emotion, frequencyData }: OrbProps) {
  const [isVisible, setIsVisible] = useState(true);
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 768;
  const detail = isMobile ? 30 : 60; // Slightly lower poly for liquid shader performance
  const particleCount = isMobile ? 50 : 100;

  useEffect(() => {
    const handleVisibilityChange = () => setIsVisible(document.visibilityState === 'visible');
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <div className="w-full h-full absolute inset-0 z-0 pointer-events-none fade-in">
      <Canvas 
        dpr={[1, 1.5]} // Cap DPR for performance
        frameloop={isVisible ? 'always' : 'never'}
        camera={{ position: [0, 0, 5.5], fov: 45 }}
        gl={{ 
          antialias: true,
          powerPreference: 'high-performance',
          alpha: true,
        }}
      >
        <ambientLight intensity={0.5} />
        <directionalLight position={[5, 5, 5]} intensity={1.5} color="#ffffff" />
        <pointLight position={[-5, -5, -5]} intensity={0.5} color="#ffffff" />

        <LiquidOrb 
          emotion={emotion} 
          frequencyData={frequencyData} 
          detail={detail}
        />
        
        <SwarmParticles 
           count={particleCount} 
           emotion={emotion} 
           frequencyData={frequencyData} 
        />
      </Canvas>
    </div>
  );
}
