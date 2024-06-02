import { Cell } from './Cell';
import { Vector2 } from '../../primitives/geometry/Vector2';
import { WorldSettings } from '../../types/WorldSettings';
import { CellTypes } from '../../types/Enums';

export class PlayerCell extends Cell {
    private ownerPid: number;

    constructor(settings: WorldSettings, ownerPid: number, radius: number, position: Vector2, boost: Vector2) {
        super(settings, radius, position, new Vector2(0), boost);
        this.settings = settings;
        this.ownerPid = ownerPid;
    }

    getOwnerPid(): number {
        return this.ownerPid;
    }

    getTypeEnum(): CellTypes {
        return CellTypes.PLAYER_CELL;
    }

    isSplitting(): boolean {
        return this.age < this.settings.SPLIT_RESOLVE_DELAY;
    }

    canMerge(): boolean {
        const initial = this.settings.MERGE_TIME;
        const increase = this.getBoundary().getArea() * this.settings.MERGE_TIME_SCALE;
        return this.age >= initial + increase;
    }
}