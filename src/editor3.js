import './style.css';
import * as THREE from 'three';
import CameraControls from 'camera-controls';
import VertexInteraction from './lib/VertexInteraction';


const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0,0,5)
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Configurar camera-controls
CameraControls.install({ THREE: THREE });
const cameraControls = new CameraControls(camera, renderer.domElement);

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
const interaction = new VertexInteraction(renderer.domElement, geometry, points, 0.25, cameraControls, cameraControls.camera, {width: window.innerWidth, height: window.innerHeight});

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

