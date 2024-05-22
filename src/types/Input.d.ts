import { Vector2 } from "../primitives/geometry/Vector2";

export interface Input {
    playing: boolean; // TBI: spectate mode
    mouseVector: Vector2;
    isEjecting: boolean;
    toSplit: number;
}