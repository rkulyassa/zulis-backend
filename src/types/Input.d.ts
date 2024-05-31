import { Vector2 } from "../primitives/geometry/Vector2";

export interface Input {
    mouseVector: Vector2;
    isEjecting: boolean;
    toSplit: number;
}