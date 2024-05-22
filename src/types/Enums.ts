export const enum WorldActions {
    CREATE_CELL = 0,
    DELETE_CELL = 1,
    UPDATE_CELL = 2,
    EAT = 3
}

export const enum CellTypes {
    PELLET = 0,
    OWNED_CELL = 1,
    OTHER_CELL = 2,
    EJECTED_CELL = 3,
    VIRUS = 4,
    DEAD_CELL = 5,
}