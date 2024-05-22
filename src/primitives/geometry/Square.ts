import { Vector2 } from './Vector2';
import { Rectangle } from './Rectangle';

export class Square extends Rectangle {
    constructor(center: Vector2, sideLength: number) {
        super(center, sideLength, sideLength);
    }
}