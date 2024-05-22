import { Shape } from './Shape';
import { Vector2 } from './Vector2';

export class Rectangle extends Shape {
    private width: number;
    private height: number;

    constructor(center: Vector2, width: number, height: number) {
        super(center);
        this.width = width;
        this.height = height;
    }

    getWidth(): number {
        return this.width;
    }
    setWidth(width: number): void {
        this.width = width;
    }
    
    getHeight(): number {
        return this.height;
    }
    setHeight(height: number): void {
        this.height = height;
    }

    getArea(): number {
        return this.width * this.height;
    }

    contains(point: Vector2): boolean {
        return point.getX() >= this.center.getX() - this.width / 2 &&
               point.getX() <= this.center.getX() + this.width / 2 &&
               point.getY() >= this.center.getY() - this.height / 2 &&
               point.getY() <= this.center.getY() + this.height / 2;
    }

    fitsWithin(boundary: Rectangle): boolean {
        return boundary.getCenter().getX() - boundary.getWidth()/2 <= this.center.getX() - this.width &&
               boundary.getCenter().getX() + boundary.getWidth()/2 >= this.center.getX() + this.width &&
               boundary.getCenter().getY() - boundary.getHeight()/2 <= this.center.getY() - this.height &&
               boundary.getCenter().getY() + boundary.getHeight()/2 >= this.center.getY() + this.height;
    }
}