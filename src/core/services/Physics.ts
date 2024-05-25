import { Cell } from "../cells/Cell";
import { EjectedCell } from "../cells/EjectedCell";
import { Virus } from "../cells/Virus";
import { Vector2 } from "../../primitives/geometry/Vector2";

/**
 * Separates two {@link Cell}s by moving them along their difference normal.
 * @param a - First {@link Cell}
 * @param b - Second {@link Cell}
 */
export function resolveCollision(a: Cell, b: Cell): void {
    const d = b.getPosition().getDifference(a.getPosition());
    const n = d.getNormal();
    const r = a.getRadius() + b.getRadius();
    const am = a.getMass();
    const bm = b.getMass();
    const m = am + bm;
    
    const overlap = (r - d.getMagnitude())/2;
    const aM = n.getMultiple(overlap * bm/m);
    const bM = n.getMultiple(overlap * am/m);

    a.getPosition().subtract(aM);
    b.getPosition().add(bM);
}

/**
 * Gets the center of mass of the specified {@link Cell}s.
 * 
 * @param cells - The {@link Cell}s to calculate the center of mass of.
 * @returns The center of mass as a {@link Vector2} position.
 */
export function getCellsCenterOfMass(cells: Array<Cell>): Vector2 {
    const center = new Vector2(0);
    let M = 0;
    for (const cell of cells) {
        const m = cell.getMass();
        center.add(cell.getPosition().getMultiple(m));
        M += m;
    }
    center.multiply(1/M);
    return center;
}