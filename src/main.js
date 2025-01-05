import BinaryReader from './lib/BinaryReader';
import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';

function adjustCameraAndControls(camera, controls, object, offset = 1.5) {

  const box = new THREE.Box3().setFromObject(object);
  const size = new THREE.Vector3();
  const center = new THREE.Vector3();
  box.getSize(size);
  box.getCenter(center);

  const maxDim = Math.max(size.x, size.y, size.z);
  const fov = camera.fov * (Math.PI / 180);
  const cameraZ = Math.abs(maxDim / (2 * Math.tan(fov / 2))) * offset;

  camera.position.set(center.x, center.y, cameraZ);

  controls.target.set(center.x, center.y, center.z);
  controls.update();

  camera.lookAt(center);

  camera.updateProjectionMatrix();
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
      reader.nextInt16(); // discard the PAD (0x0000)
    }

    object.vertex = vertex;
  });



  return tmd;

}

function parseTMD(reader) {
  const tmds = [];
  while(reader.offset < reader.dataView.byteLength-4) {
    const bytes = reader.nextUint32();
    if(bytes===0x00000041) { // TMD ID
      tmds.push(getTMD(reader));
    }
  }
  return tmds;
}

const inputFile = document.getElementById('inputFile');
inputFile.addEventListener('change', async function(evt) {
  const file = evt.target.files[0];

  if(file) {
    const fileReader = new FileReader();

    fileReader.onload = function() {
      const arrayBuffer = fileReader.result;

      const reader = new BinaryReader(arrayBuffer);
      const tmds = parseTMD(reader);

      console.log(tmds)

      //renderTMDs(tmds[10]); // porteria
      renderTMDs(tmds[8]); // techo del estadio?
    }

    fileReader.readAsArrayBuffer(file);
  }
})

function renderTMDs(data) {
  const canvas = document.getElementById('webgl');

  // Scene
  const scene = new THREE.Scene();

  const geometry = new THREE.BufferGeometry();
  const vertices = new Float32Array(data.objects[0].vertex.flatMap(({ x, y, z }) => [x / 1000, y / 1000, z / 1000]));
  const indices  = [];

  // We need to build the faces.
  // Each face is composed by 2 triangles, that's why the array is pushed twice.
  // The composition of the first triangle is: vi0, vi1, vi2
  // The composition of the second one is:     vi1, vi3, vi2
  for(let i=0; i < data.objects[0].vertexIdx.length; i+=4) {
    indices.push(data.objects[0].vertexIdx[i], data.objects[0].vertexIdx[i+1], data.objects[0].vertexIdx[i+2]);
    indices.push(data.objects[0].vertexIdx[i+1], data.objects[0].vertexIdx[i+3], data.objects[0].vertexIdx[i+2]);
  }

  console.log(vertices)

  geometry.setIndex(indices);
  geometry.setAttribute( 'position', new THREE.BufferAttribute( vertices, 3 ) );

  const material = new THREE.MeshBasicMaterial( { color: 0xff0000, wireframe: true } );
  const mesh = new THREE.Mesh( geometry, material );
  scene.add(mesh);

  // Camera
  const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 100);
  //camera.position.set(0,1,5);
  //scene.add(camera);

  // Controls
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;

  // Renderer
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true});
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  adjustCameraAndControls(camera, controls, mesh);

  function animate() {
    requestAnimationFrame(animate);

    // Update controls
    controls.update();

    renderer.render(scene, camera);
  }
  animate();
}