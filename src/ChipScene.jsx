import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/addons/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/addons/environments/RoomEnvironment.js';

// A conceptual hardware sculpture, not a screenshot or a model of a supported CPU.
export default function ChipScene({ theme }) {
  const host = useRef(null);
  const themeRef = useRef(theme);
  themeRef.current = theme;

  useEffect(() => {
    const element = host.current;
    let renderer;
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch { element.dataset.fallback = 'true'; return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.6));
    renderer.setClearColor(0x000000, 0);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.25;
    renderer.domElement.setAttribute('aria-hidden', 'true');
    element.appendChild(renderer.domElement);
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
    camera.position.set(6.5, 7.1, 8.5);
    camera.lookAt(0, 0.45, 0);
    const environment = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(renderer);
    const environmentMap = pmrem.fromScene(environment, 0.04);
    scene.environment = environmentMap.texture;
    environment.dispose(); pmrem.dispose();
    scene.add(new THREE.AmbientLight(0xa5bdae, 1.8));
    const key = new THREE.DirectionalLight(0xe8fff1, 4); key.position.set(1, 6, 2); scene.add(key);
    const rim = new THREE.DirectionalLight(0x83efb7, 3); rim.position.set(-5, 2, -2); scene.add(rim);
    const sculpture = new THREE.Group(); scene.add(sculpture);
    sculpture.rotation.y = -0.15;
    const materials = [];
    const mat = options => { const m = new THREE.MeshStandardMaterial(options); materials.push(m); return m; };
    const graphite = mat({ color: 0x18241f, metalness: 0.8, roughness: 0.29 });
    const silver = mat({ color: 0x728b80, metalness: 0.88, roughness: 0.25 });
    const dark = mat({ color: 0x0c1511, metalness: 0.65, roughness: 0.3 });
    const accent = mat({ color: 0x91eabc, emissive: 0x6ce7aa, emissiveIntensity: 1.8, metalness: 0.2, roughness: 0.3 });
    const pin = mat({ color: 0x6c8477, metalness: 0.85, roughness: 0.25 });
    const addBox = (w, h, d, y, material, radius = 0.06) => {
      const mesh = new THREE.Mesh(new RoundedBoxGeometry(w, h, d, 3, radius), material);
      mesh.position.y = y; sculpture.add(mesh); return mesh;
    };
    addBox(3.8, 0.13, 3.8, -0.25, graphite);
    addBox(3.36, 0.08, 3.36, -0.1, accent, 0.035);
    addBox(3.44, 0.13, 3.44, 0.02, dark);
    addBox(3.02, 0.19, 3.02, 0.3, silver);
    addBox(2.95, 0.1, 2.95, 0.44, dark);
    const lightPlate = addBox(2.46, 0.055, 2.46, 0.61, accent, 0.025);
    const lid = addBox(2.57, 0.3, 2.57, 0.86, graphite, 0.08);
    const frameMaterial = new THREE.LineBasicMaterial({ color: 0x90cbb0, transparent: true, opacity: 0.5 });
    const frame = new THREE.LineSegments(new THREE.EdgesGeometry(lid.geometry, 30), frameMaterial); lid.add(frame);

    const labelCanvas = document.createElement('canvas'); labelCanvas.width = 768; labelCanvas.height = 768;
    const ctx = labelCanvas.getContext('2d');
    ctx.fillStyle = '#192a22'; ctx.fillRect(0, 0, 768, 768);
    const gradient = ctx.createLinearGradient(0, 0, 768, 768); gradient.addColorStop(0, '#223e30'); gradient.addColorStop(0.55, '#15261d'); gradient.addColorStop(1, '#263d31');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 768, 768);
    ctx.strokeStyle = '#587764'; ctx.lineWidth = 2; ctx.strokeRect(32, 32, 704, 704);
    ctx.fillStyle = '#ceffe2'; ctx.textAlign = 'center'; ctx.font = 'bold italic 258px Arial'; ctx.fillText('VT', 380, 439);
    ctx.font = '22px Arial'; ctx.fillStyle = '#91ad9a'; ctx.fillText('VIRTUALIZATION', 384, 537);
    ctx.fillStyle = '#89efb2'; ctx.fillRect(355, 590, 58, 5);
    const texture = new THREE.CanvasTexture(labelCanvas); texture.colorSpace = THREE.SRGBColorSpace;
    const labelMaterial = mat({ map: texture, metalness: 0.52, roughness: 0.35 });
    const label = new THREE.Mesh(new THREE.PlaneGeometry(2.44, 2.44), labelMaterial); label.rotation.x = -Math.PI / 2; label.position.y = 1.012; sculpture.add(label);

    const pinGeometry = new THREE.BoxGeometry(0.072, 0.07, 0.25);
    for (let side = 0; side < 4; side++) {
      for (let i = 0; i < 19; i++) {
        const angle = side * Math.PI / 2;
        const p = new THREE.Mesh(pinGeometry, pin);
        const v = new THREE.Vector3(-1.4 + i * 0.155, 0.27, 1.61).applyAxisAngle(new THREE.Vector3(0, 1, 0), angle);
        p.position.copy(v); p.rotation.y = angle; sculpture.add(p);
      }
    }
    const traces = new THREE.Group(); traces.position.y = -0.34; sculpture.add(traces);
    const traceMaterial = new THREE.LineBasicMaterial({ color: 0x507e62, transparent: true, opacity: 0.42 });
    const pulseMaterial = new THREE.MeshBasicMaterial({ color: 0x9cf8c1, transparent: true, opacity: 0.85 });
    const pulses = [];
    for (let side = 0; side < 4; side++) {
      for (let i = 0; i < 7; i++) {
        const x = (i - 3) * 0.37;
        const points = [new THREE.Vector3(x, 0, 1.86), new THREE.Vector3(x, 0, 2.2 + (i % 3) * 0.25), new THREE.Vector3(x + (i - 3) * 0.22, 0, 2.8 + (i % 3) * 0.25), new THREE.Vector3(x + (i - 3) * 0.22, 0, 3.5 + (i % 2) * 0.55)];
        points.forEach(p => p.applyAxisAngle(new THREE.Vector3(0, 1, 0), side * Math.PI / 2));
        const geometry = new THREE.BufferGeometry().setFromPoints(points); traces.add(new THREE.Line(geometry, traceMaterial));
        if (i % 2 === 0) {
          const orb = new THREE.Mesh(new THREE.SphereGeometry(0.026, 5, 5), pulseMaterial); traces.add(orb);
          pulses.push({ orb, points, offset: side * 0.21 + i * 0.15 });
        }
      }
    }
    const reduced = matchMedia('(prefers-reduced-motion: reduce)');
    let visible = true, raf = 0, last = 0, targetX = 0, targetY = 0;
    const resize = () => {
      const { width, height } = element.getBoundingClientRect();
      renderer.setSize(width, height); camera.aspect = width / height; camera.updateProjectionMatrix();
      draw(0);
    };
    const draw = time => {
      const t = reduced.matches ? 0 : time / 1000;
      sculpture.position.y = reduced.matches ? 0 : Math.sin(t * 0.7) * 0.045;
      sculpture.rotation.y += ((-0.15 + (reduced.matches ? 0 : targetX * 0.13)) - sculpture.rotation.y) * 0.045;
      sculpture.rotation.x += ((reduced.matches ? 0 : targetY * 0.05) - sculpture.rotation.x) * 0.045;
      lightPlate.material.emissiveIntensity = reduced.matches ? 1.4 : 1.4 + Math.sin(t * 1.1) * 0.28;
      traces.visible = themeRef.current === 'dark';
      pulses.forEach(({ orb, points, offset }) => {
        const progress = ((t * 0.25 + offset) % 1) * 3;
        const index = Math.floor(progress);
        orb.position.lerpVectors(points[index], points[index + 1], progress - index);
      });
      renderer.render(scene, camera);
    };
    const animate = time => {
      raf = requestAnimationFrame(animate);
      if (!visible || document.hidden || time - last < 32) return;
      last = time; draw(time);
    };
    const move = e => { const r = element.getBoundingClientRect(); targetX = (e.clientX - r.left) / r.width - 0.5; targetY = (e.clientY - r.top) / r.height - 0.5; };
    const reset = () => { targetX = 0; targetY = 0; };
    element.addEventListener('pointermove', move); element.addEventListener('pointerleave', reset);
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; }); observer.observe(element);
    const resizeObserver = new ResizeObserver(resize); resizeObserver.observe(element);
    resize(); raf = requestAnimationFrame(animate);
    element.dataset.ready = 'true';
    return () => {
      cancelAnimationFrame(raf); observer.disconnect(); resizeObserver.disconnect();
      element.removeEventListener('pointermove', move); element.removeEventListener('pointerleave', reset);
      const geometries = new Set(); scene.traverse(obj => { if (obj.geometry) geometries.add(obj.geometry); }); geometries.forEach(g => g.dispose());
      materials.forEach(m => m.dispose()); frameMaterial.dispose(); traceMaterial.dispose(); pulseMaterial.dispose(); texture.dispose(); environmentMap.dispose(); renderer.dispose(); renderer.domElement.remove();
    };
  }, []);

  return <div ref={host} className="chip-scene" role="img" aria-label="悬浮的 VT 芯片三维概念视觉，绿色电路连接分层芯片"><img className="chip-fallback" src="./images/chip-fallback.webp" alt="VT 芯片概念视觉" /></div>;
}
