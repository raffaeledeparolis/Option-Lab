import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { createEquirectangularEarthCanvas } from '../utils/earthTexture';

interface RotatingGlobeProps {
  size?: number; // diameter in px (default ~280)
  className?: string;
}

interface HubData {
  name: string;
  lat: number;
  lon: number;
  color: string;
  isMajor?: boolean;
}

const HUBS: HubData[] = [
  { name: 'LONDON', lat: 51.5074, lon: -0.1278, color: '#38bdf8', isMajor: true },
  { name: 'MILAN', lat: 45.4642, lon: 9.19, color: '#22d3ee', isMajor: true },
  { name: 'FRANKFURT', lat: 50.1109, lon: 8.6821, color: '#38bdf8', isMajor: true },
  { name: 'PARIS', lat: 48.8566, lon: 2.3522, color: '#38bdf8', isMajor: true },
  { name: 'ROME', lat: 41.9028, lon: 12.4964, color: '#22d3ee' },
  { name: 'ZURICH', lat: 47.3769, lon: 8.5417, color: '#38bdf8' },
  { name: 'NEW YORK', lat: 40.7128, lon: -74.006, color: '#34d399', isMajor: true },
  { name: 'TOKYO', lat: 35.6762, lon: 139.6503, color: '#38bdf8', isMajor: true },
  { name: 'SINGAPORE', lat: 1.3521, lon: 103.8198, color: '#22d3ee', isMajor: true },
  { name: 'HONG KONG', lat: 22.3193, lon: 114.1694, color: '#38bdf8' },
  { name: 'DUBAI', lat: 25.2048, lon: 55.2708, color: '#fbbf24', isMajor: true },
  { name: 'SYDNEY', lat: -33.8688, lon: 151.2093, color: '#38bdf8' },
  { name: 'SAO PAULO', lat: -23.5505, lon: -46.6333, color: '#34d399' },
];

// Arcs connecting financial hubs (trading flows)
const TRADING_FLOW_ROUTES: [number, number][] = [
  [0, 1], // London - Milan
  [1, 2], // Milan - Frankfurt
  [1, 3], // Milan - Paris
  [1, 4], // Milan - Rome
  [2, 5], // Frankfurt - Zurich
  [0, 3], // London - Paris
  [0, 6], // London - New York
  [3, 6], // Paris - New York
  [6, 7], // New York - Tokyo
  [0, 7], // London - Tokyo
  [7, 8], // Tokyo - Singapore
  [8, 11], // Singapore - Sydney
  [0, 10], // London - Dubai
  [6, 12], // New York - Sao Paulo
];

// European optimal central presentation view angles (faces Italy, Central Europe, London, Paris, Frankfurt)
const EUROPE_CENTER_ROT_Y = -1.72; // Longitude ~10°E front and center
const EUROPE_CENTER_ROT_X = 0.32;  // Latitude ~45°N tilted gracefully forward

/**
 * Converts Latitude and Longitude to 3D Cartesian coordinates on sphere of given radius.
 */
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lon + 180) * (Math.PI / 180);
  const x = -(radius * Math.sin(phi) * Math.cos(theta));
  const z = radius * Math.sin(phi) * Math.sin(theta);
  const y = radius * Math.cos(phi);
  return new THREE.Vector3(x, y, z);
}

/**
 * Creates a sprite with text label for financial hub
 */
function createTextSprite(text: string, color = '#e0f2fe'): THREE.Sprite {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Background pill for contrast
    ctx.fillStyle = 'rgba(2, 6, 23, 0.82)';
    ctx.roundRect?.(10, 12, canvas.width - 20, 40, 8);
    ctx.fill();
    ctx.strokeStyle = 'rgba(56, 189, 248, 0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.font = 'bold 22px "JetBrains Mono", monospace';
    ctx.fillStyle = color;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, 33);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.minFilter = THREE.LinearFilter;
  const spriteMaterial = new THREE.SpriteMaterial({
    map: texture,
    transparent: true,
    depthTest: false, // will fade manually based on globe hemisphere
  });
  const sprite = new THREE.Sprite(spriteMaterial);
  sprite.scale.set(0.38, 0.095, 1);
  return sprite;
}

