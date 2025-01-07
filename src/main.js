import BinaryReader from './lib/BinaryReader';
import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
//import { TransformControls } from 'three/examples/jsm/controls/TransformControls';
import GUI from 'lil-gui';

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

      // Packet Configuration for 4 Vertex Polygon with No Light Source.
      // Source: https://psx.arthus.net/sdk/Psy-Q/DOCS/Devrefs/Filefrmt.pdf
      // Page 77
      const packetHeader = reader.nextUint32();
      if(packetHeader === 0x2D010709) { // Flat, Texture
        // Let's move 20 bytes to get the vertex index.
        reader.seek(reader.offset+20);
      }
      if(packetHeader === 0x3D010A0C) { // Gradation, Texture
        // Let's move 32 bytes to get the vertex index.
        reader.seek(reader.offset+32);
      }
      if(packetHeader === 0x3F010A0C) { // Unknow, found on debug
        // Probably it's the same as the "Gradation, Texture"
        // Let's move 32 bytes to get the vertex index.
        reader.seek(reader.offset+32);
      }
      if(packetHeader === 0x2F010709) { // Unknow, found on debug
        // Probably it's the same as the "Flat, Texture"
        // Let's move 20 bytes to get the vertex index.
        reader.seek(reader.offset+20);
      }
      if(packetHeader === 0x3B010608) { // Unknow, found on debug
        // Probably it's the same as the "Gradation, No-Texture"
        // Let's move 16 bytes to get the vertex index.
        reader.seek(reader.offset+16);
      }
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
    // TODO: Is it better to find the tmd using more bytes from the header?
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
      //renderTMDs(tmds[8]); // techo del estadio?
      renderTMDs(tmds);
    }

    fileReader.readAsArrayBuffer(file);
  }
})

function renderTMDs(data) {
  const canvas = document.getElementById('webgl');

  // Scene
  const scene = new THREE.Scene();

  // TMD Models
  const models = [];
  data.forEach((tmd) => {
    const geometry = new THREE.BufferGeometry();
    const vertices = new Float32Array(tmd.objects[0].vertex.flatMap(({ x, y, z }) => [x / 1000, y / 1000, z / 1000]));
    const indices  = [];

    // We need to build the faces.
    // Each face is composed by 2 triangles, that's why the array is pushed twice.
    // The composition of the first triangle is: vi0, vi1, vi2
    // The composition of the second one is:     vi1, vi3, vi2
    for(let i=0; i < tmd.objects[0].vertexIdx.length; i+=4) {
      indices.push(tmd.objects[0].vertexIdx[i], tmd.objects[0].vertexIdx[i+1], tmd.objects[0].vertexIdx[i+2]);
      indices.push(tmd.objects[0].vertexIdx[i+1], tmd.objects[0].vertexIdx[i+3], tmd.objects[0].vertexIdx[i+2]);
    }

    //console.log(vertices)

    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    const material = new THREE.MeshBasicMaterial({color: 0xff0000, wireframe: true});
    const mesh = new THREE.Mesh(geometry, material);
    //mesh.visible = false;
    scene.add(mesh);

    models.push({mesh, visible:true})
  })

  // Camera
  const camera = new THREE.PerspectiveCamera(50, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
  camera.position.set(0,0,100);
  //camera.lookAt(0,0,0)
  scene.add(camera);

  // Controls
  //const controls = new OrbitControls(camera, canvas);
  //controls.enableDamping = true;

  // Renderer
  const renderer = new THREE.WebGLRenderer({canvas, antialias: true, alpha: true});
  renderer.setSize(canvas.clientWidth, canvas.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

  //adjustCameraAndControls(camera, controls, mesh);

  // Add a cube just for debug
  // scene.add(new THREE.Mesh(new THREE.BoxGeometry(1,1,1), new THREE.MeshBasicMaterial({color: 'red'})));

  const gui = new GUI();
  models.forEach((tmd, index) => {
      gui.add(tmd, 'visible').name(`Objeto ${index + 1}`).onChange((visible) => {
          tmd.mesh.visible = visible;
      });
  });

  const cameraFolder = gui.addFolder('Camera');
  const cameraSettings = {
      positionX: camera.position.x,
      positionY: camera.position.y,
      positionZ: camera.position.z,
      rotationX: camera.rotation.x,
      rotationY: camera.rotation.y,
      rotationZ: camera.rotation.z
  };

  cameraFolder.add(cameraSettings, 'positionX', -100, 100, 1).onChange(value => {
      camera.position.x = value;
  });
  cameraFolder.add(cameraSettings, 'positionY', -100, 100, 1).onChange(value => {
      camera.position.y = value;
  });
  cameraFolder.add(cameraSettings, 'positionZ', -100, 100, 1).onChange(value => {
      camera.position.z = value;
      camera.lookAt(0,0,0);
  });

  cameraFolder.add(cameraSettings, 'rotationX', -Math.PI, Math.PI, 0.01).onChange(value => {
      camera.rotation.x = value;
  });
  cameraFolder.add(cameraSettings, 'rotationY', -Math.PI, Math.PI, 0.01).onChange(value => {
      camera.rotation.y = value;
  });
  cameraFolder.add(cameraSettings, 'rotationZ', -Math.PI, Math.PI, 0.01).onChange(value => {
      camera.rotation.z = value;
  });

  cameraFolder.open();

  function animate() {
    requestAnimationFrame(animate);

    // Update controls
    //controls.update();

    renderer.render(scene, camera);
  }
  animate();
}