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
        return this.x;
    }
    setX(x: number): void {
        this.x = x;
    }
    flipX(): void {
        this.x = -this.x;
    }

    getY(): number {
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

    getAsArray(): Array<number> {
        return [this.x, this.y];
    }

    static fromAngle(angle: number): Vector2 {
        return new Vector2(Math.cos(angle), Math.sin(angle));
    }

    // static getMidpoint(v1: Vector2, v2: Vector2): Vector2 {
    //     const x = (v1.x + v2.x) / 2;
    //     const y = (v1.y + v2.y) / 2;
    //     return new Vector2(x, y);
    // }

    toString(): string {
        return JSON.stringify({x: this.x, y: this.y});
    }

    clone(): Vector2 {
        return new Vector2(this.x, this.y);
    }

}