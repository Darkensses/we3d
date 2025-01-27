import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import VertexInteraction from './lib/VertexInteraction';

// Canvas
const canvas = document.querySelector('canvas#webgl');

// Scene
const scene = new THREE.Scene();

/**
 * Object
 */
//const geometry = new THREE.BufferGeometry();
const vertices = new Float32Array([
  -1.0, -1.0, 1.0, // v0
   1.0, -1.0, 1.0, // v1
   1.0,  1.0, 1.0, // v2
   1.0,  1.0, 1.0, // v3
  -1.0,  1.0, 1.0, // v4
  -1.0, -1.0, 1.0  // v5
]);
//geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
const geometry = new THREE.BoxGeometry(1,1,1);
const mesh = new THREE.Mesh(
  geometry,
  new THREE.MeshBasicMaterial({ color: 'red', wireframe: true })
);
scene.add(mesh);

const points = new THREE.Points(geometry, new THREE.PointsMaterial({
  size: 0.25,
  color: 'yellow'
}));
scene.add(points);

/**
 * Sizes
 */
const sizes = { width: window.innerWidth, height: window.innerHeight };
window.addEventListener('resize', () => {
  sizes.width = window.innerWidth;
  sizes.height = window.innerHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
camera.position.set(0, 0, 20);
camera.lookAt(scene.position)
scene.add(camera);

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const interaction = new VertexInteraction(geometry, points, 0.25, controls, camera, sizes);

window.addEventListener("mousedown", (e) => interaction.mouseDown(e), false);
window.addEventListener("mousemove", (e) => interaction.mouseMove(e), false);
window.addEventListener("mouseup", (e) => interaction.mouseUp(e), false);

/**
 * Animate
 */
const animate = () => {
  controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
};

animate();
