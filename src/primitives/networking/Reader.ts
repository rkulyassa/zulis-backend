export class Reader {
	private buffer: Buffer;
	private offset: number;

    constructor(buffer: Buffer) {
		this.buffer = buffer;
		this.offset = 0;
    }

    readUInt8(): number {
		const value = this.buffer.readUInt8(this.offset);
		this.offset += 1;
		return value;
    }

    readUInt16BE(): number {
		const value = this.buffer.readUInt16BE(this.offset);
		this.offset += 2;
		return value;
    }
}