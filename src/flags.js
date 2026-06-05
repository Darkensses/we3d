import './style.css';
import * as THREE from 'three';
import CameraControls from 'camera-controls';
import { STADIUMS, stadiumById } from './lib/stadiums.js';
import SelectBINParser from './lib/SelectBINParser.js';
import TMDParser from './lib/TMDParser.v2.js';
import BinaryReader from './lib/BinaryReader.js';
import { SCALE } from './lib/coords.js';

CameraControls.install({ THREE });

const statusEl = document.getElementById('status');
function setStatus(msg) { statusEl.textContent = msg; }

const parser = new SelectBINParser();
const canvas = document.querySelector('canvas#webgl');
const divEditor = document.querySelector('div#editor');

const scene = new THREE.Scene();
const sizes = { width: divEditor.clientWidth, height: divEditor.clientHeight };
const renderer = new THREE.WebGLRenderer({ canvas, alpha: true });
renderer.setSize(sizes.width, sizes.height);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height, 0.01, 1000);
camera.position.set(0, 8, 30);
const cameraControls = new CameraControls(camera, renderer.domElement);
cameraControls.maxDistance = 200;

window.addEventListener('resize', () => {
  sizes.width = divEditor.clientWidth;
  sizes.height = divEditor.clientHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

let stadiumMesh = null;

function buildStadiumMesh(tmd) {
  const geometry = new THREE.BufferGeometry();
  const rotationX = -Math.PI;
  const vertices = new Float32Array(tmd.objects[0].vertex.flatMap(({ x, y, z }) => {
    const sx = x * SCALE, sy = y * SCALE, sz = z * SCALE;
    const rY = sy * Math.cos(rotationX) - sz * Math.sin(rotationX);
    const rZ = sy * Math.sin(rotationX) + sz * Math.cos(rotationX);
    return [sx, rY, rZ];
  }));
  const indices = [];
  const vi = tmd.objects[0].vertexIdx;
  for (let i = 0; i < vi.length; i += 4) {
    indices.push(vi[i], vi[i + 1], vi[i + 2]);
    indices.push(vi[i + 1], vi[i + 3], vi[i + 2]);
  }
  geometry.setIndex(indices);
  geometry.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
  const material = new THREE.MeshBasicMaterial({ color: 0x00aa00, wireframe: true });
  return new THREE.Mesh(geometry, material);
}

async function fetchGrdmTmd(file) {
  const res = await fetch(`/assets/${file}`);
  if (!res.ok) throw new Error(`missing /assets/${file}`);
  const buf = await res.arrayBuffer();
  const reader = new BinaryReader(buf);
  const tmds = new TMDParser().parse(reader);
  return tmds[0];
}

async function showStadium(id) {
  const meta = stadiumById(id);
  setStatus(`loading ${meta.file}…`);
  try {
    const tmd = await fetchGrdmTmd(meta.file);
    if (stadiumMesh) {
      scene.remove(stadiumMesh);
      stadiumMesh.geometry.dispose();
      stadiumMesh.material.dispose();
    }
    stadiumMesh = buildStadiumMesh(tmd);
    scene.add(stadiumMesh);
    cameraControls.fitToSphere(stadiumMesh, true);
    setStatus(`${meta.name}`);
  } catch (err) {
    setStatus(`error: ${err.message}`);
  }
}

function fillDropdown() {
  const select = document.getElementById('stadiumSelect');
  select.innerHTML = '';
  for (const s of STADIUMS) {
    const opt = document.createElement('option');
    opt.value = String(s.id);
    const slot = typeof s.slot === 'number' ? `${s.slot}.` : `${s.slot}:`;
    opt.textContent = `${slot} ${s.name}  (0x${s.id.toString(16).toUpperCase()}, ${s.letter})`;
    opt.title = `ISS Pro: ${s.issName}`;
    select.appendChild(opt);
  }
  select.addEventListener('change', () => showStadium(Number(select.value)));
}

async function loadBundledSelect() {
  const res = await fetch('/assets/SELECT.BIN');
  parser.parse(await res.arrayBuffer());
}

const clock = new THREE.Clock();
function animate() {
  const delta = clock.getDelta();
  cameraControls.update(delta);
  renderer.render(scene, camera);
  requestAnimationFrame(animate);
}

async function main() {
  fillDropdown();
  await loadBundledSelect();
  await showStadium(0x0e);
  animate();
}

main();
