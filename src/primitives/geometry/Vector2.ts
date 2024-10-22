export class Vector2 {
    private x: number;
    private y: number;

    constructor(x: number, y?: number) {
        if (y === undefined) {
            this.x = x;
            this.y = x;
        } else {
            this.x = x;
            this.y = y;
        }
    }

    getX(): number {
        // if (Number.isNaN(this.x)) throw new Error();
        return this.x;
    }
    setX(x: number): void {
        this.x = x;
    }
    flipX(): void {
        this.x = -this.x;
    }

    getY(): number {
        // if (Number.isNaN(this.y)) throw new Error();
        return this.y;
    }
    setY(y: number): void {
        this.y = y;
    }
    flipY(): void {
        this.y = -this.y;
    }

    set(x: number, y: number): void {
        this.x = x;
        this.y = y;
    }

    add(other: Vector2): void {
        this.x += other.x;
        this.y += other.y;
    }

    getSum(other: Vector2): Vector2 {
        return new Vector2(this.x + other.x, this.y + other.y);
    }

    subtract(other: Vector2): void {
        this.x -= other.x;
        this.y -= other.y;
    }

    getDifference(other: Vector2): Vector2 {
        return new Vector2(this.x - other.x, this.y - other.y);
    }

    multiply(scalar: number): void {
        this.x *= scalar;
        this.y *= scalar;
    }

    getMultiple(scalar: number): Vector2 {
        if (Number.isNaN(this.x)) throw new Error();
        return new Vector2(this.x * scalar, this.y * scalar);
    }

    getProduct(other: Vector2): Vector2 {
        return new Vector2(this.x * other.x, this.y * other.y);
    }

    getDotProduct(other: Vector2): number {
        return this.x * other.x + this.y * other.y;
    }

    getMagnitude(): number {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }

    roundToZeroCheck(threshold: number = 1e-1): void {
        if (Math.abs(this.x) < threshold) {
            this.x = 0;
        }
        if (Math.abs(this.y) < threshold) {
            this.y = 0;
        }
    }

    getNormal(): Vector2 {
        const magnitude = this.getMagnitude();
        if (magnitude == 0) {
            throw new Error('Cannot normalize a zero vector.');
            // return new Vector2(0, 0);
        }
        return new Vector2(this.x/magnitude, this.y/magnitude);
    }

    getRotated(theta: number): Vector2 {
        return new Vector2(
            this.x * Math.cos(theta) - this.y * Math.sin(theta),
            this.x * Math.sin(theta) + this.y * Math.cos(theta)
        );
    }

    static fromAngle(angle: number): Vector2 {
        return new Vector2(Math.cos(angle), Math.sin(angle));
    }

    toArray(): [number, number] {
        return [this.x, this.y];
    }

    toString(): string {
        return JSON.stringify({x: this.x, y: this.y});
    }

    clone(): Vector2 {
        return new Vector2(this.x, this.y);
    }

}