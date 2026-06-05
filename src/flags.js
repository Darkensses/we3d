import './style.css';
import * as THREE from 'three';
import CameraControls from 'camera-controls';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { Pane } from 'tweakpane';
import { STADIUMS, stadiumById } from './lib/stadiums.js';
import SelectBINParser from './lib/SelectBINParser.js';
import TMDParser from './lib/TMDParser.v2.js';
import BinaryReader from './lib/BinaryReader.js';
import { SCALE, psxToWorld, worldToPsx } from './lib/coords.js';

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

const transformControls = new TransformControls(camera, renderer.domElement);
transformControls.setSize(0.8);
scene.add(transformControls.getHelper());
transformControls.addEventListener('dragging-changed', (e) => {
  cameraControls.enabled = !e.value;
});

let selectedIndex = -1;
let onFlagChanged = null; // assigned in main(); refreshes the panel after a gizmo edit

transformControls.addEventListener('objectChange', () => {
  if (selectedIndex < 0) return;
  const p = worldToPsx(markers[selectedIndex].position);
  const f = flagsState[selectedIndex];
  f.x = p.x; f.y = p.y; f.z = p.z;
  parser.writeFlags(currentId, flagsState);
  onFlagChanged?.(selectedIndex);
});

window.addEventListener('resize', () => {
  sizes.width = divEditor.clientWidth;
  sizes.height = divEditor.clientHeight;
  camera.aspect = sizes.width / sizes.height;
  camera.updateProjectionMatrix();
  renderer.setSize(sizes.width, sizes.height);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
});

let stadiumMesh = null;
let currentId = 0x0e;
let flagsState = [];        // 10 × {x,y,z} PSX coords (source of truth for UI)
const markers = [];         // 10 × THREE.Mesh spheres
const markerGroup = new THREE.Group();
scene.add(markerGroup);

let pane = null;
const originalFlags = [];   // snapshot per stadium load, for reset

const MARKER_RADIUS = 0.4;
const markerGeo = new THREE.SphereGeometry(MARKER_RADIUS, 12, 12);
const markerMat = new THREE.MeshBasicMaterial({ color: 0xff3366 });

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2();

function selectMarker(index) {
  selectedIndex = index;
  if (index < 0) {
    transformControls.detach();
  } else {
    transformControls.attach(markers[index]);
  }
}

canvas.addEventListener('pointerdown', (e) => {
  if (transformControls.dragging) return;
  const rect = canvas.getBoundingClientRect();
  pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
  pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
  raycaster.setFromCamera(pointer, camera);
  const hits = raycaster.intersectObjects(markers, false);
  if (hits.length > 0) {
    selectMarker(hits[0].object.userData.flagIndex);
  }
});

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

function buildMarkers(id) {
  selectedIndex = -1;
  transformControls.detach();
  markers.forEach((m) => markerGroup.remove(m));
  markers.length = 0;
  flagsState = parser.readFlags(id);
  originalFlags.length = 0;
  flagsState.forEach((f) => originalFlags.push({ ...f }));
  flagsState.forEach((flag, i) => {
    const mesh = new THREE.Mesh(markerGeo, markerMat);
    const w = psxToWorld(flag);
    mesh.position.set(w.x, w.y, w.z);
    mesh.userData.flagIndex = i;
    markerGroup.add(mesh);
    markers.push(mesh);
  });
}

// flagsState[i] (PSX) was edited via panel -> move marker + write buffer.
function applyPanel(i) {
  const w = psxToWorld(flagsState[i]);
  markers[i].position.set(w.x, w.y, w.z);
  parser.writeFlags(currentId, flagsState);
}

function buildPanel() {
  if (pane) pane.dispose();
  pane = new Pane({ container: document.getElementById('toolpane'), title: 'Side Flags', expanded: true });

  flagsState.forEach((flag, i) => {
    const f = pane.addFolder({ title: `Flag ${i}`, expanded: false });
    f.addBinding(flag, 'x', { step: 1 }).on('change', () => applyPanel(i));
    f.addBinding(flag, 'y', { step: 1 }).on('change', () => applyPanel(i));
    f.addBinding(flag, 'z', { step: 1 }).on('change', () => applyPanel(i));
    f.addButton({ title: 'Reset' }).on('click', () => {
      const o = originalFlags[i];
      flag.x = o.x; flag.y = o.y; flag.z = o.z;
      applyPanel(i);
      pane.refresh();
    });
  });
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
    currentId = id;
    buildMarkers(id);
    buildPanel();
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
  onFlagChanged = (i) => { if (pane) pane.refresh(); };
  fillDropdown();
  await loadBundledSelect();
  await showStadium(0x0e);
  animate();
}

main();
