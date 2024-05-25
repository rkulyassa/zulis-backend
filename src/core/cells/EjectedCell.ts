import { Cell } from './Cell';
import { PlayerCell } from './PlayerCell';
import { Vector2 } from '../../primitives/geometry/Vector2';
import { areIntersecting } from '../../primitives/geometry/Utils';
import { WorldSettings } from '../../types/WorldSettings';
import { Square } from '../../primitives/geometry/Square';

export class EjectedCell extends Cell {
    private ejectParent: PlayerCell;
    private exitedParent: boolean;

    constructor(settings: WorldSettings, radius: number, position: Vector2, boost: Vector2, ejectParent: PlayerCell) {
        super(settings, radius, position, new Vector2(0), boost);
        this.ejectParent = ejectParent;
        this.exitedParent = false;
    }

    getEjectParent(): PlayerCell {
        return this.ejectParent;
    }
    setExitedParent(exitedParent: boolean): void {
        this.exitedParent = exitedParent;
    }
    checkIfExitedParent(): void {
        if (!this.exitedParent) {
            this.exitedParent = !areIntersecting(this.getBoundary(), this.ejectParent.getBoundary());
        }
    }
    hasExitedParent(): boolean {
        return this.exitedParent;
    }

    override handleWallBounce(worldBoundary: Square): void {
        if (this.getBoundary().fitsWithin(worldBoundary)) return;

        const [x, y] = this.position.getAsArray();
        const size = worldBoundary.getWidth();

        this.exitedParent = true;

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