import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { RotateCw, Box, Eye } from 'lucide-react';

interface Props {
  filePath?: string;
  fileName: string;
  previewPath?: string;
}

export default function ThreeViewer({ filePath, fileName, previewPath }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [wireframe, setWireframe] = useState(false);
  const [loading, setLoading] = useState(true);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const meshRef = useRef<THREE.Mesh | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const width = container.clientWidth || 400;
    const height = container.clientHeight || 350;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0a0f1d);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(0, 5, 10);
    camera.lookAt(0, 0, 0);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    container.appendChild(renderer.domElement);
    rendererRef.current = renderer;

    // Lights
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight1 = new THREE.DirectionalLight(0x06b6d4, 1.5);
    dirLight1.position.set(5, 10, 7);
    scene.add(dirLight1);

    const dirLight2 = new THREE.DirectionalLight(0xa855f7, 1);
    dirLight2.position.set(-5, -5, -5);
    scene.add(dirLight2);

    // Grid Helper
    const grid = new THREE.GridHelper(10, 20, 0x06b6d4, 0x1e293b);
    grid.position.y = -2;
    scene.add(grid);

    // Geometry: stylized torus knot or box preview
    const geometry = new THREE.TorusKnotGeometry(1.6, 0.5, 100, 16);
    const material = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.4,
      roughness: 0.2,
      wireframe: false,
    });
    const mesh = new THREE.Mesh(geometry, material);
    scene.add(mesh);
    meshRef.current = mesh;

    setLoading(false);

    // Mouse drag interaction
    let isDragging = false;
    let prevMouseX = 0;
    let prevMouseY = 0;

    function onMouseDown(e: MouseEvent) {
      isDragging = true;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    }

    function onMouseMove(e: MouseEvent) {
      if (!isDragging || !meshRef.current) return;
      const deltaX = e.clientX - prevMouseX;
      const deltaY = e.clientY - prevMouseY;
      meshRef.current.rotation.y += deltaX * 0.01;
      meshRef.current.rotation.x += deltaY * 0.01;
      prevMouseX = e.clientX;
      prevMouseY = e.clientY;
    }

    function onMouseUp() {
      isDragging = false;
    }

    function onWheel(e: WheelEvent) {
      e.preventDefault();
      camera.position.z = Math.max(3, Math.min(25, camera.position.z + e.deltaY * 0.01));
    }

    const dom = renderer.domElement;
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    dom.addEventListener('wheel', onWheel, { passive: false });

    // Animation Loop
    let reqId = 0;
    function animate() {
      reqId = requestAnimationFrame(animate);
      if (!isDragging && meshRef.current) {
        meshRef.current.rotation.y += 0.005;
      }
      renderer.render(scene, camera);
    }
    animate();

    function onResize() {
      if (!container) return;
      const w = container.clientWidth;
      const h = container.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    return () => {
      cancelAnimationFrame(reqId);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('resize', onResize);
      renderer.dispose();
      geometry.dispose();
      material.dispose();
      if (dom.parentNode) dom.parentNode.removeChild(dom);
    };
  }, []);

  useEffect(() => {
    if (meshRef.current) {
      (meshRef.current.material as THREE.MeshStandardMaterial).wireframe = wireframe;
    }
  }, [wireframe]);

  function resetRotation() {
    if (meshRef.current) {
      meshRef.current.rotation.set(0, 0, 0);
    }
  }

  return (
    <div className="relative w-full h-full min-h-[350px] rounded-xl overflow-hidden border border-slate-700/60 bg-[#0a0f1d] flex items-center justify-center">
      {/* 3D Canvas container */}
      <div ref={containerRef} className="w-full h-full cursor-grab active:cursor-grabbing" />

      {/* Embedded CAD thumbnail if available */}
      {previewPath && (
        <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md p-1.5 rounded-lg border border-slate-700 shadow-xl max-w-[120px]">
          <img src={previewPath} alt="CAD thumbnail" className="w-full rounded object-contain" />
          <p className="text-[10px] text-slate-400 text-center mt-1">Render Preview</p>
        </div>
      )}

      {/* Floating Controls */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5 bg-slate-900/80 backdrop-blur-md p-1 rounded-lg border border-slate-700 shadow-xl z-10">
        <button
          onClick={resetRotation}
          className="p-1.5 text-slate-400 hover:text-cyan-300 transition-colors rounded hover:bg-white/5"
          title="Reset orientation"
        >
          <RotateCw size={13} />
        </button>
        <button
          onClick={() => setWireframe(v => !v)}
          className={`p-1.5 rounded transition-colors ${
            wireframe ? 'text-cyan-400 bg-cyan-500/20' : 'text-slate-400 hover:text-white hover:bg-white/5'
          }`}
          title="Toggle wireframe"
        >
          <Box size={13} />
        </button>
      </div>

      <div className="absolute bottom-3 left-3 pointer-events-none text-[11px] text-slate-400 bg-slate-900/80 backdrop-blur-sm px-2.5 py-1 rounded-md border border-slate-800">
        <span className="font-semibold text-cyan-300">{fileName}</span> &middot; Drag to rotate &middot; Scroll to zoom
      </div>
    </div>
  );
}
