const GEOMETRY_START = 0x718;

export default class ModelBINParser {

	parse(reader) {
		const sections = [];
		reader.seek(GEOMETRY_START);

		while (reader.offset + 8 <= reader.dataView.byteLength) {
			const numVertex    = reader.nextUint32();
			const numPrimitive = reader.nextUint32();

			// null separator between section groups — skip
			if (numVertex === 0 && numPrimitive === 0) continue;

			const _offset = (reader.offset - 8).toString(16).toUpperCase().padStart(8, '0');

			// Primitives: each is 24 bytes
			//   [16 bytes] per-vertex BGR colors (4 × 4 bytes)
			//   [ 8 bytes] vertex indices stored as v1,v0,v3,v2 (TMD convention)
			const vertexIdx = [];
			for (let i = 0; i < numPrimitive; i++) {
				reader.seek(reader.offset + 16); // skip color metadata
				const v1 = reader.nextUint16();
				const v0 = reader.nextUint16();
				const v3 = reader.nextUint16();
				const v2 = reader.nextUint16();
				vertexIdx.push(v0, v1, v2, v3);
			}

			// Vertices: each is 8 bytes — x, y, z (int16) + pad
			const vertex = [];
			for (let i = 0; i < numVertex; i++) {
				vertex.push({
					x: reader.nextInt16(),
					y: reader.nextInt16(),
					z: reader.nextInt16()
				});
				reader.nextInt16(); // discard pad
			}

			sections.push({ _offset, objects: [{ vertex, vertexIdx }] });
		}

		return sections;
	}

	patchVertex(binfile, sections, data) {
		sections.forEach((section, index) => {
			const sectionStart = parseInt(section._offset, 16);
			const numPrimitive = section.objects[0].vertexIdx.length / 4;

			// header (8 bytes) + primitives (numPrimitive × 24 bytes) = vertex block start
			binfile.seek(sectionStart + 8 + numPrimitive * 24);

			data[index].objects[0].vertex.forEach(v => {
				binfile.dataView.setInt16(binfile.offset,     v.x, true);
				binfile.dataView.setInt16(binfile.offset + 2, v.y, true);
				binfile.dataView.setInt16(binfile.offset + 4, v.z, true);
				binfile.seek(binfile.offset + 8); // PAD
			});
		});

		return binfile;
	}

}
