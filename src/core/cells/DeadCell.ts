import { Cell } from './Cell';
import { Vector2 } from '../../primitives/geometry/Vector2';
import { CellType } from '../../types/CellType.enum';

export class DeadCell extends Cell {
    constructor(radius: number, position: Vector2, boost: Vector2) {
        super(radius, position, new Vector2(0), boost);
    }

    getTypeEnum(): CellType {
        return CellType.DEAD_CELL;
    }
}