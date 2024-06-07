/**
 * @file utils.ts
 * @description Fonctions utilitaires pour la gestion des buffers et encodages.
 * @version 1.0.0
 * @date 2024-06-06
 * @autor Fohz67
 */

import {ReadUtilsType, WriteUtilsType} from './types';

export const DEFAULT_SIZE: number = 8;

export const ReadUtils: ReadUtilsType = {
    readInt8: (view: DataView, offset: number): number => view.getInt8(offset),
    readUInt8: (view: DataView, offset: number): number => view.getUint8(offset),
    readInt16: (view: DataView, offset: number, littleEndian: boolean = true): number => view.getInt16(offset, littleEndian),
    readUInt16: (view: DataView, offset: number, littleEndian: boolean = true): number => view.getUint16(offset, littleEndian),
    readInt32: (view: DataView, offset: number, littleEndian: boolean = true): number => view.getInt32(offset, littleEndian),
    readUInt32: (view: DataView, offset: number, littleEndian: boolean = true): number => view.getUint32(offset, littleEndian),
};

export const WriteUtils: WriteUtilsType = {
    writeInt8: (view: DataView, offset: number, value: number): void => view.setInt8(offset, value),
    writeUInt8: (view: DataView, offset: number, value: number): void => view.setUint8(offset, value),
    writeInt16: (view: DataView, offset: number, value: number, littleEndian: boolean = true): void => view.setInt16(offset, value, littleEndian),
    writeUInt16: (view: DataView, offset: number, value: number, littleEndian: boolean = true): void => view.setUint16(offset, value, littleEndian),
    writeInt32: (view: DataView, offset: number, value: number, littleEndian: boolean = true): void => view.setInt32(offset, value, littleEndian),
    writeUInt32: (view: DataView, offset: number, value: number, littleEndian: boolean = true): void => view.setUint32(offset, value, littleEndian),
};
