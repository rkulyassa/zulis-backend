import { WorldSettings } from "./WorldSettings";

export interface GameServer {
    port: number;
    name: string;
    tps: number;
    settings: WorldSettings;
}