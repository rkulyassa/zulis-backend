import { Cell } from './Cell';
import { Vector2 } from '../../primitives/geometry/Vector2';
import { WorldSettings } from '../../types/WorldSettings';
import * as Enums from '../../types/Enums';

export class Pellet extends Cell {
    constructor(settings: WorldSettings, radius: number, position: Vector2) {
        super(settings, radius, position, new Vector2(0), new Vector2(0));
    }

    getTypeEnum(): Enums.CellType {
        return Enums.CellType.PELLET;
    }
    
    override handleWallBounce() {}
    override stepMotion() {}
    override tick() {}
}