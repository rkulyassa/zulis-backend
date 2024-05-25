import { Cell } from './Cell';
import { Vector2 } from '../../primitives/geometry/Vector2';
import { WorldSettings } from '../../types/WorldSettings';

export class DeadCell extends Cell {
    constructor(settings: WorldSettings, radius: number, position: Vector2, boost: Vector2) {
        super(settings, radius, position, new Vector2(0), boost);
    }
}