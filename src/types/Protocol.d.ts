export const enum ClientOpcodes {
    SPAWN = 0,
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
    type SPAWN = null;
    type SPECTATE = [spectateLock: boolean, cellId: number|null];
    type MOUSE_MOVE = [dx: number, dy: number];
    type TOGGLE_FEED = boolean;
    type SPLIT = number;
    type STOP_MOVEMENT = boolean;
    type FREEZE_MOUSE = [dx: number, dy: number];
    type LOCK_LINESPLIT = 0|1|2|3;
    type SAVE_REPLAY = null;
}

export const enum ServerOpcodes {
    LOAD_WORLD = 0,
    UPDATE_GAME_STATE = 1,
    STATS_UPDATE = 2,
    PLAYER_UPDATE = 3,
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
    type STATS_UPDATE = [
        ping: number,
        totalMass: number|null,
        cellCount: number|null,
    ]
}

export type CellData = [
    cellId: number,
    ownerPid: number,
    cellType: 0|1|2|3|4|5,
    x: number,
    y: number,
    radius: number,
];