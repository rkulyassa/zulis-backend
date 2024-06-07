/**
 * @file types.ts
 * @description Définition des types et des encodages utilisés dans le projet.
 * @version 1.0.0
 * @date 2024-06-06
 * @autor Fohz67
 */

type ReadFunction = (view: DataView, offset: number, littleEndian?: boolean) => number;
export type ReadUtilsType = {
    readInt8: ReadFunction,
    readUInt8: ReadFunction,
    readInt16: ReadFunction,
    readUInt16: ReadFunction,
    readInt32: ReadFunction,
    readUInt32: ReadFunction,
};

type WriteFunction = (view: DataView, offset: number, value: number, littleEndian?: boolean) => void;
export type WriteUtilsType = {
    writeInt8: WriteFunction,
    writeUInt8: WriteFunction,
    writeInt16: WriteFunction,
    writeUInt16: WriteFunction,
    writeInt32: WriteFunction,
    writeUInt32: WriteFunction,
};
