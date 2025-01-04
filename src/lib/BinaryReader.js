export default class BinaryReader {
	constructor(arrayBuffer, littleEndian = true) {
		this.dataView = new DataView(arrayBuffer);
		this.littleEndian = littleEndian;
		this.offset = 0;
	}

	#assert(condition, message) {
		if(!condition) {
			throw new Error(message);
		}
	}

	seek(position) {
		this.#assert(position >= 0 && position <= this.dataView.byteLength, 'Invalid position');
		this.offset = position;
	}

	nextUint32() {
		this.#assert(this.offset + 4 <= this.dataView.byteLength, 'No enough bytes to read uint32');
		const value = this.dataView.getUint32(this.offset, this.littleEndian);
		this.offset += 4;
		return value;
	}

	nextInt32() {
		this.#assert(this.offset + 4 <= this.dataView.byteLength, 'No enough bytes to read int32');
		const value = this.dataView.getInt32(this.offset, this.littleEndian);
		this.offset += 4;
		return value;
	}

	nextUint16() {
		this.#assert(this.offset + 2 <= this.dataView.byteLength, 'No enough bytes to read uint16');
		const value = this.dataView.getUint16(this.offset, this.littleEndian);
		this.offset += 2;
		return value;
	}

	nextInt16() {
		this.#assert(this.offset + 2 <= this.dataView.byteLength, 'No enough bytes to read int16');
		const value = this.dataView.getInt16(this.offset, this.littleEndian);
		this.offset += 2;
		return value;
	}

	nextUint8() {
		this.#assert(this.offset + 1 <= this.dataView.byteLength, 'No enough bytes to read uint8');
		const value = this.dataView.getUint8(this.offset, this.littleEndian);
		this.offset += 1;
		return value;
	}

	nextUint8() {
		this.#assert(this.offset + 1 <= this.dataView.byteLength, 'No enough bytes to read int8');
		const value = this.dataView.getInt8(this.offset, this.littleEndian);
		this.offset += 1;
		return value;
	}
}