import './style.css';
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { Pane } from 'tweakpane';
import CameraControls from 'camera-controls';

/**
 * My libs
 */
import TMDParser from './lib/TMDParser';
import BinaryReader from './lib/BinaryReader';
import VertexInteraction from './lib/VertexInteraction';

const canvas = document.querySelector('canvas#webgl');
const divEditor = document.querySelector('div#editor');
let tweakpane = null;
let models = [];

let binfile_test;
let tmds_test;

CameraControls.install( { THREE: THREE } );

const inputFile = document.getElementById('inputFile');
inputFile.addEventListener('change', async function (evt) {
  const file = evt.target.files[0];

  if (file) {
    const fileReader = new FileReader();

    fileReader.onload = function () {
      const arrayBuffer = fileReader.result;

      const reader = new BinaryReader(arrayBuffer);
      const tmdParser = new TMDParser();
      const tmds = tmdParser.parse(reader);

      binfile_test = reader;
      tmds_test = tmds;

      console.log(tmds)

      console.log(tmds[10].objects[0].vertex)
      if(tweakpane !== null) {
        tweakpane.dispose();
      }
      renderTMDs(tmds);
    }

    fileReader.readAsArrayBuffer(file);
  }
});

// Aunque si sirve, hay que revisar como funciona el renderizado
// cada vez que seabre un archivo, es decir, tiene que resetearse todo!
// se están empalmandolos demás modelos
const buttonDownload = document.getElementById('download');
buttonDownload.addEventListener('click', function(evt) {
  // if(models.length > 0) {
  //   models.forEach((tmd, index) => {
  //     if(index === 10) {
  //       const positions = tmd.mesh.geometry.attributes.position.array.slice();
  //       for(let i = 0; i < positions.length; i+=3) {
  //         console.log({
  //           x: positions[i],
  //           y: positions[i+1],
  //           z: positions[i+2]
  //         })
  //       }
  //     }
  //   })
  // }
  const tmdParser = new TMDParser();
  //console.log(models[0].mesh.geometry.attributes.position.array.slice())
  let patchedTMDs = [];

  const iScale = 1/0.001;
  const iRotation = Math.PI;

  models.forEach((tmd) => {
    const positions = tmd.mesh.geometry.attributes.position.array.slice();
    const vertex = []
    for(let i = 0; i < positions.length; i+=3) {
      const iY = positions[i+1] * Math.cos(iRotation) - positions[i+2] * Math.sin(iRotation);
      const iZ = positions[i+1] * Math.sin(iRotation) + positions[i+2] * Math.cos(iRotation);
      vertex.push({
        x: Math.round(positions[ i ] * iScale),
        y: Math.round(iY * iScale), //positions[i+1],
        z: Math.round(iZ * iScale), //positions[i+2]
      });
    }

    patchedTMDs.push({
      objects: [{vertex: vertex}]
    })

    // const objects = [];
    // objects.push({vertex: vertex})
    // patchedTMDs.objects = objects;
  });

  console.log(patchedTMDs)

  const patchedFile = tmdParser.patchVertex(binfile_test, tmds_test, patchedTMDs);

  const blob = new Blob([patchedFile.dataView], { type: "application/octet-stream" });
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = "PATCHED.BIN";
  link.click();
  URL.revokeObjectURL(link.href);

  // Aunque ya pude hacer que descargara un archivo BIN,
  // hay que revisar que la información ya que desde JS
  // vienen con muchos decimales y al pasarlos al BIN,
  // no se redondean correctamente.
  // (Ej: -7699.999809265137 se queda como -7699, pero lo esperado es -7700)

})

/**
 * THREE JS STUFF
 */
