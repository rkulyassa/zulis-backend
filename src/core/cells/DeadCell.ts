import { Cell } from './Cell';
import { Vector2 } from '../../primitives/geometry/Vector2';
import { WorldSettings } from '../../types/WorldSettings';

export class DeadCell extends Cell {
    private age;

    constructor(settings: WorldSettings, radius: number, position: Vector2, boost: Vector2) {
        super(settings, radius, position, new Vector2(0,0), boost);
        this.age = 0;
    }

    getAge(): number {
        return this.age;
    }
    setAge(age: number): void {
        this.age = age;
    }

    tick(tps: number): void {
        this.age += 1000/tps;
    }
}