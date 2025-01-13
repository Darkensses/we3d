import BinaryReader from './lib/BinaryReader';
import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

function parseModelBin_Ball01(reader) {
	const models = [];
	reader.seek(0x730);

	const indices = [];
	while(reader.offset < 0xf60) {
		indices.push(reader.nextUint16());
		indices.push(reader.nextUint16());
		indices.push(reader.nextUint16());
		indices.push(reader.nextUint16());
		reader.seek(reader.offset+16);
	}
	reader.seek(reader.offset-16);
	console.log(reader.offset, reader.offset.toString(16).toUpperCase().padStart(8, '0'));

	const vertex = [];
	while(reader.offset < 0x12c0) {
		vertex.push(reader.nextInt16());
		vertex.push(reader.nextInt16());
		vertex.push(reader.nextInt16());
		reader.nextInt16();
	}

	return {indices, vertex};
}

function parseModelBin_Ball02(reader) {
	const models = [];
	reader.seek(0x12D0);

	const indices = [];
	while(reader.offset < 0x1740) {
		indices.push(reader.nextUint16());
		indices.push(reader.nextUint16());
		indices.push(reader.nextUint16());
		indices.push(reader.nextUint16());
		reader.seek(reader.offset+16);
	}
	reader.seek(reader.offset-16);
	console.log(reader.offset, reader.offset.toString(16).toUpperCase().padStart(8, '0'));

	const vertex = [];
	while(reader.offset < 0x18D8) {
		vertex.push(reader.nextInt16());
		vertex.push(reader.nextInt16());
		vertex.push(reader.nextInt16());
		reader.nextInt16();
	}

	return {indices, vertex};
}

function parseModelBin_Body01(reader) {
	const models = [];
	reader.seek(0x18E8);

	const indices = [];
	while(reader.offset < 0x1AE8) {
		indices.push(reader.nextUint16());
		indices.push(reader.nextUint16());
		indices.push(reader.nextUint16());
		indices.push(reader.nextUint16());
		reader.seek(reader.offset+16);
	}
	reader.seek(reader.offset-16);
	console.log(reader.offset, reader.offset.toString(16).toUpperCase().padStart(8, '0'));

	const vertex = [];
	while(reader.offset < 0x1BF8) {
		vertex.push(reader.nextInt16());
		vertex.push(reader.nextInt16());
		vertex.push(reader.nextInt16());
		reader.nextInt16();
	}

	return {indices, vertex};
}

function parseModelBin_ArmOrLeg01(reader) {
	const models = [];
	reader.seek(0x1C08);

	const indices = [];
	while(reader.offset < 0x1C70) {
		indices.push(reader.nextUint16());
		indices.push(reader.nextUint16());
		indices.push(reader.nextUint16());
		indices.push(reader.nextUint16());
		reader.seek(reader.offset+16);
	}
	reader.seek(reader.offset-16);
	console.log(reader.offset, reader.offset.toString(16).toUpperCase().padStart(8, '0'));

	const vertex = [];
	while(reader.offset < 0x1CB8) {
		vertex.push(reader.nextInt16());
		vertex.push(reader.nextInt16());
		vertex.push(reader.nextInt16());
		reader.nextInt16();
	}

	return {indices, vertex};
}

function parseModelBin(reader) {
	const models = [];
	reader.seek(0x93A8);

	const indices = [];
	while(reader.offset < 0x9638) {
		indices.push(reader.nextUint16());
		indices.push(reader.nextUint16());
		indices.push(reader.nextUint16());
		indices.push(reader.nextUint16());
		reader.seek(reader.offset+16);
	}
	reader.seek(reader.offset-16);
	console.log(reader.offset, reader.offset.toString(16).toUpperCase().padStart(8, '0'));

	const vertex = [];
	while(reader.offset < 0x9770) {
		vertex.push(reader.nextInt16());
		vertex.push(reader.nextInt16());
		vertex.push(reader.nextInt16());
		reader.nextInt16();
	}

	return {indices, vertex};
}

const inputFile = document.getElementById('inputFile');
inputFile.addEventListener('change', async function(evt) {
	const file = evt.target.files[0];

	if(file) {
		const fileReader = new FileReader();

		fileReader.onload = function() {
			const arrayBuffer = fileReader.result;

			const reader = new BinaryReader(arrayBuffer);
			const models = parseModelBin(reader);

			console.log(models)

			renderModel(models);
		}

		fileReader.readAsArrayBuffer(file);
	}
});

function renderModel(models) {
	const canvas = document.getElementById('webgl');

	// Scene
	const scene = new THREE.Scene();
	//scene.rotation.x = Math.PI;
	//scene.scale.x = -1;

	const indices = [];
	for(let i=0; i < models.indices.length; i+=4) {
		indices.push(models.indices[i], models.indices[i+1], models.indices[i+2]);
		indices.push(models.indices[i+1], models.indices[i+3], models.indices[i+2]);
	}

	const geometry = new THREE.BufferGeometry();
	geometry.setIndex(indices);
	const vertices = new Float32Array(models.vertex)
	geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

	const material = new THREE.MeshBasicMaterial({color: 0xff0000, wireframe: true});
	const mesh = new THREE.Mesh(geometry, material);
	mesh.rotation.x = -Math.PI;
	scene.add(mesh);

	// Camera
	const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
	camera.position.set(0,0,100);
	//camera.lookAt(0,0,0)
	scene.add(camera);

	// Controls
	const controls = new OrbitControls(camera, canvas);
	controls.enableDamping = true;

	// Renderer
	const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true});
	renderer.setSize(canvas.clientWidth, canvas.clientHeight);
	renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

	function animate() {
    requestAnimationFrame(animate);

    // Update controls
    controls.update();

    renderer.render(scene, camera);
  }
  animate();
}