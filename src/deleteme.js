import './style.css';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import TMDParser from './lib/TMDParser';
import BinaryReader from './lib/BinaryReader';
import { Pane } from 'tweakpane';
import GUI from 'lil-gui';

const canvas = document.querySelector('canvas#webgl');
const divEditor = document.querySelector('div#editor');

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

      console.log(tmds)

      //renderTMDs(tmds[10]); // porteria
      //renderTMDs(tmds[8]); // techo del estadio?
      console.log(tmds[10].objects[0].vertex)
      renderTMDs(tmds);
    }

    fileReader.readAsArrayBuffer(file);
  }
});

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
  const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.1, 1000);
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
  const models = [];
  data.forEach((tmd) => {
    const geometry = new THREE.BufferGeometry();
    //const vertices = new Float32Array(tmd.objects[0].vertex.flatMap(({ x, y, z }) => [x / 1000, y / 1000, z / 1000]));
    const vertices = new Float32Array(tmd.objects[0].vertex.flatMap(({ x, y, z }) => [x, y, z]));
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
    const scale = 0.001;

    geometry.setIndex(indices);
    geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));

    const material = new THREE.MeshBasicMaterial({color: 0x00ff00, wireframe: true});
    const mesh = new THREE.Mesh(geometry, material);
    mesh.rotation.x = -Math.PI;
    mesh.scale.set(scale, scale, scale)
    //mesh.visible = false;
    scene.add(mesh);

    models.push({mesh, visible:true})
  });

  /**
   * tweakpane
   */

  const pane = new Pane({
    container: document.getElementById('toolpane'),
    title: 'TMDs',
    expanded: true,
  });

  //const gui = new GUI();
  models.forEach((tmd, index) => {

    // gui.add(tmd, 'visible').name(`Object ${index + 1}`).onChange((visible) => {
    //   tmd.mesh.visible = visible;
    // });

    const f = pane.addFolder({ title: `Object ${index + 1}`, expanded: false });
    f.addBinding(tmd, 'visible').on('change', (ev) => tmd.mesh.visible = ev.value);
    f.addButton({title: 'Camera'}).on('click', () => console.log('XDDD'));
  });


  // Controls
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;

  /**
   * Animate
   */
  const animate = () => {
    controls.update();
    //renderer.render(scene, camera); //comment if you want to use unreal bloom pass
    composer.render();
    //mesh.rotation.y += 0.01; // Dummy Mesh for testing
    window.requestAnimationFrame(animate);
  };

  animate();

}
