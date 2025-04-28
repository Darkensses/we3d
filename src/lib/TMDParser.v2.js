function getShadingType(mode, flag) {
  const iipBit = ((mode >> 4) & 0x01) === 1; // Interpolated shading (Gouraud)
  const grdBit = ((flag >> 0) & 0x01) === 1; // Gradation flag

  if (iipBit && grdBit) {
    return "gradation";
  } else if (iipBit) {
    return "gouraud";
  } else {
    return "flat";
  }
}

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

				// Source: https://psx.arthus.net/sdk/Psy-Q/DOCS/Devrefs/Filefrmt.pdf
				
				const olen = reader.nextUint8();
				const ilen = reader.nextUint8();
				const flag = reader.nextUint8();
				const mode = reader.nextUint8();

				const shadingType = getShadingType(mode, flag);
				const isTexutre   = ((mode >> 2) & 0x01) == 1;
				const isGradient  = ((flag >> 2) & 0x01) == 1;

				// Packet configuration of 3 Vertex Polygon with Light Source Calculation
				if( ((mode >> 3) & 0x01) === 0 && ((flag >> 0) & 0x01) === 0 ) {

					// Flat, No-Texture (solid)
					if( shadingType === 'flat' && !isTexutre && !isGradient ) {
						reader.seek(reader.offset + 4);  // skip metadata
						reader.nextInt16();   					 // normal0
						vertexIdx.push(...[
							reader.nextInt16(), 					 // vertex0
							reader.nextInt16(), 					 // vertex1
							reader.nextInt16()  					 // vertex2
						]);
					}

					// Flat, No-Texture (gradation)
					if( shadingType === 'flat' && !isTexutre && isGradient ) {
						reader.seek(reader.offset + 12); // skip metadata
						reader.nextInt16();   					 // normal0
						vertexIdx.push(...[
							reader.nextInt16(), 					 // vertex0
							reader.nextInt16(), 					 // vertex1
							reader.nextInt16()  					 // vertex2
						]);
					}

					// Flat, Texture
					if( shadingType === 'flat' && isTexutre ) {
						reader.seek(reader.offset + 12); // skip metadata
						reader.nextInt16();   					 // normal0
						vertexIdx.push(...[
							reader.nextInt16(), 					 // vertex0
							reader.nextInt16(), 					 // vertex1
							reader.nextInt16()  					 // vertex2
						]);
					}

					// Gouraud, No-Texture (solid)
					if( shadingType === 'gouraud' && !isTexutre && !isGradient) {
						reader.seek(reader.offset + 4);     // skip metadata
						reader.nextInt16();                 // normal0
						vertexIdx.push(reader.nextInt16()); // vertex0
						reader.nextInt16();                 // normal1
						vertexIdx.push(reader.nextInt16()); // vertex1
						reader.nextInt16();                 // normal2
						vertexIdx.push(reader.nextInt16()); // vertex2
					}

					// Gouraud, No-Texture (gradation)
					if( shadingType === 'gouraud' && !isTexutre && isGradient) {
						reader.seek(reader.offset + 12);    // skip metadata
						reader.nextInt16();                 // normal0
						vertexIdx.push(reader.nextInt16()); // vertex0
						reader.nextInt16();                 // normal1
						vertexIdx.push(reader.nextInt16()); // vertex1
						reader.nextInt16();                 // normal2
						vertexIdx.push(reader.nextInt16()); // vertex2
					}

					// Gouraud, Texture
					if( shadingType === 'gouraud' && isTexutre ) {
						reader.seek(reader.offset + 12);    // skip metadata
						reader.nextInt16();                 // normal0
						vertexIdx.push(reader.nextInt16()); // vertex0
						reader.nextInt16();                 // normal1
						vertexIdx.push(reader.nextInt16()); // vertex1
						reader.nextInt16();                 // normal2
						vertexIdx.push(reader.nextInt16()); // vertex2
					}

				} else
				// Packet configuration of 4 Vertex Polygon with Light Source Calculation
				if( ((mode >> 3) & 0x01) === 1 && ((flag >> 0) & 0x01) === 0 ) {

					// Flat, No-Texture (solid)
					if( shadingType === 'flat' && !isTexutre && !isGradient) {
						reader.seek(reader.offset + 4); // skip metada
						reader.nextInt16();   				  // normal0
						vertexIdx.push(...[
							reader.nextInt16(), 				  // vertex0
							reader.nextInt16(), 				  // vertex1
							reader.nextInt16(), 				  // vertex2
							reader.nextInt16(), 				  // vertex3
						]);
						reader.nextInt16() 						  // NULL
					}

					// Flat, No-Texture (gradation)
					if( shadingType === 'flat' && !isTexutre && isGradient) {
						reader.seek(reader.offset + 16); // skip metada
						reader.nextInt16();   					 // normal0
						vertexIdx.push(...[
							reader.nextInt16(), 					 // vertex0
							reader.nextInt16(), 					 // vertex1
							reader.nextInt16(), 					 // vertex2
							reader.nextInt16(), 					 // vertex3
						]);
						reader.nextInt16() 							 // NULL
					}

					// Flat, Texture
					if( shadingType === 'flat' && isTexutre) {
						reader.seek(reader.offset + 16); // skip metada
						reader.nextInt16();   					 // normal0
						vertexIdx.push(...[
							reader.nextInt16(), 					 // vertex0
							reader.nextInt16(), 					 // vertex1
							reader.nextInt16(), 					 // vertex2
							reader.nextInt16(), 					 // vertex3
						]);
						reader.nextInt16() 							 // NULL
					}

					// Gouraud, No-Texture (solid)
					if( shadingType === 'gouraud' && !isTexutre && !isGradient) {
						reader.seek(reader.offset + 4);     // skip metadata
						reader.nextInt16();                 // normal0
						vertexIdx.push(reader.nextInt16()); // vertex0
						reader.nextInt16();                 // normal1
						vertexIdx.push(reader.nextInt16()); // vertex1
						reader.nextInt16();                 // normal2
						vertexIdx.push(reader.nextInt16()); // vertex2
						reader.nextInt16();                 // normal3
						vertexIdx.push(reader.nextInt16()); // vertex3
					}

					// Gouraud, No-Texture (gradation)
					if( shadingType === 'gouraud' && !isTexutre && isGradient) {
						reader.seek(reader.offset + 16);    // skip metadata
						reader.nextInt16();                 // normal0
						vertexIdx.push(reader.nextInt16()); // vertex0
						reader.nextInt16();                 // normal1
						vertexIdx.push(reader.nextInt16()); // vertex1
						reader.nextInt16();                 // normal2
						vertexIdx.push(reader.nextInt16()); // vertex2
						reader.nextInt16();                 // normal3
						vertexIdx.push(reader.nextInt16()); // vertex3
					}

					// Gouraud, Texture
					// Gouraud, No-Texture (gradation)
					if( shadingType === 'gouraud' && isTexutre) {
						reader.seek(reader.offset + 16);    // skip metadata
						reader.nextInt16();                 // normal0
						vertexIdx.push(reader.nextInt16()); // vertex0
						reader.nextInt16();                 // normal1
						vertexIdx.push(reader.nextInt16()); // vertex1
						reader.nextInt16();                 // normal2
						vertexIdx.push(reader.nextInt16()); // vertex2
						reader.nextInt16();                 // normal3
						vertexIdx.push(reader.nextInt16()); // vertex3
					}

				}else
				// Packet configuration of 3 Vertex Polygon with No Light Source Calculation
				if( ((mode >> 3) & 0x01) === 0 && ((flag >> 0) & 0x01) === 1 ) {

					// Flat, No-Texture
					if( shadingType === 'flat' && !isTexutre ) {
						reader.seek(reader.offset + 4); // skip metada
						vertexIdx.push(...[
							reader.nextInt16(), 					// vertex0
							reader.nextInt16(), 					// vertex1
							reader.nextInt16() 					  // vertex2
						]);
						reader.nextInt16() 						 	// NULL
					}

					// Flat, Texture
					if( shadingType === 'flat' && isTexutre ) {
						reader.seek(reader.offset + 16);// skip metada
						vertexIdx.push(...[
							reader.nextInt16(), 					// vertex0
							reader.nextInt16(), 					// vertex1
							reader.nextInt16() 					  // vertex2
						]);
						reader.nextInt16() 						 	// NULL
					}

					// Gradation, No-Texture
					if( shadingType === 'gradation' && !isTexutre ) {
						reader.seek(reader.offset + 12);// skip metada
						vertexIdx.push(...[
							reader.nextInt16(), 					// vertex0
							reader.nextInt16(), 					// vertex1
							reader.nextInt16() 					  // vertex2
						]);
						reader.nextInt16() 						 	// NULL
					}

					// Gradation, Texture
					if( shadingType === 'gradation' && isTexutre ) {
						reader.seek(reader.offset + 24);// skip metada
						vertexIdx.push(...[
							reader.nextInt16(), 					// vertex0
							reader.nextInt16(), 					// vertex1
							reader.nextInt16() 					  // vertex2
						]);
						reader.nextInt16() 						 	// NULL
					}

				} else
				// Packet configuration of 4 Vertex Polygon with No Light Source Calculation
				if( ((mode >> 3) & 0x01) === 1 && ((flag >> 0) & 0x01) === 1 ) {

					// Flat, No-Texture
					if( shadingType === 'flat' && !isTexutre ) {
						reader.seek(reader.offset + 4); // skip metada
						vertexIdx.push(...[
							reader.nextInt16(), 					// vertex0
							reader.nextInt16(), 					// vertex1
							reader.nextInt16(), 					// vertex2
							reader.nextInt16() 					  // vertex3
						]);
					}

					// Flat, Texture
					if( shadingType === 'flat' && isTexutre ) {
						reader.seek(reader.offset + 20);// skip metada
						vertexIdx.push(...[
							reader.nextInt16(), 					// vertex0
							reader.nextInt16(), 					// vertex1
							reader.nextInt16(), 					// vertex2
							reader.nextInt16() 					  // vertex3
						]);
					}

					// Gradation, No-Texture
					if( shadingType === 'gradation' && !isTexutre ) {
						reader.seek(reader.offset + 16);// skip metada
						vertexIdx.push(...[
							reader.nextInt16(), 					// vertex0
							reader.nextInt16(), 					// vertex1
							reader.nextInt16(), 					// vertex2
							reader.nextInt16() 					  // vertex3
						]);
					}

					// Gradation, exture
					if( shadingType === 'gradation' && isTexutre ) {
						reader.seek(reader.offset + 32);// skip metada
						vertexIdx.push(...[
							reader.nextInt16(), 					// vertex0
							reader.nextInt16(), 					// vertex1
							reader.nextInt16(), 					// vertex2
							reader.nextInt16() 					  // vertex3
						]);
					}

				}


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