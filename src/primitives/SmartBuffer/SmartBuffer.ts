import {StringUtil} from "./StringUtil";
import {Offset} from "./types";
import {DEFAULT_SIZE, isNull, ReadUtils, WriteUtils} from "./utils";

export class SmartBuffer {
    private view!: DataView;
    private offset!: number;

    constructor(data: ArrayBuffer | number = DEFAULT_SIZE) {
        this.build(data);
    }

    build(data: ArrayBuffer | number = DEFAULT_SIZE): void {
        if (data instanceof ArrayBuffer) {
            this.view = new DataView(data);
        } else {
            this.view = new DataView(new ArrayBuffer(data));
        }
        this.offset = 0;
    }

    static fromSize(size: number): SmartBuffer {
        return new SmartBuffer(size);
    }

    static fromBuffer(buffer: ArrayBuffer): SmartBuffer {
        return new SmartBuffer(buffer);
    }

    getView(): DataView {
        return this.view;
    }

    setView(newView: DataView): void {
        this.view = newView;
        this.offset = 0;
    }

    getOffset(): number {
        return this.offset;
    }

    setOffset(offset: number): void {
        this.offset = offset;
    }

    getLength(): number {
        return this.view.byteLength;
    }

    ensureCapacity(size: number): void {
        const requiredSize: number = this.offset + size;
        if (requiredSize > this.view.byteLength) {
            const newBuffer: ArrayBuffer = new ArrayBuffer(requiredSize);
            new Uint8Array(newBuffer).set(new Uint8Array(this.view.buffer));
            this.view = new DataView(newBuffer);
        }
    }

    readInt8(offset?: Offset): number {
        const result: number = ReadUtils.readInt8(this.view, offset ?? this.offset);
        if (isNull(offset)) {
            this.offset += 1;
        }
        return result;
    }

    readUInt8(offset?: Offset): number {
        const result: number = ReadUtils.readUInt8(this.view, offset ?? this.offset);
        if (isNull(offset)) {
            this.offset += 1;
        }
        return result;
    }

    readInt16(littleEndian: boolean = true, offset?: Offset): number {
        const result: number = ReadUtils.readInt16(this.view, offset ?? this.offset, littleEndian);
        if (isNull(offset)) {
            this.offset += 2;
        }
        return result;
    }

    readUInt16(littleEndian: boolean = true, offset?: Offset): number {
        const result: number = ReadUtils.readUInt16(this.view, offset ?? this.offset, littleEndian);
        if (isNull(offset)) {
            this.offset += 2;
        }
        return result;
    }

    readInt32(littleEndian: boolean = true, offset?: Offset): number {
        const result: number = ReadUtils.readInt32(this.view, offset ?? this.offset, littleEndian);
        if (isNull(offset)) {
            this.offset += 4;
        }
        return result;
    }

    readUInt32(littleEndian: boolean = true, offset?: Offset): number {
        const result: number = ReadUtils.readUInt32(this.view, offset ?? this.offset, littleEndian);
        if (isNull(offset)) {
            this.offset += 4;
        }
        return result;
    }

    readFloat32(littleEndian: boolean = true, offset?: number | null): number {
        const result: number = ReadUtils.readFloat32(this.view, offset ?? this.offset, littleEndian);
        if (isNull(offset)) {
            this.offset += 4;
        }
        return result;
    }

    readFloat64(littleEndian: boolean = true, offset?: number | null): number {
        const result: number = ReadUtils.readFloat64(this.view, offset ?? this.offset, littleEndian);
        if (isNull(offset)) {
            this.offset += 8;
        }
        return result;
    }

    readString(offset?: Offset): string {
        return StringUtil.readString(this, offset, false);
    }

    readStringNT(offset?: Offset): string {
        return StringUtil.readString(this, offset, true);
    }

    writeInt8(value: number, offset?: Offset): void {
        this.ensureCapacity(1);
        WriteUtils.writeInt8(this.view, offset ?? this.offset++, value);
    }

    writeUInt8(value: number, offset?: Offset): void {
        this.ensureCapacity(1);
        WriteUtils.writeUInt8(this.view, offset ?? this.offset++, value);
    }

    writeInt16(value: number, littleEndian: boolean = true, offset?: Offset): void {
        this.ensureCapacity(2);
        WriteUtils.writeInt16(this.view, offset ?? this.offset, value, littleEndian);
        if (isNull(offset)) {
            this.offset += 2;
        }
    }

    writeUInt16(value: number, littleEndian: boolean = true, offset?: Offset): void {
        this.ensureCapacity(2);
        WriteUtils.writeUInt16(this.view, offset ?? this.offset, value, littleEndian);
        if (isNull(offset)) {
            this.offset += 2;
        }
    }

    writeInt32(value: number, littleEndian: boolean = true, offset?: Offset): void {
        this.ensureCapacity(4);
        WriteUtils.writeInt32(this.view, offset ?? this.offset, value, littleEndian);
        if (isNull(offset)) {
            this.offset += 4;
        }
    }

    writeUInt32(value: number, littleEndian: boolean = true, offset?: Offset): void {
        this.ensureCapacity(4);
        WriteUtils.writeUInt32(this.view, offset ?? this.offset, value, littleEndian);
        if (isNull(offset)) {
            this.offset += 4;
        }
    }

    writeFloat32(value: number, littleEndian: boolean = true, offset?: number | null): void {
        this.ensureCapacity(4);
        WriteUtils.writeFloat32(this.view, offset ?? this.offset, value, littleEndian);
        if (isNull(offset)) {
            this.offset += 4;
        }
    }

    writeFloat64(value: number, littleEndian: boolean = true, offset?: number | null): void {
        this.ensureCapacity(8);
        WriteUtils.writeFloat64(this.view, offset ?? this.offset, value, littleEndian);
        if (isNull(offset)) {
            this.offset += 8;
        }
    }

    writeString(value: string, offset?: Offset): void {
        this.ensureCapacity(value.length);
        StringUtil.writeString(this, value, offset, false);
    }

    writeStringNT(value: string, offset?: Offset): void {
        this.ensureCapacity(value.length + 1);
        StringUtil.writeString(this, value, offset, true);
    }
}

export default SmartBuffer;