export const RotatingGlobe: React.FC<RotatingGlobeProps> = ({
  size = 280,
  className = '',
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isHovered, setIsHovered] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const isPausedRef = useRef(false);
  isPausedRef.current = isPaused;

  const resetTargetRef = useRef<{ active: boolean; x: number; y: number }>({
    active: false,
    x: EUROPE_CENTER_ROT_X,
    y: EUROPE_CENTER_ROT_Y,
  });

  const handleCenterEurope = (e: React.MouseEvent) => {
    e.stopPropagation();
    resetTargetRef.current = {
      active: true,
      x: EUROPE_CENTER_ROT_X,
      y: EUROPE_CENTER_ROT_Y,
    };
  };

  const togglePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsPaused((p) => !p);
  };

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Detect software WebGL as per guidelines
    const isSoftwareGl = (() => {
      try {
        const gl = document.createElement('canvas').getContext('webgl2');
        if (!gl) return true;
        const ext = gl.getExtension('WEBGL_debug_renderer_info');
        const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
        const gpu = String(gl.getParameter(param));
        gl.getExtension('WEBGL_lose_context')?.loseContext();
        return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
      } catch {
        return true;
      }
    })();

    const width = container.clientWidth || size;
    const height = container.clientHeight || size;

    // 1. Scene, Camera, Renderer
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(40, width / height, 0.1, 100);
    camera.position.set(0, 0.35, 3.25);

    const renderer = new THREE.WebGLRenderer({
      antialias: !isSoftwareGl,
      alpha: true,
      powerPreference: 'high-performance',
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;
    container.innerHTML = '';
    container.appendChild(renderer.domElement);

    // Main rotating group
    const globeGroup = new THREE.Group();
    // Default orientation: directly presenting Europe front and center!
    globeGroup.rotation.x = EUROPE_CENTER_ROT_X;
    globeGroup.rotation.y = EUROPE_CENTER_ROT_Y;
    scene.add(globeGroup);

    const GLOBE_RADIUS = 1.0;

    // 2. Procedural High-Res Earth Texture with Recognizable Continents & Europe
    const earthCanvas = createEquirectangularEarthCanvas(2048, 1024);
    const earthTexture = new THREE.CanvasTexture(earthCanvas);
    earthTexture.colorSpace = THREE.SRGBColorSpace;
    earthTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    earthTexture.wrapS = THREE.RepeatWrapping;
    earthTexture.wrapT = THREE.ClampToEdgeWrapping;

    // 3. Earth Core Sphere Mesh
    const sphereGeometry = new THREE.SphereGeometry(GLOBE_RADIUS, 64, 64);
    const sphereMaterial = new THREE.MeshBasicMaterial({
      map: earthTexture,
      transparent: true,
      opacity: 0.98,
    });
    const earthMesh = new THREE.Mesh(sphereGeometry, sphereMaterial);
    globeGroup.add(earthMesh);

    // 4. Subtle 3D Wireframe Graticule Sphere (slightly larger)
    const graticuleGeometry = new THREE.SphereGeometry(GLOBE_RADIUS * 1.002, 36, 18);
    const graticuleMaterial = new THREE.MeshBasicMaterial({
      color: 0x06b6d4,
      wireframe: true,
      transparent: true,
      opacity: 0.08,
    });
    const graticuleMesh = new THREE.Mesh(graticuleGeometry, graticuleMaterial);
    globeGroup.add(graticuleMesh);

    // 5. Atmosphere Glow (Fresnel Shader for neon rim glow matching screenshot)
    const atmosphereVertexShader = `
      varying vec3 vNormal;
      varying vec3 vPositionNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vPositionNormal = normalize((modelViewMatrix * vec4(position, 1.0)).xyz);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `;
    const atmosphereFragmentShader = `
      varying vec3 vNormal;
      varying vec3 vPositionNormal;
      void main() {
        float intensity = pow(0.68 - dot(vNormal, vec3(0.0, 0.0, 1.0)), 2.2);
        gl_FragColor = vec4(0.024, 0.714, 0.831, 1.0) * intensity * 1.35;
      }
    `;
    const atmosphereMaterial = new THREE.ShaderMaterial({
      vertexShader: atmosphereVertexShader,
      fragmentShader: atmosphereFragmentShader,
      blending: THREE.AdditiveBlending,
      side: THREE.BackSide,
      transparent: true,
    });
    const atmosphereMesh = new THREE.Mesh(
      new THREE.SphereGeometry(GLOBE_RADIUS * 1.15, 48, 48),
      atmosphereMaterial
    );
    scene.add(atmosphereMesh);

    // 6. Orbital Satellite Rings (matching user screenshot)
    // Ring 1 (Equatorial / Tilted Ellipse)
    const ring1Group = new THREE.Group();
    ring1Group.rotation.x = Math.PI / 2.3;
    ring1Group.rotation.y = 0.25;
    scene.add(ring1Group);

    const ring1Curve = new THREE.EllipseCurve(0, 0, GLOBE_RADIUS * 1.38, GLOBE_RADIUS * 1.34, 0, Math.PI * 2, false, 0);
    const ring1Points = ring1Curve.getPoints(120);
    const ring1Geometry = new THREE.BufferGeometry().setFromPoints(
      ring1Points.map(p => new THREE.Vector3(p.x, p.y, 0))
    );
    const ring1Material = new THREE.LineBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
    });
    const ring1Line = new THREE.Line(ring1Geometry, ring1Material);
    ring1Group.add(ring1Line);

    // Satellite 1 Node
    const sat1Mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.026, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
    );
    ring1Group.add(sat1Mesh);

    // Ring 2 (Inclined Polar / Diagonal)
    const ring2Group = new THREE.Group();
    ring2Group.rotation.x = -Math.PI / 2.7;
    ring2Group.rotation.z = 0.35;
    scene.add(ring2Group);

    const ring2Curve = new THREE.EllipseCurve(0, 0, GLOBE_RADIUS * 1.44, GLOBE_RADIUS * 1.40, 0, Math.PI * 2, false, 0);
    const ring2Points = ring2Curve.getPoints(120);
    const ring2Geometry = new THREE.BufferGeometry().setFromPoints(
      ring2Points.map(p => new THREE.Vector3(p.x, p.y, 0))
    );
    const ring2Material = new THREE.LineBasicMaterial({
      color: 0x22d3ee,
      transparent: true,
      opacity: 0.28,
    });
    const ring2Line = new THREE.Line(ring2Geometry, ring2Material);
    ring2Group.add(ring2Line);

    // Satellite 2 Node
    const sat2Mesh = new THREE.Mesh(
      new THREE.SphereGeometry(0.022, 16, 16),
      new THREE.MeshBasicMaterial({ color: 0x34d399 })
    );
    ring2Group.add(sat2Mesh);

    // 7. Financial Hub Markers & Floating Text Badges
    const hubSprites: { sprite: THREE.Sprite; position: THREE.Vector3 }[] = [];
    const hubMeshes: THREE.Mesh[] = [];

    HUBS.forEach((hub) => {
      const pos = latLonToVector3(hub.lat, hub.lon, GLOBE_RADIUS * 1.006);

      // A. Surface Dot Marker
      const dotGeometry = new THREE.SphereGeometry(0.022, 16, 16);
      const dotMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(hub.color),
      });
      const dot = new THREE.Mesh(dotGeometry, dotMaterial);
      dot.position.copy(pos);
      globeGroup.add(dot);
      hubMeshes.push(dot);

      // B. Beacon Stalk (line projecting outward)
      const stalkPos = pos.clone().multiplyScalar(1.045);
      const stalkGeom = new THREE.BufferGeometry().setFromPoints([pos, stalkPos]);
      const stalkMat = new THREE.LineBasicMaterial({
        color: new THREE.Color(hub.color),
        transparent: true,
        opacity: 0.75,
      });
      const stalk = new THREE.Line(stalkGeom, stalkMat);
      globeGroup.add(stalk);

      // C. Major Hub Text Label
      if (hub.isMajor) {
        const sprite = createTextSprite(hub.name, '#e0f2fe');
        sprite.position.copy(pos.clone().multiplyScalar(1.07));
        globeGroup.add(sprite);
        hubSprites.push({ sprite, position: pos });
      }
    });

    // 8. Financial Trade Flow Bezier Arcs
    interface ArcFlow {
      curve: THREE.QuadraticBezierCurve3;
      pulseMesh: THREE.Mesh;
      progress: number;
      speed: number;
    }
    const arcFlows: ArcFlow[] = [];

    TRADING_FLOW_ROUTES.forEach(([i1, i2], routeIdx) => {
      const h1 = HUBS[i1];
      const h2 = HUBS[i2];
      if (!h1 || !h2) return;
      const p1 = latLonToVector3(h1.lat, h1.lon, GLOBE_RADIUS * 1.005);
      const p2 = latLonToVector3(h2.lat, h2.lon, GLOBE_RADIUS * 1.005);

      // Midpoint elevated above surface based on distance
      const dist = p1.distanceTo(p2);
      const mid = p1.clone().add(p2).multiplyScalar(0.5);
      const elevation = 1.0 + Math.min(0.35, dist * 0.22);
      mid.normalize().multiplyScalar(GLOBE_RADIUS * elevation);

      const curve = new THREE.QuadraticBezierCurve3(p1, mid, p2);
      const curvePoints = curve.getPoints(50);
      const curveGeometry = new THREE.BufferGeometry().setFromPoints(curvePoints);
      const curveMaterial = new THREE.LineBasicMaterial({
        color: 0x06b6d4,
        transparent: true,
        opacity: 0.32,
      });
      const curveLine = new THREE.Line(curveGeometry, curveMaterial);
      globeGroup.add(curveLine);

      // Moving light pulse particle along the route
      const pulseMesh = new THREE.Mesh(
        new THREE.SphereGeometry(0.016, 8, 8),
        new THREE.MeshBasicMaterial({ color: 0x38bdf8 })
      );
      globeGroup.add(pulseMesh);

      arcFlows.push({
        curve,
        pulseMesh,
        progress: (routeIdx * 0.14) % 1,
        speed: 0.003 + (routeIdx % 3) * 0.0012,
      });
    });

    // 9. Interactive Drag to Spin Controls
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;
    let velX = 0.0016; // smooth, gentle default rotation
    let velY = 0;
    let lastUserInteract = 0;

    const onPointerDown = (e: MouseEvent | TouchEvent) => {
      isDragging = true;
      resetTargetRef.current.active = false;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      prevMouseX = clientX;
      prevMouseY = clientY;
      velX = 0;
      velY = 0;
      lastUserInteract = performance.now();
    };

    const onPointerMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
      const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
      const deltaX = clientX - prevMouseX;
      const deltaY = clientY - prevMouseY;
      prevMouseX = clientX;
      prevMouseY = clientY;

      globeGroup.rotation.y += deltaX * 0.008;
      globeGroup.rotation.x = Math.max(-0.6, Math.min(0.6, globeGroup.rotation.x + deltaY * 0.008));

      velX = deltaX * 0.001;
      velY = deltaY * 0.001;
      lastUserInteract = performance.now();
    };

    const onPointerUp = () => {
      isDragging = false;
    };

    const domEl = renderer.domElement;
    domEl.style.cursor = 'grab';
    domEl.addEventListener('mousedown', onPointerDown);
    window.addEventListener('mousemove', onPointerMove);
    window.addEventListener('mouseup', onPointerUp);
    domEl.addEventListener('touchstart', onPointerDown, { passive: true });
    window.addEventListener('touchmove', onPointerMove, { passive: true });
    window.addEventListener('touchend', onPointerUp);

    // 10. Animation Render Loop
    let frameId: number;
    const cameraWorldPos = new THREE.Vector3();
    const tempNormal = new THREE.Vector3();

    const animate = () => {
      frameId = requestAnimationFrame(animate);

      // Handle Smooth "Centra Europa" Animation
      if (resetTargetRef.current.active) {
        const targetX = resetTargetRef.current.x;
        const targetY = resetTargetRef.current.y;

        // Smooth shortest-angle interpolation
        globeGroup.rotation.x = THREE.MathUtils.lerp(globeGroup.rotation.x, targetX, 0.06);
        // Normalize rotation.y distance
        const diffY = ((targetY - globeGroup.rotation.y + Math.PI) % (Math.PI * 2)) - Math.PI;
        globeGroup.rotation.y += diffY * 0.06;

        if (Math.abs(globeGroup.rotation.x - targetX) < 0.002 && Math.abs(diffY) < 0.002) {
          globeGroup.rotation.x = targetX;
          globeGroup.rotation.y = targetY;
          resetTargetRef.current.active = false;
        }
      } else if (!isDragging) {
        const now = performance.now();
        if (isPausedRef.current) {
          velX *= 0.85;
          velY *= 0.85;
        } else if (now - lastUserInteract > 1800) {
          // Resume slow, majestic forward rotation
          velX = THREE.MathUtils.damp(velX, 0.0016, 2.0, 0.016);
          velY = THREE.MathUtils.damp(velY, 0, 2.0, 0.016);
        } else {
          // Friction decay after drag
          velX *= 0.94;
          velY *= 0.94;
        }
        globeGroup.rotation.y += velX;
        globeGroup.rotation.x = Math.max(-0.6, Math.min(0.6, globeGroup.rotation.x + velY));
      }

      // Orbit satellites along rings
      const now = performance.now();
      const timeSec = now * 0.001;
      const sat1Angle = timeSec * 0.65;
      sat1Mesh.position.set(
        Math.cos(sat1Angle) * GLOBE_RADIUS * 1.38,
        Math.sin(sat1Angle) * GLOBE_RADIUS * 1.34,
        0
      );

      const sat2Angle = -timeSec * 0.5 + Math.PI;
      sat2Mesh.position.set(
        Math.cos(sat2Angle) * GLOBE_RADIUS * 1.44,
        Math.sin(sat2Angle) * GLOBE_RADIUS * 1.40,
        0
      );

      // Animate trade flow pulses along Bezier arcs
      arcFlows.forEach((flow) => {
        flow.progress = (flow.progress + flow.speed) % 1;
        const pt = flow.curve.getPoint(flow.progress);
        flow.pulseMesh.position.copy(pt);
      });

      // Update text sprite visibility: fade out when rotated to back of globe
      camera.getWorldPosition(cameraWorldPos);
      hubSprites.forEach(({ sprite, position }) => {
        // Transform normal to world space
        tempNormal.copy(position).applyQuaternion(globeGroup.quaternion).normalize();
        const dot = tempNormal.dot(camera.position.clone().normalize());
        if (dot > 0.22) {
          sprite.visible = true;
          (sprite.material as THREE.SpriteMaterial).opacity = Math.min(1, (dot - 0.22) * 2.8);
        } else {
          sprite.visible = false;
        }
      });

      renderer.render(scene, camera);
    };

    animate();

    // Resize handler
    const handleResize = () => {
      if (!container) return;
      const newWidth = container.clientWidth || size;
      const newHeight = container.clientHeight || size;
      camera.aspect = newWidth / newHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(newWidth, newHeight);
    };
    window.addEventListener('resize', handleResize);

    // Cleanup on unmount
    return () => {
      cancelAnimationFrame(frameId);
      window.removeEventListener('resize', handleResize);
      domEl.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('mousemove', onPointerMove);
      window.removeEventListener('mouseup', onPointerUp);
      domEl.removeEventListener('touchstart', onPointerDown);
      window.removeEventListener('touchmove', onPointerMove);
      window.removeEventListener('touchend', onPointerUp);

      renderer.dispose();
      sphereGeometry.dispose();
      sphereMaterial.dispose();
      earthTexture.dispose();
      graticuleGeometry.dispose();
      graticuleMaterial.dispose();
      atmosphereMaterial.dispose();
      ring1Geometry.dispose();
      ring1Material.dispose();
      ring2Geometry.dispose();
      ring2Material.dispose();
      hubSprites.forEach(({ sprite }) => {
        sprite.material.dispose();
      });
      container.innerHTML = '';
    };
  }, [size]);

  return (
    <div
      className={`relative flex flex-col items-center justify-center select-none ${className}`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* 3D WebGL Canvas Container */}
      <div
        ref={containerRef}
        style={{ width: `${size}px`, height: `${size}px` }}
        className="relative z-10 flex items-center justify-center filter drop-shadow-[0_0_28px_rgba(6,182,212,0.45)]"
      />

      {/* Floating Control Badges (Center Europe & Rotation Pause) */}
      <div
        className={`absolute bottom-[-10px] z-20 flex items-center gap-1.5 transition-all duration-300 ${
          isHovered ? 'opacity-100 translate-y-0' : 'opacity-70 translate-y-0.5'
        }`}
      >
        <button
          type="button"
          onClick={handleCenterEurope}
          title="Centra vista su Europa e Italia"
          className="px-2.5 py-1 rounded-full bg-slate-900/90 hover:bg-cyan-950/80 border border-cyan-500/40 hover:border-cyan-400 text-[11px] font-mono text-cyan-200 hover:text-white shadow-lg backdrop-blur transition-all flex items-center gap-1 cursor-pointer"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
          Centra Europa
        </button>

        <button
          type="button"
          onClick={togglePause}
          title={isPaused ? 'Riprendi rotazione automatica' : 'Pausa rotazione'}
          className="px-2 py-1 rounded-full bg-slate-900/90 hover:bg-cyan-950/80 border border-cyan-500/40 hover:border-cyan-400 text-[11px] font-mono text-cyan-200 hover:text-white shadow-lg backdrop-blur transition-all cursor-pointer"
        >
          {isPaused ? '▶ Play' : '⏸ Pausa'}
        </button>
      </div>
    </div>
  );
};
