import { Cell } from './Cell';
import { Vector2 } from '../../primitives/geometry/Vector2';
import { WorldSettings } from '../../types/WorldSettings';

export class PlayerCell extends Cell {
    private ownerPid: number;
    private age: number;
    private ejectTick: number; // TODO: convert to ms so no time lost from rounding tick

    constructor(settings: WorldSettings, ownerPid: number, radius: number, position: Vector2, boost: Vector2) {
        super(settings, radius, position, new Vector2(0,0), boost);
        this.settings = settings;
        this.ownerPid = ownerPid;
        this.age = 0;
        this.ejectTick = 0;
    }

    getOwnerPid(): number {
        return this.ownerPid;
    }

    getEjectTick(): number {
        return this.ejectTick;
    }
    setEjectTick(ejectTick: number): void {
        this.ejectTick = ejectTick;
    }
    // decrementEjectTick(): void {
    //     this.ejectTick -= 1;
    // }

    // canEject(tps: number): boolean {
    //     if (this.ejectTick > 0) {
    //         this.ejectTick -= 1000/tps;
    //         return false;
    //     } else {
    //         this.ejectTick = this.settings.EJECT_DELAY;
    //         return true;
    //     }
    // }

    // getSplitParent(): PlayerCell {
    //     return this.splitParent;
    // }

    getAge(): number {
        return this.age;
    }
    setAge(age: number): void {
        this.age = age;
    }

    tick(tps: number): void {
        this.age += 1000/tps;
    }

    isSplitting(): boolean {
        return this.age < this.settings.SPLIT_RESOLVE_DELAY;
    }

    canMerge(): boolean {
        const initial = this.settings.MERGE_TIME;
        const increase = this.getBoundary().getArea() * this.settings.MERGE_TIME_SCALE;
        return this.age >= initial + increase;
    }

    override canEat(other: Cell): boolean {
        if (other.getEater() !== null) return false; // not sure why this is necessary but it is lol
        const d = this.getPosition().getDifference(other.getPosition()).getMagnitude();
        const overlapReq = d <= this.getRadius() - other.getRadius() * this.settings.WORLD_EAT_OVERLAP_REQ;
        if (other instanceof PlayerCell) {
            if (this.getMass() === other.getMass()) {
                return overlapReq && other.getEater() === null;//this.getId() < other.getId();
            } else {
                return overlapReq && this.getMass() > other.getMass();
            }
        } else {
            const sizeReq = this.getMass() > other.getMass() * 1.2;
            return sizeReq && overlapReq;
        }
    }
}