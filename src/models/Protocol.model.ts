import { CellType } from "./CellType.enum";

export const enum ClientOpcodes {
    PLAYER_UPDATE = 0,
    SPECTATE = 1,
    MOUSE_MOVE = 2,
    TOGGLE_FEED = 3,
    SPLIT = 4,
    STOP_MOVEMENT = 5,
    FREEZE_MOUSE = 6,
    LOCK_LINESPLIT = 7,
    SAVE_REPLAY = 8,
}

export namespace ClientData {
    export type PLAYER_UPDATE = [nick: string, skinId: string, teamTag: string];
    export type SPECTATE = [spectateLock: boolean, cellId: number|null];
    export type MOUSE_MOVE = [dx: number, dy: number];
    export type TOGGLE_FEED = boolean;
    export type SPLIT = number;
    export type STOP_MOVEMENT = boolean;
    export type FREEZE_MOUSE = [dx: number, dy: number];
    export type LOCK_LINESPLIT = 0|1|2|3;
    export type SAVE_REPLAY = null;
}

export const enum ServerOpcodes {
    LOAD_WORLD = 0,
    UPDATE_GAME_STATE = 1,
    PLAYER_UPDATE = 2,
}

export namespace ServerData {
    type LOAD_WORLD = number;
    type UPDATE_GAME_STATE = [
        viewportX: number,
        viewportY: number,
        cells: Array<CellData>,
    ];
    type PLAYER_UPDATE = [
        pid: number,
        nick: string,
        skinId: string|null,
        inTag: boolean,
    ];
}

// export type ServerData = ServerData.LOAD_WORLD | ServerData.UPDATE_GAME_STATE | ServerData.PLAYER_UPDATE;

export type CellData = [
    cellId: number,
    ownerPid: number|null,
    x: number,
    y: number,
    radius: number,
];