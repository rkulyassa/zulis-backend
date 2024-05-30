export const enum ClientOpcodes {
    MOUSE_MOVE = 0,
    TOGGLE_FEED = 1,
    SPLIT = 2
    // ...
}

export const enum ServerOpcodes {
    LOAD_WORLD = 0,
    UPDATE_GAME_STATE = 1,
    PLAYER_UPDATE = 2,
}