function renderTMDs(data) {

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
  const clock = new THREE.Clock();
  const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.01, 1000);
  camera.position.set(0, 0, 5);

  const cameraControls = new CameraControls( camera, renderer.domElement );
  cameraControls.infinityDolly = true;
  cameraControls.dollyToCursor = true;
  cameraControls.minDistance = 3;
  cameraControls.maxDistance = 7;

  /**
   * Post-processing
   */
  const composer = new EffectComposer(renderer);
  const renderPass = new RenderPass(scene, camera);
  composer.addPass(renderPass);
  const bloomPass = new UnrealBloomPass(
    new THREE.Vector2(sizes.width, sizes.height),
    0.5, // strength (intensity)
    0.1, // radius
    0.0  // threshold
  );
  composer.addPass(bloomPass);

  /**
   * Mesh: Dummy Mesh for testing
   */
  // const geometry = new THREE.BoxGeometry(3, 3, 3);
  // const material = new THREE.MeshBasicMaterial({ color: 0x00ff00, wireframe: true });
  // const mesh = new THREE.Mesh(geometry, material);
  // scene.add(mesh)
  // console.log(sizes)

  /**
   * TMD MODELS
   */
  models = [];
  const backupModels = [];
  const interactions = [];
  let activeInteraction = null;

  data.forEach((tmd, index) => {
    const geometry = new THREE.BufferGeometry();
    //const vertices = new Float32Array(tmd.objects[0].vertex.flatMap(({ x, y, z }) => [x / 1000, y / 1000, z / 1000]));
    const scale = 0.001;
    const rotationX = -Math.PI;
    const vertices = new Float32Array(tmd.objects[0].vertex.flatMap(({ x, y, z }) => {
      x *= scale;
      y *= scale;
      z *= scale;

      const rY = y * Math.cos(rotationX) - z * Math.sin(rotationX);
      const rZ = y * Math.sin(rotationX) + z * Math.cos(rotationX);

      return [x, rY, rZ];
    }));
    const indices  = [];

    // We need to build the faces.
    // Each face is composed by 2 triangles, that's why the array is pushed twice.
    // The composition of the first triangle is: vi0, vi1, vi2
    // The composition of the second one is:     vi1, vi3, vi2
    for(let i=0; i < tmd.objects[0].vertexIdx.length; i+=4) {
      indices.push(tmd.objects[0].vertexIdx[i], tmd.objects[0].vertexIdx[i+1], tmd.objects[0].vertexIdx[i+2]);
      indices.push(tmd.objects[0].vertexIdx[i+1], tmd.objects[0].vertexIdx[i+3], tmd.objects[0].vertexIdx[i+2]);
    }

    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));


    const material = new THREE.MeshBasicMaterial({color: 0x00ff00, wireframe: true});
    const mesh = new THREE.Mesh(geometry, material);
    //mesh.rotation.x = -Math.PI;
    //mesh.scale.set(scale, scale, scale);
    mesh.visible = true;
    scene.add(mesh);

    const points = new THREE.Points(geometry, new THREE.PointsMaterial({
      size: 0.1,
      color: 'white'
    }));
    points.visible = true;
    scene.add(points);

    const interaction = new VertexInteraction(canvas, geometry, points, 0.1, cameraControls, cameraControls.camera, sizes);
    interactions.push(interaction)


    models.push({mesh, points, visible:true});
    backupModels.push({positions: geometry.attributes.position.array.slice()})

    // TODO:
    // I need to scale the geometry, not the mesh,
    // because the points are being set according to
    // the geometry positions.

  });

  /**
   * Vertex Listeners
   */
  canvas.addEventListener("mousedown", (e) => {
    activeInteraction = interactions.find((interaction) => interaction.mouseDown(e));
  }, false);

  canvas.addEventListener("mousemove", (e) => {
    if(activeInteraction) {
      activeInteraction.mouseMove(e);
      composer.render();
    }
  }, false);

  canvas.addEventListener("mouseup", (e) => {
    if(activeInteraction) {
      activeInteraction.mouseUp(e);
      composer.render();
      activeInteraction = null;
    }
  }, false);


  /**
   * tweakpane
   */
  tweakpane = new Pane({
    container: document.getElementById('toolpane'),
    title: 'TMDs',
    expanded: true,
  });

  models.forEach((tmd, index) => {

    const f = tweakpane.addFolder({ title: `Object ${index + 1}`, expanded: false });
    f.addBinding(tmd, 'visible').on('change', (ev) => {
      tmd.mesh.visible = ev.value;
      tmd.points.visible = ev.value;
      composer.render();
    });
    f.addButton({title: 'Focus'}).on('click', () => cameraControls.fitToSphere(tmd.mesh, true));
    f.addButton({title: 'Reset'}).on('click', () => {
      const positions = tmd.mesh.geometry.attributes.position.array;
      const originalPositions = backupModels[index].positions;

      for (let i = 0; i < originalPositions.length; i++) {
          positions[i] = originalPositions[i];
      }
      tmd.mesh.geometry.attributes.position.needsUpdate = true;
      tmd.mesh.geometry.computeBoundingSphere();
      composer.render();
    });
  });


  composer.render();

  /**
   * Animate
   */
  const animate = () => {
    const delta = clock.getDelta();
	  const updated = cameraControls.update( delta );

    //renderer.render(scene, camera); //comment if you want to use unreal bloom pass

    //mesh.rotation.y += 0.01; // Dummy Mesh for testing
    window.requestAnimationFrame(animate);

    if (updated) {
      composer.render();
    }
  };

  animate();

}
