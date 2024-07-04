export interface WorldSettings {
    // World
    WORLD_EAT_OVERLAP_REQ: number;
    WORLD_EAT_SIZE_REQ: number;
    WORLD_FRICTION: number;
    WORLD_SIZE: number;

    // Player
    BASE_SPEED: number;
    MAX_CELLS: number;
    MERGE_TIME: number;
    MERGE_TIME_SCALE: number;
    MIN_MASS_TO_EJECT: number;
    MIN_MASS_TO_SPLIT: number;
    SPAWN_MASS: number;
    SPEED_CAP: number;
    SPEED_EXPONENT: number;

    // Splits
    SPLIT_BOOST: number;
    SPLIT_RESOLVE_DELAY: number;

    // Ejected Cells
    EJECT_BOOST: number;
    EJECT_DELAY_TICKS: number;
    EJECT_DISPERSION: number;
    EJECT_LIFETIME: number;
    EJECT_MASS: number;
    EJECT_PUSH_MULTIPLIER: number;

    // Viruses & Pops
    POP_BOOST: number;
    // POP_DISTANCE: number;
    // PUSH_DISTANCE: number;
    VIRUS_COUNT: number;
    VIRUS_MASS: number;
    VIRUS_PUSH_BOOST: number;

    // Pellets
    PELLET_COUNT: number;
    PELLET_MASS: number;

    DEAD_CELL_LIFETIME: number;

    // Decay
    DECAY_RATE: number;
    DECAY_SCALE: number;
}