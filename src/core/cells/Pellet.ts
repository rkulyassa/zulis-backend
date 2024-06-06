import { Cell } from './Cell';
import { Vector2 } from '../../primitives/geometry/Vector2';
import { CellType } from '../../types/CellType.enum';

export class Pellet extends Cell {
    constructor(radius: number, position: Vector2) {
        super(radius, position, new Vector2(0), new Vector2(0));
    }

    getTypeEnum(): CellType {
        return CellType.PELLET;
    }
    
    override handleWallBounce() {}
    override stepMotion() {}
    override tick() {}
}