import {SmartBuffer} from './SmartBuffer';
import {isNull, ReadUtils, WriteUtils} from './utils';

export const StringUtil: any = {
    readString: (buffer: SmartBuffer, offset?: number | null, isNt: boolean = false): string => {
        const length: number = buffer.getLength();
        let position: number = offset ?? buffer.getOffset();
        let result: string = '';
        while (position < length) {
            const charCode: number = ReadUtils.readUInt8(buffer.getView(), position);
            position++;
            if (isNt && charCode === 0) {
                break;
            }
            result += String.fromCharCode(charCode);
        }
        if (isNull(offset)) {
            buffer.setOffset(position);
        }
        return result;
    },

    writeString: (buffer: SmartBuffer, value: string, offset?: number | null, isNt: boolean = false): void => {
        const length: number = value.length;
        const position: number = offset ?? buffer.getOffset();
        let offsetNt: number = 0;
        for (let i: number = 0; i < length; i++) {
            let charCode: number = value.charCodeAt(i);
            WriteUtils.writeUInt8(buffer.getView(), position + i, charCode);
        }
        if (isNt) {
            WriteUtils.writeUInt8(buffer.getView(), position + length, 0);
            offsetNt = 1;
        }
        if (isNull(offset)) {
            buffer.setOffset(position + length + offsetNt);
        }
    }
}
