export default class TMDParser {

	parse(reader) {
		const tmds = [];
		while (reader.offset < reader.dataView.byteLength - 4) {
			const bytes = reader.nextUint32();
			// TODO: Is it better to find the tmd using more bytes from the header?
			if (bytes === 0x00000041) { // TMD ID
				tmds.push(this.#getTMD(reader));
			}
		}
		return tmds;
	}

	#getTMD(reader) {
		let tmd = {};
		tmd._offset = (reader.offset - 4).toString(16).toUpperCase().padStart(8, '0');
		// Header
		tmd.flags = reader.nextUint32();
		tmd.numObj = reader.nextUint32();

		const objects = [];
		for (let i = 0; i < tmd.numObj; i++) {
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
			for (let i = 0; i < object.numPrimitive; i++) {

				// Packet Configuration for 4 Vertex Polygon with No Light Source.
				// Source: https://psx.arthus.net/sdk/Psy-Q/DOCS/Devrefs/Filefrmt.pdf
				// Page 77
				const packetHeader = reader.nextUint32();
				if (packetHeader === 0x2D010709) { // Flat, Texture
					// Let's move 20 bytes to get the vertex index.
					reader.seek(reader.offset + 20);
					vertexIdx.push(reader.nextUint16());
					vertexIdx.push(reader.nextUint16());
					vertexIdx.push(reader.nextUint16());
					vertexIdx.push(reader.nextUint16());
				}
				if (packetHeader === 0x3D010A0C) { // Gradation, Texture
					// Let's move 32 bytes to get the vertex index.
					reader.seek(reader.offset + 32);
					vertexIdx.push(reader.nextUint16());
					vertexIdx.push(reader.nextUint16());
					vertexIdx.push(reader.nextUint16());
					vertexIdx.push(reader.nextUint16());
				}
				if (packetHeader === 0x3F010A0C) { // Unknow, found on debug
					// Probably it's the same as the "Gradation, Texture"
					// Let's move 32 bytes to get the vertex index.
					reader.seek(reader.offset + 32);
					vertexIdx.push(reader.nextUint16());
					vertexIdx.push(reader.nextUint16());
					vertexIdx.push(reader.nextUint16());
					vertexIdx.push(reader.nextUint16());
				}
				if (packetHeader === 0x2F010709) { // Unknow, found on debug
					// Probably it's the same as the "Flat, Texture"
					// Let's move 20 bytes to get the vertex index.
					reader.seek(reader.offset + 20);
					vertexIdx.push(reader.nextUint16());
					vertexIdx.push(reader.nextUint16());
					vertexIdx.push(reader.nextUint16());
					vertexIdx.push(reader.nextUint16());
				}
				if (packetHeader === 0x3B010608) { // Unknow, found on debug
					// Probably it's the same as the "Gradation, No-Texture"
					// Let's move 16 bytes to get the vertex index.
					reader.seek(reader.offset + 16);
					vertexIdx.push(reader.nextUint16());
					vertexIdx.push(reader.nextUint16());
					vertexIdx.push(reader.nextUint16());
					vertexIdx.push(reader.nextUint16());
				}


				//TODO: Cup models are built different, so it's necessary to
				//read the vertex according to it.
				if (packetHeader === 0x3C00080C) { // Gouraud, Texture
					// Let's move 16 bytes to get the vertex index.
					reader.seek(reader.offset + 16);
					vertexIdx.push(reader.nextUint16());
					reader.nextInt16();//normal
					vertexIdx.push(reader.nextUint16());
					reader.nextInt16();//normal
					vertexIdx.push(reader.nextUint16());
					reader.nextInt16();//normal
					vertexIdx.push(reader.nextUint16());
					reader.nextInt16();//normal
				}
				if (packetHeader === 0x2E000709) { // Unknow, found on debug
					// Probably it's the same as the "Flat, Texture"
					// Let's move 16 bytes to get the vertex index.
					reader.seek(reader.offset + 16);
					vertexIdx.push(reader.nextUint16());
					reader.nextUint16()//normal
					vertexIdx.push(reader.nextUint16());
					vertexIdx.push(reader.nextUint16());
					reader.nextUint16()//pad
					vertexIdx.push(reader.nextUint16());
				}
				/**/


			}
			object.vertexIdx = vertexIdx; // if you divide by 4, it must get the numPrimitive

			// Iterate through the vertex positions ej:18
			const vertex = [];
			for (let i = 0; i < object.numVertex; i++) {
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

	patchVertex(binfile, tmds, data) {
		const patchedFile = binfile;
		const vertex = [];
		tmds.forEach((tmd, index) => {
			binfile.seek(parseInt(tmd._offset, 16)); // move to the TMD
			binfile.seek(binfile.offset + 12); // move 12 bytes (header size)

			let objOffset = binfile.offset;
			for(let i = 0; i < tmd.objects.length; i++) {
				binfile.seek(objOffset + tmd.objects[i].vertexTop);

				for (let vi = 0; vi < tmd.objects[i].numVertex; vi++) {
					patchedFile.dataView.setInt16(binfile.offset,     data[index].objects[i].vertex[vi].x, true); // x
					patchedFile.dataView.setInt16(binfile.offset + 2, data[index].objects[i].vertex[vi].y, true); // y
					patchedFile.dataView.setInt16(binfile.offset + 4, data[index].objects[i].vertex[vi].z, true); // z

					binfile.seek(binfile.offset + 8) // x, y, z, PAD

					// vertex.push({
					// 	x: binfile.nextInt16(),
					// 	y: binfile.nextInt16(),
					// 	z: binfile.nextInt16()
					// });
					// binfile.nextInt16(); // discard the PAD (0x0000)
				}

				objOffset += 28; // block size
			}
		})

		console.log(vertex)
		return patchedFile;
	}
}