import { Vector2 } from '../../primitives/geometry/Vector2';
import { Circle } from '../../primitives/geometry/Circle';
import { Square } from '../../primitives/geometry/Square';
import { CellType } from '../../models/CellType.enum';

export abstract class Cell {
    private static index: number = 0;
    private readonly id: number;
    private radius: number;
    protected position: Vector2;
    private velocity: Vector2;
    protected boost: Vector2;
    private age: number = 0;
    private eater: Cell = null;

    constructor(radius: number, position: Vector2, velocity: Vector2, boost: Vector2) {
        this.id = Cell.index;
        Cell.index++;
        this.radius = radius;
        this.position = position;
        this.velocity = velocity;
        this.boost = boost;
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

    getAge(): number {
        return this.age;
    }
    setAge(age: number): void {
        this.age = age;
    }
    tick(tps: number): void {
        this.age += 1000/tps;
    }

    getEater(): Cell {
        return this.eater;
    }
    setEater(eater: Cell): void {
        this.eater = eater;
    }
    
    getBoundary(): Circle {
        return new Circle(this.position, this.radius);
    }

    getMass(): number {
        return this.getBoundary().getArea();
    }

    abstract getTypeEnum(): CellType;

    stepMotion(worldFriction: number): void {
        this.position.add(this.velocity);
        this.position.add(this.boost);
        this.boost.multiply(worldFriction);
    }

    handleWallBounce(worldBoundary: Square): void {
        if (this.getBoundary().fitsWithin(worldBoundary)) return;

        const [x, y] = this.position.toArray();
        const size = worldBoundary.getWidth();

        if (x < 0) {
            this.position.setX(0);
        }
        if (x > size) {
            this.position.setX(size);
        }
        if (y < 0) {
            this.position.setY(0);
        }
        if (y > size) {
            this.position.setY(size);
        }
    }

    /**
     * Was used for debugging long ago, not really necessary anymore
     * @todo remove?
     */
    toString(): string {
        // return `${this.constructor.name} [${this.id}] at (${Math.round(this.position.getX())}, ${Math.round(this.position.getY())}) with (${Math.round(this.getMass())}, ${Math.round(this.radius)})`;
        return `${this.constructor.name} at (${Math.round(this.position.getX())}, ${Math.round(this.position.getY())}) with (${Math.round(this.getMass())}, ${Math.round(this.radius)})`;
    }
}