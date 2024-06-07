/**
 * @file SmartBuffer.ts
 * @version 1.0.0
 * @date 2024-06-06
 * @autor Fohz67
 */

import {StringUtil} from "./StringUtil";
import {DEFAULT_SIZE, ReadUtils, WriteUtils} from "./utils";

export class SmartBuffer {
    private view: DataView;
    private offset: number;

    constructor(data: ArrayBuffer | number = DEFAULT_SIZE) {
        if (data instanceof ArrayBuffer) {
            this.view = new DataView(data);
        } else {
            const arrayBuffer: ArrayBuffer = new ArrayBuffer(data);
            this.view = new DataView(arrayBuffer);
        }
        this.offset = 0;
    }

    static fromSize(size: number): SmartBuffer {
        return new SmartBuffer(size);
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
            const oldArray: Uint8Array = new Uint8Array(this.view.buffer);
            const newArray: Uint8Array = new Uint8Array(newBuffer);

            newArray.set(oldArray);
            this.view = new DataView(newBuffer);
        }
    }

    readInt8(offset?: number | null): number {
        const result: number = ReadUtils.readInt8(this.view, offset ?? this.offset);

        if (offset === null || offset === undefined) {
            this.offset += 1;
        }
        return result;
    }

    readUInt8(offset?: number | null): number {
        const result: number = ReadUtils.readUInt8(this.view, offset ?? this.offset);

        if (offset === null || offset === undefined) {
            this.offset += 1;
        }
        return result;
    }

    readInt16(littleEndian: boolean = true, offset?: number | null): number {
        const result: number = ReadUtils.readInt16(this.view, offset ?? this.offset, littleEndian);

        if (offset === null || offset === undefined) {
            this.offset += 2;
        }
        return result;
    }

    readUInt16(littleEndian: boolean = true, offset?: number | null): number {
        const result: number = ReadUtils.readUInt16(this.view, offset ?? this.offset, littleEndian);

        if (offset === null || offset === undefined) {
            this.offset += 2;
        }
        return result;
    }

    readInt32(littleEndian: boolean = true, offset?: number | null): number {
        const result: number = ReadUtils.readInt32(this.view, offset ?? this.offset, littleEndian);

        if (offset === null || offset === undefined) {
            this.offset += 4;
        }
        return result;
    }

    readUInt32(littleEndian: boolean = true, offset?: number | null): number {
        const result: number = ReadUtils.readUInt32(this.view, offset ?? this.offset, littleEndian);

        if (offset === null || offset === undefined) {
            this.offset += 4;
        }
        return result;
    }

    readString(offset?: number | null): string {
        return StringUtil.readString(this, offset, false);
    }

    readStringNT(offset?: number | null): string {
        return StringUtil.readString(this, offset, true);
    }

    writeInt8(value: number, offset?: number | null): void {
        this.ensureCapacity(1);
        WriteUtils.writeInt8(this.view, offset ?? this.offset++, value);
    }

    writeUInt8(value: number, offset?: number | null): void {
        this.ensureCapacity(1);
        WriteUtils.writeUInt8(this.view, offset ?? this.offset++, value);
    }

    writeInt16(value: number, littleEndian: boolean = true, offset?: number | null): void {
        this.ensureCapacity(2);
        WriteUtils.writeInt16(this.view, offset ?? this.offset, value, littleEndian);
        if (offset === null || offset === undefined) {
            this.offset += 2;
        }
    }

    writeUInt16(value: number, littleEndian: boolean = true, offset?: number | null): void {
        this.ensureCapacity(2);
        WriteUtils.writeUInt16(this.view, offset ?? this.offset, value, littleEndian);
        if (offset === null || offset === undefined) {
            this.offset += 2;
        }
    }

    writeInt32(value: number, littleEndian: boolean = true, offset?: number | null): void {
        this.ensureCapacity(4);
        WriteUtils.writeInt32(this.view, offset ?? this.offset, value, littleEndian);
        if (offset === null || offset === undefined) {
            this.offset += 4;
        }
    }

    writeUInt32(value: number, littleEndian: boolean = true, offset?: number | null): void {
        this.ensureCapacity(4);
        WriteUtils.writeUInt32(this.view, offset ?? this.offset, value, littleEndian);
        if (offset === null || offset === undefined) {
            this.offset += 4;
        }
    }

    writeString(value: string, offset?: number | null): void {
        this.ensureCapacity(value.length);
        StringUtil.writeString(this, value, offset, false);
    }

    writeStringNT(value: string, offset?: number | null): void {
        this.ensureCapacity(value.length + 1);
        StringUtil.writeString(this, value, offset, true);
    }
}

export default SmartBuffer;
