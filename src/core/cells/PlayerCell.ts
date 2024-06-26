import { Cell } from './Cell';
import { Vector2 } from '../../primitives/geometry/Vector2';
import { CellType } from '../../models/CellType.enum';

export class PlayerCell extends Cell {
    private ownerPid: number;

    constructor(ownerPid: number, radius: number, position: Vector2, boost: Vector2) {
        super(radius, position, new Vector2(0), boost);
        this.ownerPid = ownerPid;
    }

    getOwnerPid(): number {
        return this.ownerPid;
    }

    getTypeEnum(): CellType {
        return CellType.PLAYER_CELL;
    }
}