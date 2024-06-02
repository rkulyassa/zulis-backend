export const enum WorldActions {
    CREATE_CELL = 0,
    DELETE_CELL = 1,
    UPDATE_CELL = 2,
    EAT = 3
}

export const enum CellTypes {
    PELLET,
    PLAYER_CELL,
    EJECTED_CELL,
    VIRUS,
    DEAD_CELL,
}