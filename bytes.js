function getPacketHeader(hex) {
  const buffer = Buffer.alloc(4);
  buffer.writeUInt32BE(hex);

  return {
    mode: buffer[0],
    flag: buffer[1],
    ilen: buffer[2],
    olen: buffer[3]
  };
}

function getShadingType(mode, flag) {
  const iipBit = ((mode >> 4) & 0x01) === 1; // Interpolated shading (Gouraud)
  const grdBit = ((flag >> 0) & 0x01) === 1; // Gradation flag

  if (iipBit && grdBit) {
    return "Gradation";
  } else if (iipBit) {
    return "Gouraud";
  } else {
    return "Flat";
  }
}

// ✅ Packet configuration of 3 Vertex Polygon with Light Source Calculation
const a = getPacketHeader(0x20000304);
//const a = getPacketHeader(0x30000406);
//const a = getPacketHeader(0x20040506);
//const a = getPacketHeader(0x30040606);
//const a = getPacketHeader(0x24000507);
//const a = getPacketHeader(0x34000609);

// ✅ Packet configuration of 4 Vertex Polygon with Light Source Calculation
//const a = getPacketHeader(0x28000405);
//const a = getPacketHeader(0x38000508);
//const a = getPacketHeader(0x28040708);
//const a = getPacketHeader(0x38040808);
//const a = getPacketHeader(0x2c000709);
//const a = getPacketHeader(0x2e000709); // EDGE CASE: Winning eleven
//const a = getPacketHeader(0x3c00080c);

// ✅ Packet configuration of 3 Vertex Polygon with No Light Source Calculation
//const a = getPacketHeader(0x21010304);
//const a = getPacketHeader(0x31010506);
//const a = getPacketHeader(0x25010607);
//const a = getPacketHeader(0x35010809);

// ✅ Packet configuration of 4 Vertex Polygon with No Light Source Calculation
//const a = getPacketHeader(0x29010305);
//const a = getPacketHeader(0x39010608);
//const a = getPacketHeader(0x3b010608); // EDGE CASE: Winning eleven
//const a = getPacketHeader(0x2d010709);
//const a = getPacketHeader(0x2f010709); // EDGE CASE: Winning eleven
//const a = getPacketHeader(0x3d010a0c);
//const a = getPacketHeader(0x3f010a0c); // EDGE CASE: Winning eleven

// 🚧 TODO: Straight Line
//const a = getPacketHeader(0x40010203);


// code:             1-Polygon, 2-Straight Line, 3-Sprite
// Polygon (isqBit): 0-Triangle, 1-Quad
// Light (lgtBit):   0-Lit, 1-Unlit
// Shading (iipBit): 0-Flat, 1-Gouraud (separate colors when !lgtBit)
// Texture (tmeBit): 0-Off, 1-On
// Colors (grdBit):  0-Single, 1-Separate (gradation)
const code   = (a.mode >> 5) & 0x07;
const isqBit = ((a.mode >> 3) & 0x01) == 1;
const lgtBit = ((a.flag >> 0) & 0x01) == 0;
const iipBit = ((a.mode >> 4) & 0x01) == 1;
const tmeBit = ((a.mode >> 2) & 0x01) == 1;
const grdBit = ((a.flag >> 2) & 0x01) == 1;

const shadingType = getShadingType(a.mode, a.flag);

const msg = `
Packet configuration of ${isqBit ? 4 : 3} Vertex Polygon with ${lgtBit ? '' : 'No'} Light Source Calculation: 
${shadingType}, ${tmeBit ? 'Texture' : 'No-Texture'} ${grdBit ? '(gradation)' : '(solid)'}
`

console.log(a, code, isqBit, lgtBit, iipBit, tmeBit, grdBit);
console.log(msg);