import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

// Canvas
const canvas = document.querySelector('canvas#webgl');

// Scene
const scene = new THREE.Scene();

/**
 * Object
 */
const geometry = new THREE.BufferGeometry();
const vertices = new Float32Array([
  -1.0, -1.0, 1.0, // v0
   1.0, -1.0, 1.0, // v1
   1.0,  1.0, 1.0, // v2
   1.0,  1.0, 1.0, // v3
  -1.0,  1.0, 1.0, // v4
  -1.0, -1.0, 1.0  // v5
]);
geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
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
const renderer = new THREE.WebGLRenderer({ canvas });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

/**
 * Interaction
 * It was taken from
 * https://hofk.de/main/discourse.threejs/2018/Interaction%20with%20Points/Interaction%20with%20Points.html
 * @author prisoner849
 *
 * More info:
 * https://discourse.threejs.org/t/line-segment-coordinates/4358/3
 */
let raycaster = new THREE.Raycaster();
raycaster.params.Points.threshold = 0.25;
let mouse = new THREE.Vector2();
let intersects = null;
let plane = new THREE.Plane();
let planeNormal = new THREE.Vector3();
let currentIndex = null;
let planePoint = new THREE.Vector3();
let dragging = false;

window.addEventListener("mousedown", mouseDown, false);
window.addEventListener("mousemove", mouseMove, false);
window.addEventListener("mouseup", mouseUp, false);

function mouseDown(event) {
  setRaycaster(event);
  getIndex();
  dragging = true;
}

function mouseMove(event) {
  if (dragging && currentIndex !== null) {
    setRaycaster(event);
    raycaster.ray.intersectPlane(plane, planePoint);
    geometry.attributes.position.setXYZ(currentIndex, planePoint.x, planePoint.y, planePoint.z);
    geometry.attributes.position.needsUpdate = true;

    // Recalculate the bounding sphere of the geometry after modifying the positions.
    // This is necessary because the raycaster uses the geometry's bounding limits
    // to detect intersections.
    // If we don't update these limits, the raycaster won't correctly detect
    // the points in their new positions.
    geometry.computeBoundingSphere();
  }
}

function mouseUp(event) {
  dragging = false;
  currentIndex = null;
  controlsEnabled(true);
}

function getIndex() {
  intersects = raycaster.intersectObject(points);
  if (intersects.length === 0) {
    currentIndex = null;
    return;
  }
  controlsEnabled(false);
  currentIndex = intersects[0].index;
  setPlane(intersects[0].point);
  console.log(currentIndex, intersects[0].point)
}

function setPlane(point) {
  planeNormal.subVectors(camera.position, point).normalize();
  plane.setFromNormalAndCoplanarPoint(planeNormal, point);
}

function setRaycaster(event) {
  getMouse(event);
  raycaster.setFromCamera(mouse, camera);
}

function getMouse(event) {
  mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
  mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
}

function controlsEnabled(state){
	controls.enableZoom = state;
  controls.enableRotate = state;
  controls.enablePan = state;
}



/**
 * Animate
 */
const animate = () => {
  //controls.update();
  renderer.render(scene, camera);
  window.requestAnimationFrame(animate);
};

animate();
