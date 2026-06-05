import './style.css';
import { STADIUMS } from './lib/stadiums.js';
import SelectBINParser from './lib/SelectBINParser.js';

const statusEl = document.getElementById('status');
function setStatus(msg) { statusEl.textContent = msg; }

const parser = new SelectBINParser();

async function loadBundledSelect() {
  const res = await fetch('/assets/SELECT.BIN');
  const buf = await res.arrayBuffer();
  parser.parse(buf);
  setStatus(parser.valid ? 'SELECT.BIN loaded' : 'SELECT.BIN wrong size!');
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
}

async function main() {
  fillDropdown();
  await loadBundledSelect();
  console.log('flags for 0x0E:', parser.readFlags(0x0e));
}

main();
