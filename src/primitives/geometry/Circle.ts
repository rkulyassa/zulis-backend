import { Shape } from './Shape';
import { Rectangle } from './Rectangle';
import { Vector2 } from './Vector2';

export class Circle extends Shape {
    private radius: number;

    constructor(center: Vector2, radius: number) {
        super(center);
        this.radius = radius;
    }

    getRadius(): number {
        return this.radius;
    }

    getArea(): number {
        return Math.PI * this.radius * this.radius;
    }

    contains(point: Vector2): boolean {
        return point.getX() >= this.center.getX() - this.radius &&
               point.getX() <= this.center.getX() + this.radius &&
               point.getY() >= this.center.getY() - this.radius &&
               point.getY() <= this.center.getY() + this.radius;
    }

    fitsWithin(boundary: Rectangle): boolean {
        return boundary.getCenter().getX() - boundary.getWidth()/2 < this.center.getX() - this.radius &&
               boundary.getCenter().getX() + boundary.getWidth()/2 > this.center.getX() + this.radius &&
               boundary.getCenter().getY() - boundary.getHeight()/2 < this.center.getY() - this.radius &&
               boundary.getCenter().getY() + boundary.getHeight()/2 > this.center.getY() + this.radius;
    }
}