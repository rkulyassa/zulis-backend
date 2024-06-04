import { Rectangle } from './Rectangle';
import { Vector2 } from './Vector2';

export abstract class Shape {
    protected center: Vector2;

    constructor(center: Vector2) {
        this.center = center;
    }

    getCenter(): Vector2 {
        return this.center;
    }
    setCenter(center: Vector2): void {
        this.center = center;
    }

    abstract fitsWithin(boundary: Rectangle): boolean;
    abstract contains(point: Vector2): boolean;
}