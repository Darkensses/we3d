import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';

const canvas = document.querySelector('canvas#webgl');
const divEditor = document.querySelector('div#editor');

const scene = new THREE.Scene();

/**
 * Sizes
 */
const sizes = { width: divEditor.clientWidth, height: divEditor.clientHeight };
window.addEventListener('resize', () => {
  sizes.width = divEditor.clientWidth;
  sizes.height = divEditor.clientHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

/**
 * Renderer
 */
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));



/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height);
camera.position.set(0, 0, 5);
camera.lookAt(scene.position)
scene.add(camera);

/**
 * Post-processing
 */
const composer = new EffectComposer(renderer);
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);
const bloomPass = new UnrealBloomPass(
  new THREE.Vector2(sizes.width, sizes.height),
  3.5, // strength (intensity)
  0.5, // radius
  0.0  // threshold
);
composer.addPass(bloomPass);

/**
 * Mesh
 */
const geometry = new THREE.BoxGeometry(3,3,3);
const material = new THREE.MeshBasicMaterial({color: 0x00ff00, wireframe: true});
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh)

console.log(sizes)

// Controls
const controls = new OrbitControls(camera, canvas);
controls.enableDamping = true;

/**
 * Animate
 */
const animate = () => {
  controls.update();
  //renderer.render(scene, camera);
  composer.render();
	mesh.rotation.y += 0.01;
  window.requestAnimationFrame(animate);
};

animate();