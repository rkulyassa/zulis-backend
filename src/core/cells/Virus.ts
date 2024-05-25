import { Cell } from './Cell';
import { Vector2 } from '../../primitives/geometry/Vector2';
import { WorldSettings } from '../../types/WorldSettings';
import { Square } from '../../primitives/geometry/Square';

export class Virus extends Cell {
    constructor(settings: WorldSettings, radius: number, position: Vector2) {
        super(settings, radius, position, new Vector2(0), new Vector2(0));
    }

    override tick() {}

    override handleWallBounce(worldBoundary: Square): void {
        if (this.getBoundary().fitsWithin(worldBoundary)) return;

        const [x, y] = this.position.getAsArray();
        const size = worldBoundary.getWidth();

        if (x < 0) {
            this.position.setX(0);
            this.boost.flipX();
        }
        if (x > size) {
            this.position.setX(size);
            this.boost.flipX();
        }
        if (y < 0) {
            this.position.setY(0);
            this.boost.flipY();
        }
        if (y > size) {
            this.position.setY(size);
            this.boost.flipY();
        }
    }
}