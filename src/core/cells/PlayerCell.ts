import { Cell } from './Cell';
import { Vector2 } from '../../primitives/geometry/Vector2';
import { WorldSettings } from '../../types/WorldSettings';
import * as Enums from '../../types/Enums';

export class PlayerCell extends Cell {
    private ownerPid: number;

    constructor(ownerPid: number, radius: number, position: Vector2, boost: Vector2) {
        super(radius, position, new Vector2(0), boost);
        this.ownerPid = ownerPid;
    }

    getOwnerPid(): number {
        return this.ownerPid;
    }

    getTypeEnum(): Enums.CellType {
        return Enums.CellType.PLAYER_CELL;
    }

    // isSplitting(splitResolveDelay: number): boolean {
    //     return this.age < splitResolveDelay;
    // }

    canMerge(mergeTime: number, mergeTimeScale: number): boolean {
        const initial = mergeTime
        const increase = this.getBoundary().getArea() * mergeTimeScale;
        return this.age >= initial + increase;
    }
}