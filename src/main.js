import './style.css';
import * as THREE from 'three';


function findTMDOffsets(buffer) {
  const tmdHeader = [0x41, 0x00, 0x00, 0x00];
  let offset = 0;
  const tmds = [];
  while(offset <= buffer.length - tmdHeader.length) {
    if (tmdHeader.every((byte, index) => buffer[offset + index] === byte)) {
      tmds.push({dec: offset, hex: offset.toString(16).toUpperCase().padStart(8, '0')});
    }
    offset++;
  }
  return tmds;
}

const inputFile = document.getElementById('inputFile');
inputFile.addEventListener('change', async function(evt) {
  const file = evt.target.files[0];

  if(file) {
    const reader = new FileReader();

    reader.onload = function() {
      const arrayBuffer = reader.result;
      const buffer = new Uint8Array(arrayBuffer);

      const offsets = findTMDOffsets(buffer, [0x41, 0x00, 0x00, 0x00]);

      const dv = new DataView(arrayBuffer);

    }

    reader.readAsArrayBuffer(file);
  }
})


const canvas = document.getElementById('webgl');

// Scene
const scene = new THREE.Scene();

const cube = new THREE.Mesh(
  new THREE.BoxGeometry(1,1,1),
  new THREE.MeshNormalMaterial()
);

scene.add(cube);

// Camera
const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
camera.position.set(0,1,5);
scene.add(camera)

// Renderer
const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true});
renderer.setSize(canvas.clientWidth, canvas.clientHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

function animate() {
  requestAnimationFrame(animate);

  renderer.render(scene, camera);
}

animate();