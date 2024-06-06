class BufferWriter {
    private buffer: Buffer;
    private offset: number = 0;
  
    constructor(size: number) {
      this.buffer = Buffer.alloc(size);
    }
  
    writeUInt8(value: number): void {
      this.buffer.writeUInt8(value, this.offset);
      this.offset += 1;
    }
  
    writeUInt16BE(value: number): void {
      this.buffer.writeUInt16BE(value, this.offset);
      this.offset += 2;
    }
  
    writeUInt32BE(value: number): void {
      this.buffer.writeUInt32BE(value, this.offset);
      this.offset += 4;
    }
  
    writeString(value: string): void {
      const length = this.buffer.write(value, this.offset, 'utf-8');
      this.offset += length;
    }
  
    getBuffer(): Buffer {
      return this.buffer;
    }
  
    // Add more write methods as needed
  }
  
  export { BufferWriter };