import { Circle } from '../../primitives/geometry/Circle';
import { Vector2 } from '../../primitives/geometry/Vector2';
import { WorldSettings } from '../../types/WorldSettings';

export abstract class Cell {
    static index: number = 0;
    private id: number;
    protected settings: WorldSettings;
    protected radius: number;
    private position: Vector2;
    private velocity: Vector2;
    private boost: Vector2;
    private eater: Cell;

    constructor(settings: WorldSettings, radius: number, position: Vector2, velocity: Vector2, boost: Vector2) {
        this.id = Cell.index;
        Cell.index++;
        this.settings = settings;
        this.radius = radius;
        this.position = position;
        this.velocity = velocity;
        this.boost = boost;
        this.eater = null;
    }

    getId(): number {
        return this.id;
    }

    getRadius(): number {
        return this.radius;
    }
    setRadius(radius: number): void {
        this.radius = radius;
    }

    getPosition(): Vector2 {
        return this.position;
    }
    setPosition(position: Vector2): void {
        this.position = position;
    }

    getVelocity(): Vector2 {
        return this.velocity;
    }
    setVelocity(velocity: Vector2): void {
        this.velocity = velocity;
    }

    getBoost(): Vector2 {
        return this.boost;
    }
    setBoost(boost: Vector2): void {
        this.boost = boost;
    }
    
    getBoundary(): Circle {
        return new Circle(this.position, this.radius);
    }

    getMass(): number {
        return this.getBoundary().getArea();
    }

    stepMotion(): void {
        this.position.add(this.velocity);
        this.position.add(this.boost);
        this.boost.multiply(this.settings.WORLD_FRICTION);
    }

    canEat(other: Cell): boolean {
        const sizeReq = this.getMass() > other.getMass() * 1.2;
        const d = this.getPosition().getDifference(other.getPosition()).getMagnitude();
        const overlapReq = d <= this.getRadius() - other.getRadius() * this.settings.WORLD_EAT_OVERLAP_REQ;
        return sizeReq && overlapReq;
    }

    getEater(): Cell {
        return this.eater;
    }
    setEater(eater: Cell): void {
        this.eater = eater;
    }

    toString(): string {
        // return `${this.constructor.name} [${this.id}] at (${Math.round(this.position.getX())}, ${Math.round(this.position.getY())}) with (${Math.round(this.getMass())}, ${Math.round(this.radius)})`;
        return `${this.constructor.name} at (${Math.round(this.position.getX())}, ${Math.round(this.position.getY())}) with (${Math.round(this.getMass())}, ${Math.round(this.radius)})`;
    }
}