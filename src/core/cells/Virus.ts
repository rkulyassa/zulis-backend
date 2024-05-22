import { Cell } from './Cell';
import { Vector2 } from '../../primitives/geometry/Vector2';
import { WorldSettings } from '../../types/WorldSettings';

export class Virus extends Cell {
    constructor(settings: WorldSettings, radius: number, position: Vector2) {
        super(settings, radius, position, new Vector2(0,0), new Vector2(0,0));
    }
}