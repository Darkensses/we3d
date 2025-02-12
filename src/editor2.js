import './style.css';
import * as THREE from 'three';
import CameraControls from 'camera-controls';
import VertexInteraction from './lib/VertexInteraction';

const canvas = document.querySelector('canvas#webgl');
const divEditor = document.querySelector('div#editor');


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

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000);
camera.position.z = 10;

CameraControls.install({ THREE: THREE });
const cameraControls = new CameraControls(camera, renderer.domElement);

const geometry = new THREE.BoxGeometry(1,1,1);
const mesh = new THREE.Mesh(
	geometry,
	new THREE.MeshBasicMaterial({ color: 'red', wireframe: true })
);
scene.add(mesh);

const points = new THREE.Points(geometry, new THREE.PointsMaterial({
	size: 0.025,
	color: 'yellow'
}));
scene.add(points);

const interaction = new VertexInteraction(canvas, geometry, points, 0.025, cameraControls, cameraControls.camera, sizes);

window.addEventListener("mousedown", (e) => interaction.mouseDown(e), false);
window.addEventListener("mousemove", (e) => {
	interaction.mouseMove(e);
	renderer.render(scene, camera);
}, false);
window.addEventListener("mouseup", (e) => {
	interaction.mouseUp(e);
	renderer.render(scene, camera);
}, false);

const clock = new THREE.Clock();

renderer.render(scene, camera);
function animate() {
	const delta = clock.getDelta();
	const elapsed = clock.getElapsedTime();
	const updated = cameraControls.update( delta );
	requestAnimationFrame(animate);
	if(updated) {
		renderer.render(scene, camera);
	}
}

animate();