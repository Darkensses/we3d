import BinaryReader from './lib/BinaryReader';
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

function getTMD(reader) {
  let tmd = {};
  tmd._offset = (reader.offset-4).toString(16).toUpperCase().padStart(8, '0');
  // Header
  tmd.flags = reader.nextUint32();
  tmd.numObj = reader.nextUint32();

  const objects = [];
  for(let i=0; i < tmd.numObj; i++) {
    objects.push({
      // Object Table
      vertexTop: reader.nextUint32(),
      numVertex: reader.nextUint32(),
      normalTop: reader.nextUint32(),
      numNormal: reader.nextUint32(),
      primitiveTop: reader.nextUint32(),
      numPrimitive: reader.nextUint32(),
      scale: reader.nextInt32()
    });
  }
  tmd.objects = objects;

  tmd.objects.forEach(object => {
    // Iterate through the primitives
    const vertexIdx = [];
    for(let i=0; i < object.numPrimitive; i++) {
      // Let's move 24 bytes to get the vertex index
      reader.seek(reader.offset+24);
      vertexIdx.push(reader.nextUint16());
      vertexIdx.push(reader.nextUint16());
      vertexIdx.push(reader.nextUint16());
      vertexIdx.push(reader.nextUint16());
    }
    object.vertexIdx = vertexIdx; // if you divide by 4, it must get the numPrimitive

    // Iterate through the vertex positions ej:18
    const vertex = [];
    for(let i=0; i < object.numVertex; i++) {
      vertex.push({
        x: reader.nextInt16(),
        y: reader.nextInt16(),
        z: reader.nextInt16()
      });
      reader.nextInt16() // discard the PAD (00)
    }

    object.vertex = vertex;
  });



  return tmd;

}

function parseTMD(reader) {
  while(reader.offset < reader.dataView.byteLength-4) {
    const bytes = reader.nextUint32();
    if(bytes===0x00000041) { // TMD ID
      console.log(getTMD(reader))
    }
  }
}

const inputFile = document.getElementById('inputFile');
inputFile.addEventListener('change', async function(evt) {
  const file = evt.target.files[0];

  if(file) {
    const fileReader = new FileReader();

    fileReader.onload = function() {
      const arrayBuffer = fileReader.result;
      const buffer = new Uint8Array(arrayBuffer);

      //const offsets = findTMDOffsets(buffer, [0x41, 0x00, 0x00, 0x00]);

      const reader = new BinaryReader(arrayBuffer);
      parseTMD(reader)
      console.log(reader.dataView.byteLength);

    }

    fileReader.readAsArrayBuffer(file);
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